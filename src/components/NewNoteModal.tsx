"use client";

import { useEffect, useMemo, useState } from "react";
import { X, FilePlus2, ChevronRight, Check, FolderOpen } from "lucide-react";
import type { VaultData } from "@/lib/types";
import { colorForType } from "@/lib/okfClient";
import { folderForType } from "@/lib/noteTemplates";

interface TemplateInfo {
  filename: string;
  name: string;
}

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
  const [type, setType] = useState(vault.types[0] || "Concept");
  const [customType, setCustomType] = useState(false);
  const [title, setTitle] = useState("");
  const [dir, setDir] = useState(folderForType(vault.types[0] || "Concept"));
  const [dirTouched, setDirTouched] = useState(false);
  const [filename, setFilename] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [templatesDir, setTemplatesDir] = useState<string>("");
  const [template, setTemplate] = useState<string>(""); // "" = type default

  useEffect(() => {
    fetch("/api/note-templates")
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates ?? []);
        setTemplatesDir(d.dir ?? "");
      })
      .catch(() => {});
  }, []);

  const typeOptions = useMemo(() => vault.types, [vault.types]);

  function selectType(t: string) {
    setType(t);
    setCustomType(false);
    if (!dirTouched) setDir(folderForType(t));
  }

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
          template: template || undefined,
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
        className="bg-[var(--bg-1)] border border-[var(--border)] rounded-[var(--radius-lg)] w-[420px] max-h-[85vh] overflow-y-auto p-5 shadow-[var(--shadow-lg)] animate-[popIn_0.15s_ease]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !(e.target as HTMLElement).closest("textarea")) {
            e.preventDefault();
            if (!creating) submit();
          }
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-bright)]">
              <FilePlus2 size={14} />
            </span>
            New note
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-2)] hover:text-[var(--text-0)] p-1 rounded-full hover:bg-[var(--bg-2)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 text-sm">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${inputCls} text-[15px] font-medium`}
            placeholder="Note title…"
            autoFocus
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[var(--text-1)] text-[11.5px] font-medium">Template</span>
              {templatesDir && typeof window !== "undefined" && window.amber && (
                <button
                  onClick={() => window.amber?.revealInFolder(templatesDir)}
                  className="flex items-center gap-1 text-[10.5px] text-[var(--text-2)] hover:text-[var(--text-0)] transition-colors"
                  title="Templates are editable markdown files in .amber/templates"
                >
                  <FolderOpen size={11} /> Edit templates
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setTemplate("")}
                className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                  template === ""
                    ? "border-[var(--accent)] text-[var(--accent-bright)] bg-[var(--accent-soft)]"
                    : "border-[var(--border-soft)] text-[var(--text-1)] bg-[var(--bg-2)] hover:text-[var(--text-0)]"
                }`}
              >
                Type default
              </button>
              {templates.map((t) => {
                const active = template === t.filename;
                return (
                  <button
                    key={t.filename}
                    onClick={() => setTemplate(t.filename)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                      active
                        ? "border-[var(--accent)] text-[var(--accent-bright)] bg-[var(--accent-soft)]"
                        : "border-[var(--border-soft)] text-[var(--text-1)] bg-[var(--bg-2)] hover:text-[var(--text-0)]"
                    }`}
                  >
                    {t.name}
                    {active && <Check size={11} />}
                  </button>
                );
              })}
            </div>
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
                  placeholder="/concepts"
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
                  placeholder="my-note.md"
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
              {creating ? "Creating…" : "Create note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
