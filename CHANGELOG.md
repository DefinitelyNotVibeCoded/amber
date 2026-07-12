# Changelog

All notable changes to Amber are recorded here.

## 0.2.0 — 2026-07-12

- Added a built-in MCP server (`mcp/server.ts`) so Claude Desktop, Claude Code, or
  any other MCP client can read, search, and write the vault directly and
  repeatedly across chats.
- Packaged Amber as an Electron desktop app (`npm run electron:dev` for
  development, `npm run dist` to build a Windows installer) instead of a
  browser tab.
- Deepened the Settings panel into General / MCP Server / About sections,
  with a ready-to-paste Claude Desktop config snippet and app version display.
- Refactored note read/write/create logic into `src/lib/vaultOps.ts`, shared
  by both the web app's API routes and the MCP server.

## 0.1.0 — 2026-07-12

- Initial MVP: vault browser (folder tree, search, type/tag filters), note
  view with OKF frontmatter metadata card, force-directed knowledge graph,
  in-place markdown editing, and new-note creation.
- Custom logo and a full visual redesign (pill controls, refined dark
  palette, backlinks, graph legend).
- Seeded sample OKF bundle describing the format itself.
