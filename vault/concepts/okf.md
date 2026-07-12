---
type: Concept
title: "Open Knowledge Format (OKF)"
description: "A vendor-neutral markdown spec for giving AI agents curated, portable context."
resource: https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf
tags: [okf, spec, markdown, ai-context]
timestamp: 2026-06-12T00:00:00Z
---

# Open Knowledge Format (OKF)

OKF v0.1 is a Google Cloud specification for representing organizational
knowledge (metrics, tables, datasets, APIs, runbooks) as a directory of
plain markdown files with a small set of reserved YAML frontmatter keys, so
that bundles produced by one system can be consumed by another without a
translation layer.

It formalizes the [LLM Wiki Pattern](/concepts/llm-wiki-pattern.md): a "second
brain" maintained as markdown, but readable by both humans and AI agents.

## Schema

Only `type` is required. Everything else (`title`, `description`,
`resource`, `tags`, `timestamp`) is recommended but optional, and producers
may add arbitrary extension fields that consumers must preserve.

## Examples

```yaml
---
type: BigQuery Table
title: Orders
description: One row per completed customer order.
resource: https://console.cloud.google.com/bigquery?p=acme&d=sales&t=orders
tags: [sales, revenue]
timestamp: 2026-05-28T14:30:00Z
---
```

## Citations

[1] [Google Cloud Blog: How the Open Knowledge Format can improve data sharing](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing/)
[2] [OKF spec: GoogleCloudPlatform/knowledge-catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)
