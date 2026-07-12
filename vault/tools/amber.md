---
type: Tool
title: "Amber"
description: "An Obsidian-style local app for browsing, linking, and editing OKF bundles."
tags: [amber, app, okf-consumer]
timestamp: 2026-07-12T00:00:00Z
---

# Amber

Amber is a local, Obsidian-style reader and editor for
[Open Knowledge Format](/concepts/okf.md) bundles. It points at a folder on
disk, parses every markdown file's frontmatter and links per the OKF spec,
and renders:

* a folder tree in the sidebar, grouped by `type`
* a note view with parsed frontmatter (type, tags, description, resource,
  timestamp) shown as a metadata card above the rendered body
* a force-directed [knowledge graph](/concepts/knowledge-graph.md) colored by
  `type`, with backlinks surfaced under every note
* in-place editing that writes straight back to the underlying `.md` file —
  no database, no proprietary format

Where Obsidian is opaque volcanic glass built around its own `[[wiki-link]]`
dialect, Amber is named for the transparent, preserving counterpart — built
for a format designed to be read by anyone's tooling, including
[Obsidian](/tools/obsidian.md) itself.
