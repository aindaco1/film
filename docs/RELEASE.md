# Release Checklist

This is the repeatable release process, not a deployment history. [Project Status](PROJECT_STATUS.md) identifies the current release and remaining gates; [release evidence](release-evidence/README.md) records exact tested commits, artifacts, deployments and provider acceptance.

## 1. Establish The Candidate

- Review the worktree and intended diff. Preserve unrelated work; identify the exact application/configuration source commit.
- Update the [flow catalog](../scripts/user-flow-catalog.mjs) and current contracts when behavior changes.
- Review privacy, migrations, backwards compatibility, provider modes and rollback implications.
- Do not turn a disabled provider live merely to obtain a green readiness result.
- Keep actual production resource mappings empty until verified resources exist.

## 2. Validate Source And Configuration

Run the baseline and relevant focused gates from [Testing](TESTING.md), including the fresh-D1 suite. Package both Workers with Wrangler dry runs. Validate generated binding types after Worker configuration changes.

Run `npm run check:deploy:strict -- --wrangler-secrets` in the operator environment. Record intentionally disabled integrations and their named blockers. The strict check verifies configured live paths, not public provider approval.

`npm run check:sms:preflight` deliberately requires both SMS gates disabled and is only for a new/unapproved installation. It is not the post-approval check for an already live SMS deployment.

Require successful [CI](../.github/workflows/ci.yml) for the exact source commit, including fresh-D1 browser workflows and artifact upload. Canceled, stalled or failed attempts are not acceptance. Prefer the tested CI artifact over a separately rebuilt bundle; compare hashes when using a local build.

## 3. Deploy Deliberately

- Record current API and static Worker version IDs as rollback targets.
- Apply any new migrations using [Deployment](DEPLOYMENT.md) only after compatibility and recovery review.
- Deploy the intended API and/or static Worker. Record which one changed.
- Verify public health and HTML responses, then compare public non-HTML asset hashes with the tested build.
- Run the isolated public browser gate from [Testing](TESTING.md); its API fixtures do not establish account or delivery acceptance.
- Run protected owner/provider checks only with approved scope and recipients. The owner-login send flag permits an email, not an SMS.
- Preserve existing keys, connection ciphertext, recipient consent and provider modes unless the release explicitly changes them.

For an approved live-SMS deployment, the owner probe can use `--check-runtime-readiness --expected-sms-mode live --check-telnyx-readiness`. An actual SMS requires the separate owned-recipient procedure in [Operations](OPERATIONS.md).

## 4. Publish And Record

- Create the version tag on the tested application commit, not a later evidence-only change.
- Publish release notes with the successful CI URL, exact commit, artifact checksum, limitations and rollback reference.
- Label a controlled beta as a prerelease; do not equate a published artifact with public Meta/Google approval.
- Verify the GitHub release and downloadable artifact independently after publication.
- Add bounded evidence using the [redaction policy](release-evidence/README.md), then update [Project Status](PROJECT_STATUS.md).
- Keep detailed command contracts in Testing/Deployment/Operations rather than copying them into release notes.

## Rollback

Restore the affected Worker's recorded previous version if public health, assets or application behavior fails. A Worker rollback does not roll back D1 data, external sends, token/key rotation or provider consent. Follow the applicable [recovery procedure](OPERATIONS.md) before making data changes.

Disable an affected live provider immediately if authorization, signatures, mapping, consent or delivery evidence fails. Do not delete encrypted connections or rotate encryption keys as a substitute for diagnosis.

Never publish secrets, raw OAuth or auth output, private exports, backup bundles or sensitive screenshots. Do not delete release tags or published artifacts during routine repository cleanup.
