import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { OkfFrontmatter, OkfLink, OkfNote, OkfTreeNode, VaultData } from "./types";

const RESERVED_FILENAMES = new Set(["index.md", "log.md"]);
const LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

/** Bundle-relative path, always starting with "/", e.g. "/concepts/okf.md" */
function bundlePath(root: string, absPath: string): string {
  const rel = toPosix(path.relative(root, absPath));
  return "/" + rel;
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.md$/, "");
  return base
    .split(/[-_]/g)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function walkMarkdownFiles(dir: string, root: string, out: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdownFiles(full, root, out);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

/** Resolve a raw markdown href against the linking note's location into a bundle-relative path. */
function resolveLinkTarget(raw: string, fromNotePath: string): string | null {
  const [hrefRaw] = raw.split("#");
  const href = hrefRaw.trim();
  if (!href.endsWith(".md")) return null;
  if (/^[a-z]+:\/\//i.test(href)) return null; // external

  if (href.startsWith("/")) {
    return href;
  }
  const fromDir = path.posix.dirname(fromNotePath);
  const resolved = path.posix.normalize(path.posix.join(fromDir, href));
  return resolved.startsWith("/") ? resolved : "/" + resolved;
}

/** Strip fenced code blocks and inline code spans so literal `[text](path.md)` shown as documentation doesn't get parsed as a real link. */
function stripCodeForLinkScan(body: string): string {
  return body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

function extractLinks(body: string, fromNotePath: string): OkfLink[] {
  const links: OkfLink[] = [];
  const scanText = stripCodeForLinkScan(body);
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(scanText)) !== null) {
    const [, text, href] = m;
    const target = resolveLinkTarget(href, fromNotePath);
    if (target) {
      links.push({ text: text || target, target, raw: href });
    }
  }
  return links;
}

function buildTree(notes: { path: string }[]): OkfTreeNode[] {
  const root: OkfTreeNode[] = [];

  const findOrCreateDir = (children: OkfTreeNode[], name: string, fullPath: string): OkfTreeNode => {
    let node = children.find((c) => c.isDir && c.name === name);
    if (!node) {
      node = { name, path: fullPath, isDir: true, children: [] };
      children.push(node);
    }
    return node;
  };

  for (const note of notes) {
    const parts = note.path.split("/").filter(Boolean);
    let cursor = root;
    let cursorPath = "";
    for (let i = 0; i < parts.length - 1; i++) {
      cursorPath += "/" + parts[i];
      const dirNode = findOrCreateDir(cursor, parts[i], cursorPath);
      cursor = dirNode.children!;
    }
    cursor.push({ name: parts[parts.length - 1], path: note.path, isDir: false });
  }

  const sortTree = (nodes: OkfTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) if (n.children) sortTree(n.children);
  };
  sortTree(root);

  // attach frontmatter type onto tree leaf nodes
  return root;
}

export function loadVault(root: string): VaultData {
  if (!fs.existsSync(root)) {
    return { root, notes: [], tree: [], tags: [], types: [] };
  }

  const files = walkMarkdownFiles(root, root);
  const notes: OkfNote[] = files.map((absPath) => {
    const bpath = bundlePath(root, absPath);
    const filename = path.basename(absPath);
    const raw = fs.readFileSync(absPath, "utf-8");
    const parsed = matter(raw);
    const frontmatter = (parsed.data || {}) as OkfFrontmatter;
    const body = parsed.content.trim();
    const title = frontmatter.title || titleFromFilename(filename);
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [];

    return {
      path: bpath,
      filename,
      dir: path.posix.dirname(bpath),
      frontmatter: { ...frontmatter, tags },
      title,
      body,
      links: extractLinks(body, bpath),
      backlinks: [],
      wordCount: body.split(/\s+/).filter(Boolean).length,
    };
  });

  const byPath = new Map(notes.map((n) => [n.path, n]));
  for (const note of notes) {
    for (const link of note.links) {
      const target = byPath.get(link.target);
      if (target && !target.backlinks.includes(note.path)) {
        target.backlinks.push(note.path);
      }
    }
  }

  const tree = buildTree(notes);

  const tagSet = new Set<string>();
  const typeSet = new Set<string>();
  for (const note of notes) {
    if (!RESERVED_FILENAMES.has(note.filename)) {
      if (note.frontmatter.type) typeSet.add(String(note.frontmatter.type));
      for (const t of note.frontmatter.tags || []) tagSet.add(t);
    }
  }

  notes.sort((a, b) => a.path.localeCompare(b.path));

  return {
    root,
    notes,
    tree,
    tags: Array.from(tagSet).sort(),
    types: Array.from(typeSet).sort(),
  };
}

