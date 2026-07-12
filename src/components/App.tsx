"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { VaultData } from "@/lib/types";
import Logo from "./Logo";
import Sidebar from "./Sidebar";
import NoteView from "./NoteView";
import GraphView from "./GraphView";
import Toolbar from "./Toolbar";
import NewNoteModal from "./NewNoteModal";
import SettingsModal from "./SettingsModal";

export type ViewMode = "note" | "graph";

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
  const [showSettings, setShowSettings] = useState(false);

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
    if (!selectedPath && vault && vault.notes.length > 0) {
      const idx = vault.notes.find((n) => n.path === "/index.md");
      setSelectedPath(idx ? idx.path : vault.notes[0].path);
    }
  }, [vault, selectedPath]);

  const selectedNote = useMemo(
    () => vault?.notes.find((n) => n.path === selectedPath) || null,
    [vault, selectedPath]
  );

  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path);
    setView("note");
  }, []);

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
        onOpenSettings={() => setShowSettings(true)}
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
        />
        <main className="flex-1 min-w-0 flex flex-col">
          {view === "graph" ? (
            <GraphView vault={vault} onSelect={handleSelect} focusPath={selectedPath} />
          ) : (
            <NoteView
              key={selectedNote?.path}
              vault={vault}
              note={selectedNote}
              onNavigate={handleSelect}
              onSaved={reload}
            />
          )}
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
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          currentPath={vault.root}
          onClose={() => setShowSettings(false)}
          onSaved={async () => {
            setShowSettings(false);
            setSelectedPath(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}
