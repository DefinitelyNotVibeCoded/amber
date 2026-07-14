import fs from "fs";
import path from "path";
import matter from "gray-matter";

const SKIP_DIRS = new Set([".obsidian", ".trash", ".git", ".smart-connections", "node_modules"]);
const WIKILINK_RE = /(!?)\[\[([^\]|#]+)(#[^\]|]+)?(\|([^\]]+))?\]\]/g;

export interface ObsidianImportResult {
  notesConverted: number;
  attachmentsCopied: number;
  linksResolved: number;
  linksUnresolved: number;
  warnings: string[];
}

function walkAll(dir: string, out: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") && !entry.isDirectory()) continue;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      walkAll(path.join(dir, entry.name), out);
    } else {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function normalizeTags(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return undefined;
}

export function importObsidianVault(sourceRoot: string, destRoot: string): ObsidianImportResult {
  const allFiles = walkAll(sourceRoot);
  const mdFiles = allFiles.filter((f) => f.toLowerCase().endsWith(".md"));
  const otherFiles = allFiles.filter((f) => !f.toLowerCase().endsWith(".md"));

  // Lookup for resolving [[wiki-links]]: basename (no extension, lowercase) -> destination bundle path
  const noteByBasename = new Map<string, string>();
  for (const abs of mdFiles) {
    const rel = path.relative(sourceRoot, abs).split(path.sep).join("/");
    const base = path.basename(abs, ".md").toLowerCase();
    if (!noteByBasename.has(base)) noteByBasename.set(base, `/${rel}`);
  }

  // Dedupe attachment filenames as they land in the flat /attachments folder
  const attachmentByBasename = new Map<string, string>();
  const usedAttachmentNames = new Set<string>();
  const attachmentCopyPlan = new Map<string, string>(); // source abs path -> dest bundle path
  for (const abs of otherFiles) {
    const original = path.basename(abs);
    const ext = path.extname(original);
    const stem = original.slice(0, original.length - ext.length);
    let destName = original;
    let i = 2;
    while (usedAttachmentNames.has(destName.toLowerCase())) {
      destName = `${stem}-${i}${ext}`;
      i++;
    }
    usedAttachmentNames.add(destName.toLowerCase());
    const destBundlePath = `/attachments/${destName}`;
    attachmentCopyPlan.set(abs, destBundlePath);
    attachmentByBasename.set(original.toLowerCase(), destBundlePath);
  }

  let linksResolved = 0;
  let linksUnresolved = 0;
  const warnings: string[] = [];

  for (const abs of mdFiles) {
    const rel = path.relative(sourceRoot, abs).split(path.sep).join("/");
    const bundlePath = `/${rel}`;
    const raw = fs.readFileSync(abs, "utf-8");
    const parsed = matter(raw);
    const frontmatter: Record<string, unknown> = { ...parsed.data };

    if (!frontmatter.type) frontmatter.type = "Note";
    const tags = normalizeTags(frontmatter.tags);
    if (tags) frontmatter.tags = tags;

    const body = parsed.content.replace(WIKILINK_RE, (full, bang, target, _anchor, _hasAlias, alias) => {
      const cleanTarget = String(target).trim();
      const targetBase = cleanTarget.split("/").pop()!.toLowerCase();
      const displayText = (alias as string | undefined)?.trim() || cleanTarget;
      const isEmbed = bang === "!";

      if (isEmbed) {
        const destAttach = attachmentByBasename.get(targetBase) || attachmentByBasename.get(`${targetBase}.png`);
        if (destAttach) {
          linksResolved++;
          return `![${displayText}](${destAttach})`;
        }
        const destNote = noteByBasename.get(targetBase);
        if (destNote) {
          linksResolved++;
          return `[${displayText}](${destNote})`;
        }
        linksUnresolved++;
        warnings.push(`Unresolved embed ![[${cleanTarget}]] in ${bundlePath}`);
        return `**${displayText}**`;
      }

      const destNote = noteByBasename.get(targetBase);
      if (destNote) {
        linksResolved++;
        return `[${displayText}](${destNote})`;
      }
      linksUnresolved++;
      warnings.push(`Unresolved link [[${cleanTarget}]] in ${bundlePath}`);
      return `**${displayText}**`;
    });

    const converted = matter.stringify(body, frontmatter);
    const destAbs = path.join(destRoot, rel);
    fs.mkdirSync(path.dirname(destAbs), { recursive: true });
    fs.writeFileSync(destAbs, converted, "utf-8");
  }

  let attachmentsCopied = 0;
  for (const [abs, destBundlePath] of attachmentCopyPlan) {
    const destAbs = path.join(destRoot, destBundlePath.slice(1));
    fs.mkdirSync(path.dirname(destAbs), { recursive: true });
    fs.copyFileSync(abs, destAbs);
    attachmentsCopied++;
  }

  return {
    notesConverted: mdFiles.length,
    attachmentsCopied,
    linksResolved,
    linksUnresolved,
    warnings: warnings.slice(0, 40),
  };
}
