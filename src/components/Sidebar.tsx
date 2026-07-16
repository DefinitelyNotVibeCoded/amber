"use client";

import { useCallback, useRef, useState } from "react";
import type { VaultData } from "@/lib/types";
import FileTree, { RowActions } from "./FileTree";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";
import { colorForType, isReservedFilename } from "@/lib/okfClient";
import { X, Pencil, Trash2, FolderOpen, FileSearch, Undo2 } from "lucide-react";

export default function Sidebar({
  vault,
  selectedPath,
  onSelect,
  search,
  typeFilter,
  tagFilter,
  onTypeFilter,
  onTagFilter,
  onChanged,
  width,
  onResize,
}: {
  vault: VaultData;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  search: string;
  typeFilter: string | null;
  tagFilter: string | null;
  onTypeFilter: (t: string | null) => void;
  onTagFilter: (t: string | null) => void;
  onChanged: (opts?: { deletedPath?: string; renamedTo?: string }) => void;
  width: number;
  onResize: (width: number) => void;
}) {
  const asideRef = useRef<HTMLElement>(null);
  const [resizing, setResizing] = useState(false);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = asideRef.current?.getBoundingClientRect().width ?? width;
      setResizing(true);

      const onMove = (moveEvent: MouseEvent) => {
        const next = Math.min(480, Math.max(220, startWidth + (moveEvent.clientX - startX)));
        if (asideRef.current) asideRef.current.style.width = `${next}px`;
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        setResizing(false);
        const finalWidth = asideRef.current?.getBoundingClientRect().width ?? width;
        onResize(Math.round(finalWidth));
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [width, onResize]
  );
  const query = search.trim().toLowerCase();
  const filtering = Boolean(query || typeFilter || tagFilter);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ trashId: string; title: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRename = useCallback(
    (path: string) => {
      const note = vault.notes.find((n) => n.path === path);
      const base = (note?.filename || path.split("/").pop() || "").replace(/\.md$/, "");
      setRenamingPath(path);
      setRenameValue(base);
      setDeletingPath(null);
    },
    [vault.notes]
  );

  const commitRename = useCallback(async () => {
    if (!renamingPath) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingPath(null);
      return;
    }
    const dir = renamingPath.slice(0, renamingPath.lastIndexOf("/"));
    const toPath = `${dir}/${trimmed}.md`;
    if (toPath === renamingPath) {
      setRenamingPath(null);
      return;
    }
    try {
      const res = await fetch("/api/note/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPath: renamingPath, toPath }),
      });
      if (res.ok) {
        setRenamingPath(null);
        onChanged({ renamedTo: toPath });
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Rename failed.");
      }
    } catch {
      alert("Rename failed.");
    }
  }, [renamingPath, renameValue, onChanged]);

  const commitDelete = useCallback(
    async (path: string) => {
      const title = vault.notes.find((n) => n.path === path)?.title || path.split("/").pop() || "Note";
      try {
        const res = await fetch("/api/note/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setDeletingPath(null);
          onChanged({ deletedPath: path });
          if (data.trashId) {
            if (undoTimer.current) clearTimeout(undoTimer.current);
            setUndo({ trashId: data.trashId, title });
            undoTimer.current = setTimeout(() => setUndo(null), 8000);
          }
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "Delete failed.");
        }
      } catch {
        alert("Delete failed.");
      }
    },
    [onChanged, vault.notes]
  );

  const restoreDeleted = useCallback(async () => {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const { trashId } = undo;
    setUndo(null);
    try {
      const res = await fetch("/api/note/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trashId }),
      });
      if (res.ok) {
        onChanged();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Restore failed.");
      }
    } catch {
      alert("Restore failed.");
    }
  }, [undo, onChanged]);

  const openContextMenu = useCallback((e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (isReservedFilename(path.split("/").pop() || "")) return;
    setContextMenu({ x: e.clientX, y: e.clientY, path });
  }, []);

  const rowActions: RowActions = {
    onContextMenu: openContextMenu,
    renamingPath,
    renameValue,
    onRenameValueChange: setRenameValue,
    onRenameCommit: commitRename,
    onRenameCancel: () => setRenamingPath(null),
    deletingPath,
    onDeleteCommit: (path) => commitDelete(path),
    onDeleteCancel: () => setDeletingPath(null),
  };

  const menuItems: ContextMenuItem[] = contextMenu
    ? [
        {
          label: "Open",
          icon: <FileSearch size={13} />,
          onClick: () => onSelect(contextMenu.path),
        },
        {
          label: "Rename",
          icon: <Pencil size={13} />,
          onClick: () => startRename(contextMenu.path),
        },
        ...(typeof window !== "undefined" && window.amber
          ? [
              {
                label: "Reveal in folder",
                icon: <FolderOpen size={13} />,
                onClick: () => {
                  const abs = `${vault.root}${contextMenu.path}`.replace(/\//g, "\\");
                  window.amber?.revealInFolder(abs);
                },
              },
            ]
          : []),
        {
          label: "Delete",
          icon: <Trash2 size={13} />,
          danger: true,
          onClick: () => setDeletingPath(contextMenu.path),
        },
      ]
    : [];

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
    <aside
      ref={asideRef}
      style={{ width }}
      className="relative shrink-0 border-r border-[var(--border)] bg-[var(--bg-1)] flex flex-col min-h-0"
    >
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
                const isRenaming = renamingPath === n.path;
                const isDeleting = deletingPath === n.path;

                if (isRenaming) {
                  return (
                    <div key={n.path} className="flex items-center gap-2 w-full px-2.5 py-1 rounded-md text-sm">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onFocus={(e) => e.currentTarget.select()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setRenamingPath(null);
                        }}
                        className="flex-1 min-w-0 bg-[var(--bg-2)] border border-[var(--accent)] rounded px-1.5 py-0.5 text-sm text-[var(--text-0)] outline-none"
                      />
                    </div>
                  );
                }

                if (isDeleting) {
                  return (
                    <div
                      key={n.path}
                      className="flex items-center gap-2 w-full px-2.5 py-1 rounded-md text-sm bg-[var(--danger)]/10"
                    >
                      <span className="flex-1 min-w-0 truncate text-[var(--danger)]">Delete &ldquo;{n.title}&rdquo;?</span>
                      <button
                        onClick={() => commitDelete(n.path)}
                        className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[var(--danger)] text-white hover:opacity-90"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeletingPath(null)}
                        className="shrink-0 p-0.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-2)]"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    key={n.path}
                    onClick={() => onSelect(n.path)}
                    onContextMenu={(e) => openContextMenu(e, n.path)}
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
          <FileTree tree={vault.tree} vault={vault} selectedPath={selectedPath} onSelect={onSelect} actions={rowActions} />
        )}
      </div>

      {undo && (
        <div className="mx-2.5 mb-2 flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-md)] bg-[var(--bg-2)] border border-[var(--border)] text-[12px] shadow-[var(--shadow-sm)]">
          <Trash2 size={13} className="shrink-0 text-[var(--text-2)]" />
          <span className="flex-1 min-w-0 truncate text-[var(--text-1)]">
            Moved &ldquo;{undo.title}&rdquo; to trash
          </span>
          <button
            onClick={restoreDeleted}
            className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-[var(--accent-bright)] hover:bg-[var(--accent-soft)] transition-colors"
          >
            <Undo2 size={12} /> Undo
          </button>
        </div>
      )}

      <div className="p-2.5 border-t border-[var(--border-soft)] text-[11px] text-[var(--text-2)] flex justify-between">
        <span>{vault.notes.filter((n) => !isReservedFilename(n.filename)).length} concepts</span>
        <span>{vault.types.length} types</span>
      </div>

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={menuItems} onClose={() => setContextMenu(null)} />
      )}

      <div
        onMouseDown={startResize}
        className="absolute top-0 -right-1.5 bottom-0 w-3 cursor-col-resize z-10 group"
      >
        <div
          className={`w-px h-full mx-auto transition-colors ${
            resizing ? "bg-[var(--accent)]" : "bg-transparent group-hover:bg-[var(--accent-dim)]"
          }`}
        />
      </div>
    </aside>
  );
}
