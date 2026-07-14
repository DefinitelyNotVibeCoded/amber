"use client";

import { useMemo, useRef, useState } from "react";
import { X, Paperclip, ChevronRight, Check, File as FileIcon } from "lucide-react";
import type { VaultData } from "@/lib/types";
import { colorForType } from "@/lib/okfClient";
import { folderForType } from "@/lib/noteTemplates";

const inputCls =
  "bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] px-2.5 py-1.5 outline-none focus:border-[var(--accent-dim)] transition-colors text-[var(--text-0)] placeholder:text-[var(--text-2)]";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AddDocumentModal({
  vault,
  onClose,
  onCreated,
}: {
  vault: VaultData;
  onClose: () => void;
  onCreated: (path: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState("Document");
  const [customType, setCustomType] = useState(false);
  const [title, setTitle] = useState("");
  const [dir, setDir] = useState(folderForType("Document"));
  const [dirTouched, setDirTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const typeOptions = useMemo(() => {
    const set = new Set(vault.types);
    set.add("Document");
    return Array.from(set);
  }, [vault.types]);

  function selectType(t: string) {
    setType(t);
    setCustomType(false);
    if (!dirTouched) setDir(folderForType(t));
  }

  function handleFileChosen(f: File) {
    setFile(f);
    if (!title.trim()) {
      setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
  }

  async function submit() {
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (!type.trim()) {
      setError("Type is required.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("dir", dir);
      form.append("type", type.trim());
      form.append("title", title.trim());
      form.append("description", description.trim());
      form.append("tags", tags);

      const res = await fetch("/api/note/create-document", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add document.");
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
        className="bg-[var(--bg-1)] border border-[var(--border)] rounded-[var(--radius-lg)] w-[420px] max-h-[85vh] overflow-y-auto p-5 shadow-[var(--shadow-lg)] animate-[popIn_0.15s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-bright)]">
              <Paperclip size={14} />
            </span>
            Add document
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-2)] hover:text-[var(--text-0)] p-1 rounded-full hover:bg-[var(--bg-2)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 text-sm">
          <input ref={fileInputRef} type="file" hidden onChange={(e) => e.target.files?.[0] && handleFileChosen(e.target.files[0])} />

          {file ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border-soft)] bg-[var(--bg-2)] hover:border-[var(--border)] transition-colors text-left"
            >
              <span className="w-8 h-8 rounded-md bg-[var(--bg-3)] flex items-center justify-center text-[var(--text-1)] shrink-0">
                <FileIcon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] text-[var(--text-0)] truncate">{file.name}</span>
                <span className="block text-[11px] text-[var(--text-2)]">{formatBytes(file.size)} &middot; click to change</span>
              </span>
            </button>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1.5 px-3 py-6 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-0)] hover:border-[var(--accent-dim)] transition-colors"
            >
              <Paperclip size={18} />
              <span className="text-[12.5px]">Click to choose a file</span>
            </button>
          )}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${inputCls} text-[15px] font-medium`}
            placeholder="Document title…"
          />

          <div>
            <span className="text-[var(--text-1)] text-[11.5px] font-medium block mb-1.5">Type</span>
            <div className="flex flex-wrap gap-1.5">
              {typeOptions.map((t) => {
                const active = !customType && type === t;
                const color = colorForType(t, vault.types);
                return (
                  <button
                    key={t}
                    onClick={() => selectType(t)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all"
                    style={{
                      borderColor: active ? color : "var(--border-soft)",
                      background: active ? color + "20" : "var(--bg-2)",
                      color: active ? color : "var(--text-1)",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                    {t}
                    {active && <Check size={11} />}
                  </button>
                );
              })}
              <button
                onClick={() => setCustomType(true)}
                className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                  customType
                    ? "border-[var(--accent)] text-[var(--accent-bright)] bg-[var(--accent-soft)]"
                    : "border-dashed border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-0)]"
                }`}
              >
                + Custom
              </button>
            </div>
            {customType && (
              <input
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={`${inputCls} mt-2 w-full`}
                placeholder="Type name…"
                autoFocus
              />
            )}
          </div>

          {error && <div className="text-xs text-[var(--danger)]">{error}</div>}

          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 text-[11.5px] text-[var(--text-2)] hover:text-[var(--text-0)] transition-colors w-fit -mt-1"
          >
            <ChevronRight size={12} className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
            Advanced
          </button>

          {showAdvanced && (
            <div className="flex flex-col gap-3 pt-1 border-t border-[var(--border-soft)] animate-[fadeIn_0.12s_ease]">
              <label className="flex flex-col gap-1.5 pt-3">
                <span className="text-[var(--text-1)] text-[11.5px] font-medium">Folder (bundle-relative)</span>
                <input
                  value={dir}
                  onChange={(e) => {
                    setDir(e.target.value);
                    setDirTouched(true);
                  }}
                  className={inputCls}
                  placeholder="/documents"
                />
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
            </div>
          )}

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
              className="px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-gradient-to-b from-[var(--accent-bright)] to-[var(--accent-dim)] hover:brightness-110 text-[var(--accent-contrast)] disabled:opacity-60 shadow-[0_2px_8px_-2px_rgba(var(--accent-rgb),0.5)]"
            >
              {creating ? "Adding…" : "Add document"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
