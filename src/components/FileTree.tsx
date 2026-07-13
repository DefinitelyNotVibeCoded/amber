"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FileText, Check, X as XIcon } from "lucide-react";
import type { OkfTreeNode, VaultData } from "@/lib/types";
import { colorForType } from "@/lib/okfClient";

export interface RowActions {
  onContextMenu: (e: React.MouseEvent, path: string) => void;
  renamingPath: string | null;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  deletingPath: string | null;
  onDeleteCommit: (path: string) => void;
  onDeleteCancel: () => void;
}

function TypeDot({ type, types }: { type?: string; types: string[] }) {
  if (!type) return null;
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: colorForType(type, types) }}
      title={type}
    />
  );
}

function Node({
  node,
  depth,
  vault,
  selectedPath,
  onSelect,
  actions,
}: {
  node: OkfTreeNode;
  depth: number;
  vault: VaultData;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  actions: RowActions;
}) {
  const [open, setOpen] = useState(true);

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-2)] text-[11px] font-medium uppercase tracking-wide transition-colors"
          style={{ paddingLeft: depth * 12 + 8 }}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Folder size={12} className="shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children && (
          <div className="animate-[fadeIn_0.12s_ease]">
            {node.children.map((child) => (
              <Node
                key={child.path}
                node={child}
                depth={depth + 1}
                vault={vault}
                selectedPath={selectedPath}
                onSelect={onSelect}
                actions={actions}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const note = vault.notes.find((n) => n.path === node.path);
  const active = selectedPath === node.path;
  const isRenaming = actions.renamingPath === node.path;
  const isDeleting = actions.deletingPath === node.path;

  if (isRenaming) {
    return (
      <div
        className="relative flex items-center gap-2 w-full px-2.5 py-1 rounded-md text-[13px]"
        style={{ paddingLeft: depth * 12 + 10 }}
      >
        <FileText size={13} className="shrink-0 opacity-60" />
        <input
          autoFocus
          value={actions.renameValue}
          onChange={(e) => actions.onRenameValueChange(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") actions.onRenameCommit();
            if (e.key === "Escape") actions.onRenameCancel();
          }}
          className="flex-1 min-w-0 bg-[var(--bg-2)] border border-[var(--accent)] rounded px-1.5 py-0.5 text-[13px] text-[var(--text-0)] outline-none"
        />
        <button
          onClick={actions.onRenameCommit}
          className="shrink-0 p-0.5 rounded hover:bg-[var(--bg-hover)] text-[var(--accent-bright)]"
          title="Confirm rename"
        >
          <Check size={13} />
        </button>
        <button
          onClick={actions.onRenameCancel}
          className="shrink-0 p-0.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-2)]"
          title="Cancel"
        >
          <XIcon size={13} />
        </button>
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div
        className="relative flex items-center gap-2 w-full px-2.5 py-1 rounded-md text-[13px] bg-[var(--danger)]/10"
        style={{ paddingLeft: depth * 12 + 10 }}
      >
        <span className="flex-1 min-w-0 truncate text-[var(--danger)]">Delete &ldquo;{note?.title || node.name}&rdquo;?</span>
        <button
          onClick={() => actions.onDeleteCommit(node.path)}
          className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[var(--danger)] text-white hover:opacity-90"
        >
          Delete
        </button>
        <button
          onClick={actions.onDeleteCancel}
          className="shrink-0 p-0.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-2)]"
          title="Cancel"
        >
          <XIcon size={13} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      onContextMenu={(e) => actions.onContextMenu(e, node.path)}
      className={`relative flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-md text-[13px] truncate transition-colors ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent-bright)] font-medium"
          : "text-[var(--text-0)] hover:bg-[var(--bg-hover)]"
      }`}
      style={{ paddingLeft: depth * 12 + 10 }}
      title={node.path}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-[var(--accent)]" />}
      <FileText size={13} className="shrink-0 opacity-60" />
      <span className="truncate flex-1">{note?.title || node.name}</span>
      <TypeDot type={note?.frontmatter.type} types={vault.types} />
    </button>
  );
}

export default function FileTree({
  tree,
  vault,
  selectedPath,
  onSelect,
  actions,
}: {
  tree: OkfTreeNode[];
  vault: VaultData;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  actions: RowActions;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-1.5">
      {tree.map((node) => (
        <Node
          key={node.path}
          node={node}
          depth={0}
          vault={vault}
          selectedPath={selectedPath}
          onSelect={onSelect}
          actions={actions}
        />
      ))}
    </div>
  );
}
