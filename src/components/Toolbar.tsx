"use client";

import { Network, FileText, Plus, Settings, Search, History, ListFilter } from "lucide-react";
import type { ViewMode } from "./App";
import Logo from "./Logo";
import WindowControls from "./WindowControls";

export default function Toolbar({
  vaultRoot,
  view,
  onSetView,
  search,
  onSearch,
  onNewNote,
  onOpenSettings,
  onOpenActivityLog,
  onOpenCommandPalette,
  hasActivity,
}: {
  vaultRoot: string;
  view: ViewMode;
  onSetView: (v: ViewMode) => void;
  search: string;
  onSearch: (s: string) => void;
  onNewNote: () => void;
  onOpenSettings: () => void;
  onOpenActivityLog: () => void;
  onOpenCommandPalette: () => void;
  hasActivity: boolean;
}) {
  return (
    <div className="app-drag select-none h-12 shrink-0 border-b border-[var(--border)] bg-[var(--bg-1)]/95 backdrop-blur-sm flex items-center gap-3 px-4">
      <div className="flex items-center gap-2 pr-3" title={vaultRoot}>
        <Logo size={22} className="shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]" />
        <span className="font-semibold tracking-tight text-[14px] text-[var(--text-0)]">Amber</span>
      </div>

      <div className="w-px h-5 bg-[var(--border)]" />

      <div className="app-no-drag flex items-center bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-full px-3 py-1 w-72 transition-colors focus-within:border-[var(--accent-dim)]">
        <Search size={13} className="text-[var(--text-2)] mr-2 shrink-0" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search notes, tags, types…"
          className="bg-transparent outline-none text-[13px] text-[var(--text-0)] placeholder:text-[var(--text-2)] w-full"
        />
      </div>

      <button
        onClick={onOpenCommandPalette}
        className="app-no-drag flex items-center gap-1 px-2 py-1 rounded-full border border-[var(--border-soft)] text-[11px] font-medium text-[var(--text-2)] hover:text-[var(--text-0)] hover:border-[var(--border)] transition-colors"
        title="Command palette"
      >
        <kbd className="font-sans">⌘K</kbd>
      </button>

      <div className="app-no-drag flex items-center gap-0.5 ml-1 bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-full p-0.5">
        <button
          onClick={() => onSetView("note")}
          className={`px-3 py-1 rounded-full text-[12.5px] font-medium flex items-center gap-1.5 transition-colors ${
            view === "note"
              ? "bg-[var(--accent-dim)] text-[var(--accent-contrast)]"
              : "text-[var(--text-1)] hover:text-[var(--text-0)]"
          }`}
          title="Note view"
        >
          <FileText size={13} /> Note
        </button>
        <button
          onClick={() => onSetView("graph")}
          className={`px-3 py-1 rounded-full text-[12.5px] font-medium flex items-center gap-1.5 transition-colors ${
            view === "graph"
              ? "bg-[var(--accent-dim)] text-[var(--accent-contrast)]"
              : "text-[var(--text-1)] hover:text-[var(--text-0)]"
          }`}
          title="Graph view"
        >
          <Network size={13} /> Graph
        </button>
        <button
          onClick={() => onSetView("query")}
          className={`px-3 py-1 rounded-full text-[12.5px] font-medium flex items-center gap-1.5 transition-colors ${
            view === "query"
              ? "bg-[var(--accent-dim)] text-[var(--accent-contrast)]"
              : "text-[var(--text-1)] hover:text-[var(--text-0)]"
          }`}
          title="Query view"
        >
          <ListFilter size={13} /> Query
        </button>
      </div>

      <div className="flex-1" />

      <button
        onClick={onNewNote}
        className="app-no-drag px-3.5 py-1 rounded-full text-[12.5px] font-medium flex items-center gap-1.5 bg-gradient-to-b from-[var(--accent-bright)] to-[var(--accent-dim)] hover:brightness-110 text-[var(--accent-contrast)] shadow-[0_2px_8px_-2px_rgba(var(--accent-rgb),0.5)]"
      >
        <Plus size={14} /> New note
      </button>
      <button
        onClick={onOpenActivityLog}
        className="app-no-drag relative p-1.5 rounded-full text-[var(--text-1)] hover:bg-[var(--bg-2)] hover:text-[var(--text-0)] transition-colors"
        title="Agent activity"
      >
        <History size={15} />
        {hasActivity && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        )}
      </button>
      <button
        onClick={onOpenSettings}
        className="app-no-drag p-1.5 rounded-full text-[var(--text-1)] hover:bg-[var(--bg-2)] hover:text-[var(--text-0)] transition-colors"
        title="Settings"
      >
        <Settings size={15} />
      </button>

      <WindowControls />
    </div>
  );
}
