import type { OkfNote, VaultData } from "./types";

export interface PluginCommand {
  id: string;
  label: string;
  keywords?: string;
  run: () => void;
}

/** What a plugin's onload() actually gets. Read-only vault access mirrors the same data the app
 * itself already has loaded (including precomputed backlinks/word counts) - a plugin never
 * touches the filesystem or a separate API, it only ever sees what the app itself can see. */
export interface PluginContext {
  vault: {
    listNotes(): OkfNote[];
    searchNotes(query: string): OkfNote[];
    readNote(path: string): OkfNote | null;
    getBacklinks(path: string): string[];
  };
  registerCommand(cmd: PluginCommand): void;
  onNoteOpen(callback: (path: string) => void): () => void;
  showNotice(message: string): void;
}

export interface AmberPlugin {
  name?: string;
  onload(ctx: PluginContext): void | Promise<void>;
  onunload?(): void | Promise<void>;
}

function searchNotes(vault: VaultData, query: string): OkfNote[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return vault.notes.filter((n) => {
    const haystack = `${n.title} ${n.body} ${n.path} ${(n.frontmatter.tags || []).join(" ")}`.toLowerCase();
    return haystack.includes(q);
  });
}

/** getVault is called fresh on every access (not a captured snapshot), so a command a plugin
 * registers at load time still sees current vault data whenever a user actually runs it later,
 * even after notes have since been edited. */
export function makePluginContext(
  getVault: () => VaultData,
  handlers: {
    onRegisterCommand: (cmd: PluginCommand) => void;
    onSubscribeNoteOpen: (callback: (path: string) => void) => () => void;
    onShowNotice: (message: string) => void;
  }
): PluginContext {
  return {
    vault: {
      listNotes: () => getVault().notes,
      searchNotes: (query) => searchNotes(getVault(), query),
      readNote: (path) => getVault().notes.find((n) => n.path === path) || null,
      getBacklinks: (path) => getVault().notes.find((n) => n.path === path)?.backlinks || [],
    },
    registerCommand: handlers.onRegisterCommand,
    onNoteOpen: handlers.onSubscribeNoteOpen,
    showNotice: handlers.onShowNotice,
  };
}

/** Loads one plugin file as a real ES module (via a Blob URL, since there's no bundler step for
 * user-dropped files) and runs its onload(). Wrapped so one broken plugin can't take the rest of
 * the app down with it - a failure here is reported as a notice and swallowed, not thrown. */
export async function loadPlugin(filename: string, ctx: PluginContext): Promise<AmberPlugin | null> {
  try {
    const res = await fetch(`/api/plugins/source?filename=${encodeURIComponent(filename)}`);
    if (!res.ok) throw new Error(`Could not read ${filename}`);
    const source = await res.text();
    const blob = new Blob([source], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    try {
      const mod = await import(/* webpackIgnore: true */ url);
      const plugin: AmberPlugin | undefined = mod.default;
      if (!plugin || typeof plugin.onload !== "function") {
        throw new Error(`${filename} does not export a default object with an onload() function`);
      }
      await plugin.onload(ctx);
      return plugin;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.showNotice(`Plugin "${filename}" failed to load: ${message}`);
    return null;
  }
}
