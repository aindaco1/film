# ADR 0047: Planning Restore Preview

Date: 2026-07-08

## Status

Accepted

## Decision

Show D1 planning rows from encrypted backups in restore previews as counted, grouped, per-table covered, field-key sampled, warning-only records. ADR 0082 later adds the destructive planning restore commit path.

## Context

Planning rows can now be imported into D1 and exported into encrypted ZIP backups. The existing restore preview compares the browser workspace model, which does not yet contain first-class planning tables. Treating planning rows as normal restored browser records would misrepresent the current restore capability.

## Consequences

- Restore previews now expose `planningRecordCount`, `planningTruncated`, per-kind `planningKindCounts`, per-table `planningTableCoverage`, and a bounded `planningRecords` sample with kind, title, project ID, source path, field count, and up to five field keys.
- `incomingRecordCount` includes planning rows so restore gates see the full backup size.
- The preview warns that planning restore requires the gated Worker planning commit path.
- The UI shows a separate planning-row line, per-kind planning coverage, per-table D1 coverage, and a small planning record sample with bounded field names in the restore preview panel.
- ADR 0074 adds per-table planning diffing, and ADR 0082 adds D1 planning commit handling.
