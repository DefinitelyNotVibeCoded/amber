# Amber

An Obsidian-style local app for browsing, linking, and editing [Open Knowledge
Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)
(OKF) bundles.

Obsidian is opaque volcanic glass built around its own note-taking
conventions. Amber is the transparent, preserving counterpart — built for a
format designed to be read by anyone's tooling, not just its own.

## Features

- **Vault browser** — folder tree sidebar grouped by type, with search and
  type/tag filters
- **Note view** — renders frontmatter (`type`, `tags`, `description`,
  `resource`, `timestamp`) as a metadata card above the parsed markdown body
- **Knowledge graph** — force-directed view of every OKF markdown link,
  colored by `type`, with backlinks on every note
- **In-place editing** — edits write straight back to the `.md` file on disk,
  no database
- **New note** — scaffolds a conformant OKF file (required `type`, optional
  `title`/`description`/`tags`) in any folder

## Run it

```
npm install
npm run dev
```

Then open http://localhost:3000. It loads the bundled `vault/` folder by
default — a small sample OKF bundle about OKF itself. Point it at any other
folder of OKF markdown files from the settings (gear icon) in the toolbar.

## How it works

- `src/lib/okf.ts` — server-side vault loader: walks the folder, parses
  frontmatter with `gray-matter`, extracts and resolves markdown links per
  the OKF spec (absolute `/path.md` and relative `./path.md`), builds
  backlinks and the folder tree.
- `src/app/api/*` — reads/writes files on disk for the note view, editor, new
  note, and vault-path settings.
- `src/components/*` — the three-pane UI (sidebar, note/graph view) plus the
  edit and new-note modals.

Conforms to OKF v0.1: only `type` is required in frontmatter; unknown types,
unknown extension fields, and broken links are all tolerated rather than
rejected.
