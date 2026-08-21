# ADR 0013: Notion Import Applies Local Records

Date: 2026-07-07

## Status

Accepted

## Decision

The Notion importer applies Markdown and CSV content, plus attachment metadata, to the local Film workspace after the Worker metadata preflight succeeds.

## Context

The product needs a real Notion importer, not a standalone preview feature. Exported Notion folders commonly include Markdown pages, CSV database exports for projects, tasks, docs, people, equipment, and expenses, and asset attachments referenced from those pages.

## Consequences

- The app imports extracted Notion export folders through `Import folder` and Notion ZIP archives through `Import ZIP`.
- `Projects.csv` creates Film projects before other CSVs are mapped, so related tasks/docs/people/equipment/expenses attach to the imported project.
- Relation-list cells such as `Related Project`, `Related Projects`, `Projects`, `Related Show`, and `Show` are split on common Notion export separators and matched against any imported/current project title, not only the first relation value.
- Markdown pages are preserved as native Film document records with a local markdown snapshot.
- Attachments are preserved as Film document metadata records with source path, size, and content type. Binary bytes are handled outside the workspace record model.
- The import queues an `import.notion_applied` operation for future Worker replay.
