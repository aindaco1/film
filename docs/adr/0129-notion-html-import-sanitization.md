# ADR 0129: Notion HTML Import Sanitization

Date: 2026-07-08

## Status

Accepted

## Decision

Do not import Notion `.html` export contents into Film records.

The browser import helper only reads Markdown and CSV text content. Recognized binary assets are represented as metadata plus a deferred `readBlob` callback. HTML files are neither parsed as documents nor treated as attachment blobs.

## Context

Notion exports can include HTML pages with executable markup, inline scripts, external references, or styling that does not map cleanly to Film's static-first data model. Film's MVP importer needs Markdown, CSV databases, and metadata-only attachments, not a browser-rendered HTML ingestion surface.

## Consequences

- HTML export files are ignored instead of becoming document bodies.
- Binary attachments are not read as text during import preflight.
- Future rich-content import must define a sanitizer and target data model before accepting HTML.
