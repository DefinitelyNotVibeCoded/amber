"use client";

import type { VaultData } from "@/lib/types";
import FileTree from "./FileTree";
import { colorForType, isReservedFilename } from "@/lib/okfClient";
import { X } from "lucide-react";

export default function Sidebar({
  vault,
  selectedPath,
  onSelect,
  search,
  typeFilter,
  tagFilter,
  onTypeFilter,
  onTagFilter,
}: {
  vault: VaultData;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  search: string;
  typeFilter: string | null;
  tagFilter: string | null;
  onTypeFilter: (t: string | null) => void;
  onTagFilter: (t: string | null) => void;
}) {
  const query = search.trim().toLowerCase();
  const filtering = Boolean(query || typeFilter || tagFilter);

  const filteredNotes = vault.notes.filter((n) => {
    if (typeFilter && n.frontmatter.type !== typeFilter) return false;
    if (tagFilter && !(n.frontmatter.tags || []).includes(tagFilter)) return false;
    if (query) {
      const haystack = [
        n.title,
        n.frontmatter.type,
        n.frontmatter.description,
        ...(n.frontmatter.tags || []),
        n.body,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return (
    <aside className="w-72 shrink-0 border-r border-[var(--border)] bg-[var(--bg-1)] flex flex-col min-h-0">
      <div className="p-2.5 border-b border-[var(--border-soft)] flex flex-wrap gap-1.5">
        {vault.types.map((t) => {
          const active = typeFilter === t;
          const color = colorForType(t, vault.types);
          return (
            <button
              key={t}
              onClick={() => onTypeFilter(active ? null : t)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border transition-all"
              style={{
                borderColor: active ? color : "var(--border)",
                background: active ? color + "20" : "var(--bg-2)",
                color: active ? color : "var(--text-1)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              {t}
            </button>
          );
        })}
      </div>

      {vault.tags.length > 0 && (
        <div className="px-2.5 py-2 border-b border-[var(--border-soft)] flex flex-wrap gap-1">
          {vault.tags.map((tag) => {
            const active = tagFilter === tag;
            return (
              <button
                key={tag}
                onClick={() => onTagFilter(active ? null : tag)}
                className={`px-1.5 py-0.5 rounded text-[10.5px] transition-colors ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-bright)]"
                    : "bg-[var(--bg-2)] text-[var(--text-2)] hover:text-[var(--text-1)]"
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}

      {(typeFilter || tagFilter) && (
        <button
          onClick={() => {
            onTypeFilter(null);
            onTagFilter(null);
          }}
          className="mx-2.5 mt-2 mb-0.5 flex items-center gap-1 text-[11px] text-[var(--text-2)] hover:text-[var(--text-0)] w-fit transition-colors"
        >
          <X size={11} /> clear filters
        </button>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 py-1.5">
        {filtering ? (
          <div className="flex flex-col gap-0.5 px-1.5">
            {filteredNotes.length === 0 && (
              <div className="px-3 py-4 text-xs text-[var(--text-2)]">No matching notes.</div>
            )}
            {filteredNotes
              .filter((n) => !isReservedFilename(n.filename))
              .map((n) => {
                const active = selectedPath === n.path;
                return (
                  <button
                    key={n.path}
                    onClick={() => onSelect(n.path)}
                    className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-md text-sm truncate transition-colors ${
                      active
                        ? "bg-[var(--accent-soft)] text-[var(--accent-bright)] font-medium"
                        : "text-[var(--text-0)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: colorForType(n.frontmatter.type, vault.types) }}
                    />
                    <span className="truncate">{n.title}</span>
                  </button>
                );
              })}
          </div>
        ) : (
          <FileTree tree={vault.tree} vault={vault} selectedPath={selectedPath} onSelect={onSelect} />
        )}
      </div>

      <div className="p-2.5 border-t border-[var(--border-soft)] text-[11px] text-[var(--text-2)] flex justify-between">
        <span>{vault.notes.filter((n) => !isReservedFilename(n.filename)).length} concepts</span>
        <span>{vault.types.length} types</span>
      </div>
    </aside>
  );
}
