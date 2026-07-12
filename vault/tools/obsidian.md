---
type: Tool
title: "Obsidian"
description: "The markdown-based note-taking app whose interaction model inspired the second-brain pattern."
tags: [obsidian, app, markdown]
timestamp: 2026-06-01T00:00:00Z
---

# Obsidian

Obsidian popularized the personal-wiki-of-markdown-files workflow: a local
folder ("vault") of `.md` notes, linked with `[[wiki-links]]`, browsable as a
graph. It predates [OKF](/concepts/okf.md) and uses its own linking dialect
rather than OKF's plain markdown-link convention, so an Obsidian vault isn't
automatically an OKF bundle — but the two patterns solve the same underlying
problem in similar shapes.

[Amber](/tools/amber.md) borrows Obsidian's three-pane layout and graph view,
but reads and writes OKF's plain-markdown-link convention instead of
Obsidian's `[[...]]` syntax.
