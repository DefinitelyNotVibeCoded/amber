---
type: Concept
title: "LLM Wiki Pattern"
description: "A second brain made of markdown, maintained by an AI agent instead of by hand."
tags: [pattern, second-brain, markdown]
timestamp: 2026-06-01T00:00:00Z
---

# LLM Wiki Pattern

An "LLM wiki" is a knowledge base (concept pages, entity pages, decision
logs) written as plain markdown, where an AI agent (not a human) does most of
the extracting, summarizing, cross-linking, and maintaining. The human drops
raw material in; the agent keeps the wiki coherent.

[Open Knowledge Format](/concepts/okf.md) formalizes this pattern with a
small set of agreed-upon frontmatter conventions so wikis produced by
different tools stay interoperable, instead of every project inventing its
own ad-hoc schema.

## Why it matters

* The wiki is a durable artifact, not a chat transcript that evaporates.
* It's diffable and versionable: it lives in git alongside code.
* It's queryable by both humans (browsing) and agents (retrieval).
