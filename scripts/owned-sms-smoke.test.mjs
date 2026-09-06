import assert from "node:assert/strict";
import test from "node:test";
import { ownedSmsSmokeConfiguration, runOwnedSmsSmoke } from "./owned-sms-smoke.mjs";

const configuration = { recipient: "+15555550100", requestKey: "owned_sms_fixture_0001" };
const recipientId = `sms_recipient_${"a".repeat(32)}`;
const ready = {
  secretValuesExposed: false, status: "ready_for_owned_number_smoke",
  number: { campaignAssigned: true }, activationGates: { webhookLive: true, sendLive: true },
};
function fixture(overrides = {}) {
  let tick = 0;
  const calls = [];
  const reports = [];
  const bodies = {
    "/api/providers/sms/provider-readiness": { readiness: ready },
    "/api/providers/sms/consent/commit": { recipient: { id: recipientId, status: "active" } },
    "/api/providers/sms/consent/revoke": { recipient: { id: recipientId, status: "revoked" } },
    "/api/providers/sms/consent/manifest": { recipients: [{ id: recipientId, status: "revoked" }] },
    ...overrides,
  };
  return { calls, reports, options: {
    configuration, workspaceId: "workspace_acme", snapshot: { projects: [{ id: "project_big_sword" }] },
    now: () => tick, wait: async (ms) => { tick += ms; },
    report: (value) => reports.push(value), readinessTimeoutMs: 15_000, stopTimeoutMs: 20_000,
    post: async (endpoint, body, statuses) => {
      calls.push({ endpoint, body, statuses });
      if (endpoint === "/api/providers/sms/send") return { body: body.requestKey.endsWith("_after_stop")
        ? { error: "sms_recipient_not_consented" }
        : { provider: { status: "sent", queuedCount: 1, replayedCount: 0 } } };
      if (bodies[endpoint] instanceof Error) throw bodies[endpoint];
      return { body: bodies[endpoint] };
    },
  } };
}

test("owned SMS config requires an approved recipient and stable request key without reflecting either", () => {
  assert.deepEqual(ownedSmsSmokeConfiguration(new Map([
    ["FILM_SMS_SMOKE_RECIPIENT", configuration.recipient], ["FILM_SMS_SMOKE_REQUEST_KEY", configuration.requestKey],
  ])), configuration);
  assert.throws(() => ownedSmsSmokeConfiguration(new Map()), /explicitly approved/);
});

test("owned SMS test uses one temporary operational consent and proves a new request is blocked after revocation", async () => {
  const { options, calls, reports } = fixture();
  assert.deepEqual(await runOwnedSmsSmoke(options), { providerAccepted: true, revocationObserved: true, postRevocationBlocked: true });
  const sends = calls.filter((call) => call.endpoint.endsWith("/send"));
  assert.equal(sends.length, 2);
  assert.deepEqual(sends[1].statuses, [409]);
  assert.deepEqual(sends[0].body.recipientIds, [recipientId]);
  assert.equal(sends[0].body.emergencyOverride, false);
  const consent = calls.find((call) => call.endpoint.endsWith("/commit"));
  assert.equal(consent.body.source, "operator");
  assert.equal(consent.body.disclosureVersion, "owned-number-single-test-v1");
  assert.deepEqual(consent.body.categories, ["call_sheet"]);
  assert.equal(reports.join(" ").includes(configuration.recipient), false);
  assert.equal(calls.some((call) => call.endpoint.endsWith("/revoke")), false);
});

test("pending number provisioning cannot enroll or send even with a live send gate", async () => {
  const { options, calls } = fixture({ "/api/providers/sms/provider-readiness": { readiness: { ...ready, status: "pending_number_assignment" } } });
  await assert.rejects(runOwnedSmsSmoke(options), /no SMS was sent/);
  assert(calls.every((call) => call.endpoint.endsWith("provider-readiness")));
});

test("missing STOP revokes the temporary test consent at the end of the bounded window", async () => {
  const { options, calls } = fixture({ "/api/providers/sms/consent/manifest": { recipients: [{ id: recipientId, status: "active" }] } });
  await assert.rejects(runOwnedSmsSmoke(options), /STOP was not observed/);
  assert.equal(calls.filter((call) => call.endpoint.endsWith("/send")).length, 1);
  assert.equal(calls.at(-1).endpoint, "/api/providers/sms/consent/revoke");
});

test("an uncertain send is not retried and temporary consent is still revoked", async () => {
  const { options, calls } = fixture();
  const post = options.post;
  options.post = async (endpoint, ...args) => {
    if (endpoint.endsWith("/send")) throw new Error("transport unavailable");
    return post(endpoint, ...args);
  };
  await assert.rejects(runOwnedSmsSmoke(options), /transport unavailable/);
  assert.equal(calls.at(-1).endpoint, "/api/providers/sms/consent/revoke");
});
