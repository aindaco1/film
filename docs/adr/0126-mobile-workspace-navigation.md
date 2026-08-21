# ADR 0126: Mobile Workspace Navigation

Date: 2026-07-08

## Status

Accepted

## Decision

Render a compact horizontal workspace navigation rail below the topbar on mobile viewports.

The mobile rail uses the same workspace section list, `data-workspace-section` buttons, active state, and render path as the desktop sidebar navigation.

## Context

The desktop sidebar exposes Slate, Projects, Tasks, Docs, People, Equipment, Expenses, Planning, and Backups. On narrow screens the full sidebar and project nav collapse to preserve usable content width. Once dedicated workspace sections were added, hiding the full sidebar also hid the only way to reach those sections from a fresh mobile session.

## Consequences

- Mobile users can reach every workspace destination without relying on persisted state.
- Section event binding remains shared with desktop navigation.
- The rail is horizontally scrollable, so it does not force the dense operational workspace into a narrower content column.
