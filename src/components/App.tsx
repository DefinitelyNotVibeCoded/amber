"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { VaultData } from "@/lib/types";
import { resolveThemeVars } from "@/lib/themes";
import Logo from "./Logo";
import Sidebar from "./Sidebar";
import NoteView from "./NoteView";
import GraphView from "./GraphView";
import Toolbar from "./Toolbar";
import NewNoteModal from "./NewNoteModal";
import AddDocumentModal from "./AddDocumentModal";
import SettingsModal from "./SettingsModal";
import ActivityLogPanel from "./ActivityLogPanel";
import QueryView from "./QueryView";
import CommandPalette from "./CommandPalette";
import PluginNotices from "./PluginNotices";
import { usePlugins } from "@/hooks/usePlugins";

const THEME_PRESET_KEY = "amber-theme-preset";
const THEME_ACCENT_KEY = "amber-theme-accent";
const SIDEBAR_WIDTH_KEY = "amber-sidebar-width";
const READING_FONT_KEY = "amber-reading-font";
const READING_SIZE_KEY = "amber-reading-size";
const CONTENT_WIDTH_KEY = "amber-content-width";
const DEFAULT_SIDEBAR_WIDTH = 288;

export type ReadingFont = "sans" | "serif" | "mono";
export type ReadingSize = "small" | "medium" | "large";
export type ContentWidth = "narrow" | "normal" | "wide";

const READING_FONTS: Record<ReadingFont, string> = {
  sans: 'Inter, -apple-system, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"JetBrains Mono", Consolas, monospace',
};
const READING_SIZES: Record<ReadingSize, string> = {
  small: "13px",
  medium: "14px",
  large: "16px",
};
const CONTENT_WIDTHS: Record<ContentWidth, string> = {
  narrow: "40rem",
  normal: "48rem",
  wide: "62rem",
};

export type ViewMode = "note" | "graph" | "query" | "agents";

