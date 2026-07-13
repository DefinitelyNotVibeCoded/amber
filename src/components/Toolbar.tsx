"use client";

import { Network, FileText, Plus, Settings, Search, History, ListFilter } from "lucide-react";
import type { ViewMode } from "./App";
import Logo from "./Logo";

export default function Toolbar({
  vaultRoot,
  view,
  onSetView,
  search,
  onSearch,
  onNewNote,
  onOpenSettings,
  onOpenActivityLog,
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
  hasActivity: boolean;
}) {
  return (
    <div className="h-14 shrink-0 border-b border-[var(--border)] bg-[var(--bg-1)]/95 backdrop-blur-sm flex items-center gap-3 px-4">
      <div className="flex items-center gap-2 pr-4 mr-1">
        <Logo size={24} className="shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]" />
        <span className="font-semibold tracking-tight text-[15px] text-[var(--text-0)]">Amber</span>
      </div>

      <div className="w-px h-6 bg-[var(--border)] mr-1" />

      <div className="flex items-center bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-full px-3 py-1.5 w-72 transition-colors focus-within:border-[var(--accent-dim)]">
        <Search size={14} className="text-[var(--text-2)] mr-2 shrink-0" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search notes, tags, types…"
          className="bg-transparent outline-none text-sm text-[var(--text-0)] placeholder:text-[var(--text-2)] w-full"
        />
      </div>

      <div className="flex items-center gap-0.5 ml-1 bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-full p-0.5">
        <button
          onClick={() => onSetView("note")}
          className={`px-3 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 transition-colors ${
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
          className={`px-3 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 transition-colors ${
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
          className={`px-3 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 transition-colors ${
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

      <span
        className="text-xs text-[var(--text-2)] max-w-[260px] truncate font-mono hidden md:block"
        title={vaultRoot}
      >
        {vaultRoot}
      </span>

      <button
        onClick={onNewNote}
        className="px-3.5 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 bg-gradient-to-b from-[var(--accent-bright)] to-[var(--accent-dim)] hover:brightness-110 text-[var(--accent-contrast)] shadow-[0_2px_8px_-2px_rgba(var(--accent-rgb),0.5)]"
      >
        <Plus size={14} /> New note
      </button>
      <button
        onClick={onOpenActivityLog}
        className="relative p-2 rounded-full text-[var(--text-1)] hover:bg-[var(--bg-2)] hover:text-[var(--text-0)] transition-colors"
        title="Agent activity"
      >
        <History size={16} />
        {hasActivity && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        )}
      </button>
      <button
        onClick={onOpenSettings}
        className="p-2 rounded-full text-[var(--text-1)] hover:bg-[var(--bg-2)] hover:text-[var(--text-0)] transition-colors"
        title="Settings"
      >
        <Settings size={16} />
      </button>
    </div>
  );
}
