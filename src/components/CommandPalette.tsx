"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Waypoints, Table2, Settings, History, FilePlus, Paperclip } from "lucide-react";
import type { VaultData } from "@/lib/types";
import type { ViewMode } from "./App";
import { colorForType, isReservedFilename } from "@/lib/okfClient";

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  onRun: () => void;
  keywords?: string;
}

export default function CommandPalette({
  vault,
  onClose,
  onSelect,
  onSetView,
  onNewNote,
  onAddDocument,
  onOpenSettings,
  onOpenActivityLog,
}: {
  vault: VaultData;
  onClose: () => void;
  onSelect: (path: string) => void;
  onSetView: (v: ViewMode) => void;
  onNewNote: () => void;
  onAddDocument: () => void;
  onOpenSettings: () => void;
  onOpenActivityLog: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const actionItems: PaletteItem[] = useMemo(
    () => [
      {
        id: "action-new-note",
        label: "New note",
        icon: <FilePlus size={14} />,
        onRun: onNewNote,
        keywords: "create add",
      },
      {
        id: "action-add-document",
        label: "Add document",
        icon: <Paperclip size={14} />,
        onRun: onAddDocument,
        keywords: "attach file upload pdf image",
      },
      { id: "action-view-note", label: "Go to Note view", icon: <FileText size={14} />, onRun: () => onSetView("note") },
      {
        id: "action-view-graph",
        label: "Go to Graph view",
        icon: <Waypoints size={14} />,
        onRun: () => onSetView("graph"),
      },
      {
        id: "action-view-query",
        label: "Go to Query view",
        icon: <Table2 size={14} />,
        onRun: () => onSetView("query"),
      },
      { id: "action-settings", label: "Open Settings", icon: <Settings size={14} />, onRun: onOpenSettings },
      {
        id: "action-activity",
        label: "Open Agent activity",
        icon: <History size={14} />,
        onRun: onOpenActivityLog,
      },
    ],
    [onNewNote, onAddDocument, onSetView, onOpenSettings, onOpenActivityLog]
  );

  const noteItems: PaletteItem[] = useMemo(
    () =>
      vault.notes
        .filter((n) => !isReservedFilename(n.filename))
        .map((n) => ({
          id: `note-${n.path}`,
          label: n.title,
          sublabel: n.path,
          icon: (
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ background: colorForType(n.frontmatter.type, vault.types) }}
            />
          ),
          onRun: () => onSelect(n.path),
          keywords: `${n.frontmatter.type || ""} ${(n.frontmatter.tags || []).join(" ")}`,
        })),
    [vault, onSelect]
  );

  const allItems = useMemo(() => [...actionItems, ...noteItems], [actionItems, noteItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((item) =>
      `${item.label} ${item.sublabel || ""} ${item.keywords || ""}`.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const run = (item: PaletteItem) => {
    item.onRun();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-1)] shadow-[var(--shadow-lg)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const item = filtered[activeIndex];
              if (item) run(item);
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          placeholder="Search notes or jump to an action…"
          className="w-full px-4 py-3.5 bg-transparent text-[14px] text-[var(--text-0)] placeholder:text-[var(--text-2)] outline-none border-b border-[var(--border-soft)]"
        />
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1.5">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-[12.5px] text-[var(--text-2)]">No matches.</div>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onClick={() => run(item)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex items-center gap-2.5 w-full text-left px-4 py-2 text-[13px] transition-colors ${
                i === activeIndex
                  ? "bg-[var(--accent-soft)] text-[var(--accent-bright)]"
                  : "text-[var(--text-0)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              <span className="shrink-0 opacity-80">{item.icon}</span>
              <span className="truncate flex-1">{item.label}</span>
              {item.sublabel && (
                <span className="shrink-0 text-[11px] text-[var(--text-2)] truncate max-w-[40%]">
                  {item.sublabel}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