export default function App() {
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("note");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [hasActivity, setHasActivity] = useState(false);
  const [themePreset, setThemePresetState] = useState("amber");
  const [accentOverride, setAccentOverrideState] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidthState] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [autoEditPath, setAutoEditPath] = useState<string | null>(null);
  const [readingFont, setReadingFontState] = useState<ReadingFont>("sans");
  const [readingSize, setReadingSizeState] = useState<ReadingSize>("medium");
  const [contentWidth, setContentWidthState] = useState<ContentWidth>("normal");

  useEffect(() => {
    const savedPreset = localStorage.getItem(THEME_PRESET_KEY);
    const savedAccent = localStorage.getItem(THEME_ACCENT_KEY);
    const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const savedFont = localStorage.getItem(READING_FONT_KEY) as ReadingFont | null;
    const savedSize = localStorage.getItem(READING_SIZE_KEY) as ReadingSize | null;
    const savedContentWidth = localStorage.getItem(CONTENT_WIDTH_KEY) as ContentWidth | null;
    if (savedPreset) setThemePresetState(savedPreset);
    if (savedAccent) setAccentOverrideState(savedAccent);
    if (savedWidth) setSidebarWidthState(Number(savedWidth));
    if (savedFont && READING_FONTS[savedFont]) setReadingFontState(savedFont);
    if (savedSize && READING_SIZES[savedSize]) setReadingSizeState(savedSize);
    if (savedContentWidth && CONTENT_WIDTHS[savedContentWidth]) setContentWidthState(savedContentWidth);
  }, []);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--reading-font", READING_FONTS[readingFont]);
    root.setProperty("--reading-size", READING_SIZES[readingSize]);
    root.setProperty("--content-width", CONTENT_WIDTHS[contentWidth]);
  }, [readingFont, readingSize, contentWidth]);

  const setReadingFont = useCallback((f: ReadingFont) => {
    setReadingFontState(f);
    localStorage.setItem(READING_FONT_KEY, f);
  }, []);
  const setReadingSize = useCallback((s: ReadingSize) => {
    setReadingSizeState(s);
    localStorage.setItem(READING_SIZE_KEY, s);
  }, []);
  const setContentWidth = useCallback((w: ContentWidth) => {
    setContentWidthState(w);
    localStorage.setItem(CONTENT_WIDTH_KEY, w);
  }, []);

  const setSidebarWidth = useCallback((width: number) => {
    setSidebarWidthState(width);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
  }, []);

  useEffect(() => {
    const vars = resolveThemeVars(themePreset, accentOverride);
    for (const [key, value] of Object.entries(vars)) {
      document.documentElement.style.setProperty(key, value);
    }
  }, [themePreset, accentOverride]);

  const setThemePreset = useCallback((id: string) => {
    setThemePresetState(id);
    localStorage.setItem(THEME_PRESET_KEY, id);
  }, []);

  const setAccentOverride = useCallback((hex: string | null) => {
    setAccentOverrideState(hex);
    if (hex) localStorage.setItem(THEME_ACCENT_KEY, hex);
    else localStorage.removeItem(THEME_ACCENT_KEY);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vault");
      const data = (await res.json()) as VaultData;
      setVault(data);
      setError(null);
    } catch {
      setError("Could not load vault.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    fetch("/api/activity-log")
      .then((r) => r.json())
      .then((d) => setHasActivity((d.entries || []).length > 0))
      .catch(() => {});
  }, [vault]);

  useEffect(() => {
    if (!selectedPath && vault && vault.notes.length > 0) {
      const idx = vault.notes.find((n) => n.path === "/index.md");
      setSelectedPath(idx ? idx.path : vault.notes[0].path);
    }
  }, [vault, selectedPath]);

  const selectedNote = useMemo(
    () => vault?.notes.find((n) => n.path === selectedPath) || null,
    [vault, selectedPath]
  );

  const { commands: pluginCommands, notices: pluginNotices, dismissNotice, notifyNoteOpen } = usePlugins(vault);

  const handleSelect = useCallback(
    (path: string) => {
      setSelectedPath(path);
      setView("note");
      notifyNoteOpen(path);
    },
    [notifyNoteOpen]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSidebarChanged = useCallback(
    async (opts?: { deletedPath?: string; renamedTo?: string }) => {
      await reload();
      if (opts?.renamedTo) {
        setSelectedPath(opts.renamedTo);
      } else if (opts?.deletedPath && opts.deletedPath === selectedPath) {
        setSelectedPath(null);
      }
    },
    [reload, selectedPath]
  );

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-3 bg-[var(--bg-0)]">
        <Logo size={32} className="animate-pulse" />
        <span className="text-[13px] text-[var(--text-2)]">Loading vault…</span>
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-3 bg-[var(--bg-0)]">
        <Logo size={32} className="opacity-50" />
        <span className="text-[13px] text-[var(--text-1)]">{error || "No vault loaded."}</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-0)] text-[var(--text-0)]">
      <Toolbar
        vaultRoot={vault.root}
        view={view}
        onSetView={setView}
        search={search}
        onSearch={setSearch}
        onNewNote={() => setShowNewNote(true)}
        onAddDocument={() => setShowAddDocument(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenActivityLog={() => setShowActivityLog(true)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        hasActivity={hasActivity}
      />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          vault={vault}
          selectedPath={selectedPath}
          onSelect={handleSelect}
          search={search}
          typeFilter={typeFilter}
          tagFilter={tagFilter}
          onTypeFilter={setTypeFilter}
          onTagFilter={setTagFilter}
          onChanged={handleSidebarChanged}
          width={sidebarWidth}
          onResize={setSidebarWidth}
        />
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div
            key={view === "note" ? `note-${selectedNote?.path}` : view}
            className="flex-1 min-h-0 flex flex-col animate-[contentIn_0.16s_ease]"
          >
            {view === "graph" ? (
              <GraphView vault={vault} onSelect={handleSelect} focusPath={selectedPath} />
            ) : view === "agents" ? (
              <GraphView vault={vault} onSelect={handleSelect} focusPath={selectedPath} mode="agents" />
            ) : view === "query" ? (
              <QueryView vault={vault} onSelect={handleSelect} />
            ) : (
              <NoteView
                vault={vault}
                note={selectedNote}
                onNavigate={handleSelect}
                onSaved={reload}
                autoEdit={selectedNote?.path === autoEditPath}
                onAutoEditHandled={() => setAutoEditPath(null)}
              />
            )}
          </div>
        </main>
      </div>

      {showNewNote && (
        <NewNoteModal
          vault={vault}
          onClose={() => setShowNewNote(false)}
          onCreated={async (path) => {
            setShowNewNote(false);
            await reload();
            setSelectedPath(path);
            setView("note");
            setAutoEditPath(path);
          }}
        />
      )}

      {showAddDocument && (
        <AddDocumentModal
          vault={vault}
          onClose={() => setShowAddDocument(false)}
          onCreated={async (path) => {
            setShowAddDocument(false);
            await reload();
            setSelectedPath(path);
            setView("note");
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          currentPath={vault.root}
          themePreset={themePreset}
          accentOverride={accentOverride}
          onSetThemePreset={setThemePreset}
          onSetAccentOverride={setAccentOverride}
          readingFont={readingFont}
          readingSize={readingSize}
          contentWidth={contentWidth}
          onSetReadingFont={setReadingFont}
          onSetReadingSize={setReadingSize}
          onSetContentWidth={setContentWidth}
          onClose={() => setShowSettings(false)}
          onSaved={async () => {
            setShowSettings(false);
            setSelectedPath(null);
            await reload();
          }}
        />
      )}

      {showActivityLog && (
        <ActivityLogPanel
          vault={vault}
          onClose={() => setShowActivityLog(false)}
          onNavigate={(path) => {
            setShowActivityLog(false);
            handleSelect(path);
          }}
          onReverted={reload}
        />
      )}

      {showCommandPalette && (
        <CommandPalette
          vault={vault}
          onClose={() => setShowCommandPalette(false)}
          onSelect={handleSelect}
          onSetView={setView}
          onNewNote={() => setShowNewNote(true)}
          onAddDocument={() => setShowAddDocument(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenActivityLog={() => setShowActivityLog(true)}
          pluginCommands={pluginCommands}
        />
      )}

      <PluginNotices notices={pluginNotices} onDismiss={dismissNotice} />
    </div>
  );
}
