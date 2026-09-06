# Architecture Decisions

Current contracts have one owner. [Project Status](../PROJECT_STATUS.md) owns current delivery and next steps. This index replaces 250 incremental ADR files, many of which described temporary dry-run stages later superseded by implemented transactions or live acceptance.

| Decision | Current authority |
| --- | --- |
| Static-first stack and local/private production graph | [Architecture](../ARCHITECTURE.md) |
| Product scope, deterministic logic and optional assistance | [Product Goals](../PRODUCT_GOALS.md) |
| One canonical UI owner and contextual editing | [UI Surface Ownership](../UI_SURFACE_OWNERSHIP.md) |
| Sessions, scoped writes, atomic audit and stale checks | [Security](../SECURITY.md) |
| Import, encryption, proof-bound recovery and attachment safety | [Security](../SECURITY.md) |
| Provider scopes and public review posture | [Provider Review](../provider-review-preparation.md) and [Google evaluation](../google-selected-file-evaluation.md) |
| Regression and build budgets | [Testing](../TESTING.md) |
| Configuration, operation and release process | [Deployment](../DEPLOYMENT.md), [Operations](../OPERATIONS.md), [Release](../RELEASE.md) |

## Historical Rationale

All original ADR bodies are preserved verbatim in five chronological collections. An old `Accepted` status means the decision was accepted at that stage; it does not override the current contracts above. Both distinct records numbered 0226 are preserved under their full original filenames.

- [0001-0049](../archive/decisions/decisions-0001-0049.md)
- [0050-0099](../archive/decisions/decisions-0050-0099.md)
- [0100-0149](../archive/decisions/decisions-0100-0149.md)
- [0150-0199](../archive/decisions/decisions-0150-0199.md)
- [0200-0249](../archive/decisions/decisions-0200-0249.md)

The original paths are also available in [the beta source tag](https://github.com/aindaco1/film/tree/v0.1.0-beta.1/docs/adr). No Git history or release tag was rewritten.

For future work, update the relevant current contract. Add a new ADR only for a consequential decision with alternatives and tradeoffs, not every implementation slice. Link its replacement explicitly if superseded.
