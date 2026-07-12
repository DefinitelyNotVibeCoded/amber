---
type: Concept
title: "Knowledge Graph"
description: "The link structure that emerges from cross-references between concept files."
tags: [graph, linking]
timestamp: 2026-06-05T00:00:00Z
---

# Knowledge Graph

Under [OKF](/concepts/okf.md), links are just standard markdown links between
`.md` files: either bundle-relative (`/tables/customers.md`) or path-relative
(`./customers.md`). Because links are untyped and unregistered, the
relationship kind is expressed in the surrounding prose, not in the link
syntax itself.

The resulting graph is richer than the filesystem's parent/child hierarchy:
a [Person](/people/andrej-karpathy.md) can link to a
[Concept](/concepts/llm-wiki-pattern.md), which can link to a
[Tool](/tools/amber.md), regardless of which folder each file lives in.

Amber's graph view renders exactly this structure: nodes are concepts,
edges are markdown links, and color encodes `type`.
