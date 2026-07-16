"use client";

import { X, Puzzle } from "lucide-react";
import type { PluginNotice } from "@/hooks/usePlugins";

export default function PluginNotices({ notices, onDismiss }: { notices: PluginNotice[]; onDismiss: (id: string) => void }) {
  if (notices.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 w-80">
      {notices.map((n) => (
        <div
          key={n.id}
          className="flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-1)] shadow-[var(--shadow-lg)] text-[12.5px] text-[var(--text-0)] animate-[contentIn_0.16s_ease]"
        >
          <Puzzle size={14} className="shrink-0 mt-0.5 text-[var(--accent-bright)]" />
          <span className="flex-1 min-w-0 break-words">{n.message}</span>
          <button onClick={() => onDismiss(n.id)} className="shrink-0 text-[var(--text-2)] hover:text-[var(--text-0)]">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
