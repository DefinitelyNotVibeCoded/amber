"use client";

import { useState } from "react";
import { X, FilePlus2 } from "lucide-react";
import type { VaultData } from "@/lib/types";

const inputCls =
  "bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] px-2.5 py-1.5 outline-none focus:border-[var(--accent-dim)] transition-colors text-[var(--text-0)] placeholder:text-[var(--text-2)]";

export default function NewNoteModal({
  vault,
  onClose,
  onCreated,
}: {
  vault: VaultData;
  onClose: () => void;
  onCreated: (path: string) => void;
}) {
  const [dir, setDir] = useState("/concepts");
  const [filename, setFilename] = useState("");
  const [type, setType] = useState(vault.types[0] || "Concept");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function submit() {
    if (!type.trim()) {
      setError("Type is required.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/note/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dir,
          filename,
          type: type.trim(),
          title: title.trim(),
          description: description.trim(),
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create note.");
        return;
      }
      onCreated(data.path);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-[fadeIn_0.12s_ease]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-1)] border border-[var(--border)] rounded-[var(--radius-lg)] w-[440px] max-h-[85vh] overflow-y-auto p-5 shadow-[var(--shadow-lg)] animate-[popIn_0.15s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-bright)]">
              <FilePlus2 size={14} />
            </span>
            New OKF note
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-2)] hover:text-[var(--text-0)] p-1 rounded-full hover:bg-[var(--bg-2)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5 text-sm">
          <label className="flex flex-col gap-1.5">
            <span className="text-[var(--text-1)] text-[11.5px] font-medium">Folder (bundle-relative)</span>
            <input value={dir} onChange={(e) => setDir(e.target.value)} className={inputCls} placeholder="/concepts" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[var(--text-1)] text-[11.5px] font-medium">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="Concept name"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[var(--text-1)] text-[11.5px] font-medium">
              Filename <span className="text-[var(--text-2)] font-normal">(optional, derived from title)</span>
            </span>
            <input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className={`${inputCls} font-mono text-[13px]`}
              placeholder="my-concept.md"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[var(--text-1)] text-[11.5px] font-medium">Type *</span>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              list="okf-types"
              className={inputCls}
              placeholder="Concept, Person, Decision, Tool…"
            />
            <datalist id="okf-types">
              {vault.types.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[var(--text-1)] text-[11.5px] font-medium">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[var(--text-1)] text-[11.5px] font-medium">Tags (comma separated)</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="okf, knowledge" />
          </label>

          {error && <div className="text-xs text-[var(--danger)]">{error}</div>}

          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-full text-[13px] text-[var(--text-1)] hover:bg-[var(--bg-2)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={creating}
              className="px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-gradient-to-b from-[var(--accent-bright)] to-[var(--accent-dim)] hover:brightness-110 text-[#211a0d] disabled:opacity-60 shadow-[0_2px_8px_-2px_rgba(227,170,74,0.5)]"
            >
              {creating ? "Creating…" : "Create note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
