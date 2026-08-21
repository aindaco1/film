# ADR 0192: Local Attachment Content Validation

Date: 2026-07-09

## Status

Accepted

## Decision

Validate imported Notion attachment bytes before they enter Film's IndexedDB staging store or R2 preparation workflow.

For each metadata-only asset selected by the bounded import plan, the browser requires:

- an allowlisted extension with a canonical content type;
- a non-empty blob no larger than 25 MiB;
- exact agreement between blob size, import manifest size, and document source size;
- agreement between canonical type and any non-empty/non-generic types reported by the source file, document metadata, and blob;
- a recognized signature for PNG, JPEG, GIF, PDF, WebP, WAV, AIFF, TIFF, OOXML, legacy OLE Office, MP3, ISO media containers, and HEIC;
- valid UTF-8/JSON syntax for JSON assets; and
- a root SVG with no script, event-handler, external-reference, active embedded-object, JavaScript URL, doctype, or entity patterns.

Only validated bytes are hashed and persisted. Canonical content type is written back to document metadata only after persistence succeeds. Validation failures are counted and warned without exposing raw source paths; the document remains metadata-only and is not prepared for upload. Existing non-metadata-only attachments are not restaged by a later import.

## Context

The importer already allowlisted attachment extensions, but extracted-folder MIME values came from the browser and staging trusted declared size/type. A renamed HTML file or corrupted media file could therefore enter the local blob store and later be prepared for R2 even though Worker upload hashing proved only byte identity, not file-format agreement.

## Consequences

- Common renamed, truncated, malformed, and active-vector files fail before local persistence.
- R2 upload metadata uses a canonical type derived from the validated extension.
- Unsupported or rejected bytes remain visible as metadata-only documents so imports remain reviewable.
- This is deterministic format validation, not antivirus or malware scanning; higher-assurance scanning remains a separate production decision.
