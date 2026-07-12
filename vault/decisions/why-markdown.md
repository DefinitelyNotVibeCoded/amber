---
type: Decision
title: "Why Markdown"
description: "Why OKF chose plain markdown files over a database or binary format."
tags: [decision, markdown, portability]
timestamp: 2026-06-10T00:00:00Z
status: settled
---

# Why Markdown

[OKF](/concepts/okf.md) represents every concept as a UTF-8 markdown file
with a YAML frontmatter block, rather than rows in a database or a
proprietary binary format.

## Reasoning

* **No translation layer.** The same file is readable by a human in a text
  editor and parseable by an AI agent — no export step, no SDK required.
* **Survives moving between systems.** A bundle is just files: it can be
  shipped as a tarball, hosted in a git repo, or mounted on a filesystem.
* **Diffable and versionable.** Markdown lives naturally alongside code in
  version control, unlike a database dump.
* **Minimally opinionated.** Only `type` is required in frontmatter —
  everything else is left to the producer, keeping the format usable across
  wildly different domains (BigQuery tables, runbooks, people, decisions).

This is the same tradeoff the [LLM Wiki Pattern](/concepts/llm-wiki-pattern.md)
already made, and the reason tools like [Obsidian](/tools/obsidian.md) and
[Amber](/tools/amber.md) can both read the same underlying files.
