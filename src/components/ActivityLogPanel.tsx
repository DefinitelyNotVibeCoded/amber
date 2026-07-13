"use client";

import { useEffect, useState } from "react";
import { X, History, FilePlus, Pencil, RotateCcw, ChevronDown, ChevronRight, Bot } from "lucide-react";
import type { VaultData } from "@/lib/types";
import { diffLines } from "@/lib/diff";

interface ActivityLogEntry {
  id: string;
  timestamp: string;
  tool: "write_note" | "create_note";
  path: string;
  before: string | null;
  after: string;
  revertedAt: string | null;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function DiffView({ before, after }: { before: string | null; after: string }) {
  const lines = diffLines(before ?? "", after);
  if (!lines) {
    return <p className="text-[11px] text-[var(--text-2)] italic">File too large to show an inline diff.</p>;
  }
  if (before === null) {
    return (
      <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap bg-[var(--bg-2)] rounded-md p-2.5 max-h-64 overflow-y-auto">
        {after.split("\n").map((line, i) => (
          <div key={i} className="text-emerald-400/90">
            + {line}
          </div>
        ))}
      </pre>
    );
  }
  return (
    <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap bg-[var(--bg-2)] rounded-md p-2.5 max-h-64 overflow-y-auto">
      {lines.map((l, i) => (
        <div
          key={i}
          className={
            l.type === "add"
              ? "text-emerald-400/90"
              : l.type === "remove"
                ? "text-[var(--danger)] line-through decoration-1 opacity-80"
                : "text-[var(--text-2)]"
          }
        >
          {l.type === "add" ? "+ " : l.type === "remove" ? "- " : "  "}
          {l.text}
        </div>
      ))}
    </pre>
  );
}

export default function ActivityLogPanel({
  vault,
  onClose,
  onNavigate,
  onReverted,
}: {
  vault: VaultData;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onReverted: () => Promise<void> | void;
}) {
  const [entries, setEntries] = useState<ActivityLogEntry[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/activity-log")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => setEntries([]));
  };

  useEffect(() => {
    load();
  }, []);

  async function revert(id: string) {
    setRevertingId(id);
    setError(null);
    try {
      const res = await fetch("/api/activity-log/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not revert.");
        return;
      }
      load();
      await onReverted();
    } finally {
      setRevertingId(null);
    }
  }

  const titleFor = (path: string) => vault.notes.find((n) => n.path === path)?.title || path;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-[fadeIn_0.12s_ease]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-1)] border border-[var(--border)] rounded-[var(--radius-lg)] w-[560px] h-[600px] shadow-[var(--shadow-lg)] animate-[popIn_0.15s_ease] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)]">
          <h2 className="text-[15px] font-semibold flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-bright)]">
              <History size={14} />
            </span>
            Agent activity
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-2)] hover:text-[var(--text-0)] p-1 rounded-full hover:bg-[var(--bg-2)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {entries === null && <p className="text-[12.5px] text-[var(--text-2)]">Loading…</p>}

          {entries && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-10">
              <Bot size={28} className="text-[var(--text-2)]" />
              <p className="text-[13px] text-[var(--text-1)] max-w-[320px]">
                No agent activity yet. Every note an MCP client creates or edits shows up here, with a diff and a one-click
                revert.
              </p>
              <p className="text-[11.5px] text-[var(--text-2)]">Connect a client in Settings → MCP Server to get started.</p>
            </div>
          )}

          {error && <div className="text-xs text-[var(--danger)] mb-3">{error}</div>}

          <div className="flex flex-col gap-2">
            {entries?.map((e) => {
              const isOpen = expanded === e.id;
              return (
                <div key={e.id} className="border border-[var(--border-soft)] rounded-[var(--radius-sm)] overflow-hidden">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpanded(isOpen ? null : e.id)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") setExpanded(isOpen ? null : e.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    {isOpen ? (
                      <ChevronDown size={13} className="text-[var(--text-2)] shrink-0" />
                    ) : (
                      <ChevronRight size={13} className="text-[var(--text-2)] shrink-0" />
                    )}
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        e.tool === "create_note" ? "bg-emerald-400/15 text-emerald-400" : "bg-[var(--accent-soft)] text-[var(--accent-bright)]"
                      }`}
                    >
                      {e.tool === "create_note" ? <FilePlus size={11} /> : <Pencil size={11} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onNavigate(e.path);
                        }}
                        className="text-[13px] font-medium text-[var(--text-0)] hover:text-[var(--accent-bright)] truncate block text-left transition-colors"
                      >
                        {titleFor(e.path)}
                      </button>
                      <span className="text-[11px] text-[var(--text-2)]">
                        {e.tool === "create_note" ? "Created" : "Edited"} · {relativeTime(e.timestamp)}
                      </span>
                    </span>
                    {e.revertedAt ? (
                      <span className="text-[10.5px] text-[var(--text-2)] px-2 py-0.5 rounded-full bg-[var(--bg-2)] shrink-0">
                        Reverted
                      </span>
                    ) : (
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          revert(e.id);
                        }}
                        disabled={revertingId === e.id}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full text-[var(--text-1)] border border-[var(--border-soft)] hover:text-[var(--danger)] hover:border-[var(--danger)] transition-colors disabled:opacity-50 shrink-0"
                      >
                        <RotateCcw size={11} /> {revertingId === e.id ? "…" : "Revert"}
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="px-3 pb-3">
                      <DiffView before={e.before} after={e.after} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
