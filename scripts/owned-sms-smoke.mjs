import assert from "node:assert/strict";

export function ownedSmsSmokeConfiguration(values) {
  const recipient = values.get("FILM_SMS_SMOKE_RECIPIENT") ?? "";
  const requestKey = values.get("FILM_SMS_SMOKE_REQUEST_KEY") ?? "";
  assert(/^\+[1-9][0-9]{7,14}$/.test(recipient), "Owned SMS smoke needs an explicitly approved E.164 recipient");
  assert(/^[A-Za-z0-9_-]{16,80}$/.test(requestKey), "Owned SMS smoke needs a stable request key for safe retries");
  return { recipient, requestKey };
}

// Uses the existing owner auth probe's request/session boundary. Never accepts a provider key.
export async function runOwnedSmsSmoke({ post, configuration, workspaceId, snapshot,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now, report = console.log, readinessTimeoutMs = 15 * 60_000, stopTimeoutMs = 5 * 60_000,
}) {
  const projectId = "project_big_sword";
  assert(snapshot.projects.some((project) => project.id === projectId), "Owned SMS smoke needs the canonical Big Sword project");
  const deadline = now() + readinessTimeoutMs;
  let lastStatus = "";
  while (true) {
    const { body } = await post("/api/providers/sms/provider-readiness", { workspaceId }, [200]);
    const ready = body.readiness;
    assert.equal(ready?.secretValuesExposed, false, "Readiness must be redacted");
    const status = `${ready.status}:${ready.activationGates?.sendLive === true ? "send_live" : "send_disabled"}`;
    if (status !== lastStatus) {
      report(`Owned SMS smoke readiness: ${/^[a-z_:]{1,100}$/.test(status) ? status : "unknown"}`);
      lastStatus = status;
    }
    if (ready.status === "ready_for_owned_number_smoke" && ready.number?.campaignAssigned === true
      && ready.activationGates?.webhookLive === true && ready.activationGates?.sendLive === true) break;
    assert(now() < deadline, "Telnyx provisioning/live gates did not become ready; no SMS was sent");
    await wait(15_000);
  }

  let recipientId;
  let revoked = false;
  try {
    const consent = await post("/api/providers/sms/consent/commit", {
      workspaceId, recipientE164: configuration.recipient, source: "operator",
      evidenceId: `owned-number-test:${configuration.requestKey}`,
      disclosureVersion: "owned-number-single-test-v1", categories: ["call_sheet"],
    }, [200]);
    recipientId = consent.body.recipient?.id;
    assert(/^sms_recipient_[a-f0-9]{32}$/.test(recipientId ?? ""), "Consent did not return an opaque recipient");
    assert.equal(consent.body.recipient.status, "active", "Test consent is already revoked; this request must not resend");
    const sendBody = {
      workspaceId, projectId, recipientIds: [recipientId], category: "call_sheet",
      messageBody: "SMS integration test for Big Sword. Please reply STOP to verify opt-out, or HELP for help. Msg & data rates may apply.",
      requestKey: configuration.requestKey, emergencyOverride: false, emergencyReasonCode: null,
    };
    // Do not automatically retry a send after an uncertain transport result.
    const sent = await post("/api/providers/sms/send", sendBody, [200]);
    assert(["sent", "replayed"].includes(sent.body.provider?.status), "Owned test was not accepted by the provider");
    report(`Owned SMS smoke: ${sent.body.provider.queuedCount} queued, ${sent.body.provider.replayedCount} replayed; awaiting the user's STOP reply.`);
    const stopDeadline = now() + stopTimeoutMs;
    while (now() < stopDeadline) {
      const manifest = await post("/api/providers/sms/consent/manifest", { workspaceId, limit: 100 }, [200]);
      const recipient = manifest.body.recipients?.find((row) => row.id === recipientId);
      if (recipient?.status === "revoked") {
        revoked = true;
        const blocked = await post("/api/providers/sms/send", {
          ...sendBody, requestKey: `${configuration.requestKey}_after_stop`,
        }, [409]);
        assert.equal(blocked.body.error, "sms_recipient_not_consented", "Post-opt-out send was not blocked by consent");
        report("Owned SMS smoke: revocation observed and a new send request was blocked before the provider.");
        return { providerAccepted: true, revocationObserved: true, postRevocationBlocked: true };
      }
      await wait(10_000);
    }
    throw new Error("STOP was not observed within the test window; temporary consent is being revoked");
  } finally {
    if (recipientId && !revoked) {
      const cleanup = await post("/api/providers/sms/consent/revoke", {
        workspaceId, recipientId, evidenceId: `owned-number-test-cleanup:${configuration.requestKey}`,
      }, [200]);
      assert.equal(cleanup.body.recipient?.status, "revoked", "Temporary test consent cleanup failed");
      report("Owned SMS smoke: temporary consent revoked; no recurring enrollment remains.");
    }
  }
}
