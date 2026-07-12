"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FileText } from "lucide-react";
import type { OkfTreeNode, VaultData } from "@/lib/types";
import { colorForType } from "@/lib/okfClient";

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
}: {
  node: OkfTreeNode;
  depth: number;
  vault: VaultData;
  selectedPath: string | null;
  onSelect: (path: string) => void;
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
          <div>
            {node.children.map((child) => (
              <Node
                key={child.path}
                node={child}
                depth={depth + 1}
                vault={vault}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const note = vault.notes.find((n) => n.path === node.path);
  const active = selectedPath === node.path;

  return (
    <button
      onClick={() => onSelect(node.path)}
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
}: {
  tree: OkfTreeNode[];
  vault: VaultData;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-1.5">
      {tree.map((node) => (
        <Node key={node.path} node={node} depth={0} vault={vault} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </div>
  );
}
