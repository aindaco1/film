# Platform 0.44 migration — October 21, 2026

Target: current source. Platform commit: `57cc033e248f92835c4c5ee29c823cadbb5050a2`.
Exact changed package versions: Node Core 0.1.0, Admin Shell 0.14.0,
Site Shell 0.4.0 and Test Core 0.4.0 where consumed. The automated consumer
contract records the complete package map; native dependency lockfiles stay pinned.

## Scope

Managed subprocess spawn/completion/teardown. The consumer keeps inherited output and supervisor-signal behavior. A TERM-resistant descendant is now terminated after its parent exits. Update the vulnerable Vitest and transitive development-tool dependencies; the current audit is clean.

Product models, routes, storage, provider credentials, SDK URLs, content and
publication authority stay in this repository. No checkout or subscriber
operation is required to validate this migration.

## Evidence

Seven process cases, all script/workspace tests, production builds and web typecheck passed. The repeated full suite after dependency maintenance and audit passed. Hosted browser/Worker gates remain required.

Independent pre-migration source rollback was rehearsed at consumer
`105de1b719b0640008e2717496d1bebc4ac68e84`, retaining its original Platform pin `9338fb7cb58b779c4d02ab841e77920c52299f9d`.
Source rollback means reverting the complete migration (adapters, bundle entries,
package contracts and gitlink together), never changing the gitlink alone.
An app rollback must install the preceding verified signed release; deployed
services retain their own previous artifact and deployment rollback procedure.
A source rehearsal is not a claim that production was rolled back.

CI and publication evidence belongs to this consumer pull request and final
release record. Do not equate a local build or a green source check with a
published app or production deployment.
