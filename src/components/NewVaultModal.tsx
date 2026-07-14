"use client";

import { useEffect, useState } from "react";
import { X, FolderPlus, FolderOpen, Check, Download, AlertTriangle } from "lucide-react";

interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  fileCount: number;
}

interface ImportSummary {
  notesConverted: number;
  attachmentsCopied: number;
  linksResolved: number;
  linksUnresolved: number;
  warnings: string[];
}

type Mode = "template" | "obsidian";

const inputCls =
  "bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] px-2.5 py-1.5 outline-none focus:border-[var(--accent-dim)] transition-colors text-[var(--text-0)] placeholder:text-[var(--text-2)] font-mono text-[12.5px]";

export default function NewVaultModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (path: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("template");
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templateId, setTemplateId] = useState<string>("second-brain");
  const [targetPath, setTargetPath] = useState("");
  const [sourcePath, setSourcePath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importedPath, setImportedPath] = useState<string | null>(null);
  const isElectron = typeof window !== "undefined" && Boolean(window.amber);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => {});
  }, []);

  async function browse(setter: (v: string) => void) {
    if (!window.amber) return;
    const picked = await window.amber.pickFolder();
    if (picked) setter(picked);
  }

  async function submitTemplate() {
    if (!targetPath.trim()) {
      setError("Pick a folder for the new vault.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/vault/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: targetPath.trim(), templateId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create vault.");
        return;
      }
      await switchTo(targetPath.trim());
    } finally {
      setCreating(false);
    }
  }

  async function submitImport() {
    if (!sourcePath.trim() || !targetPath.trim()) {
      setError("Pick both the Obsidian vault and a destination folder.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/vault/import-obsidian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePath: sourcePath.trim(), destPath: targetPath.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not import that vault.");
        return;
      }
      setImportSummary({
        notesConverted: data.notesConverted,
        attachmentsCopied: data.attachmentsCopied,
        linksResolved: data.linksResolved,
        linksUnresolved: data.linksUnresolved,
        warnings: data.warnings || [],
      });
      setImportedPath(targetPath.trim());
    } finally {
      setCreating(false);
    }
  }

  async function switchTo(path: string) {
    const switchRes = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultPath: path }),
    });
    if (!switchRes.ok) {
      const switchData = await switchRes.json();
      setError(switchData.error || "Vault created, but could not switch to it.");
      return;
    }
    onCreated(path);
  }

  if (importSummary && importedPath) {
    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-[60] animate-[fadeIn_0.12s_ease]"
        onClick={onClose}
      >
        <div
          className="bg-[var(--bg-1)] border border-[var(--border)] rounded-[var(--radius-lg)] w-[480px] max-h-[85vh] overflow-y-auto p-5 shadow-[var(--shadow-lg)] animate-[popIn_0.15s_ease]"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-[15px] font-semibold flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-bright)]">
              <Check size={14} />
            </span>
            Import complete
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] px-3 py-2.5">
              <div className="text-[20px] font-semibold text-[var(--text-0)]">{importSummary.notesConverted}</div>
              <div className="text-[11px] text-[var(--text-2)]">notes converted</div>
            </div>
            <div className="bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] px-3 py-2.5">
              <div className="text-[20px] font-semibold text-[var(--text-0)]">{importSummary.attachmentsCopied}</div>
              <div className="text-[11px] text-[var(--text-2)]">attachments copied</div>
            </div>
            <div className="bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] px-3 py-2.5">
              <div className="text-[20px] font-semibold text-[var(--accent-bright)]">{importSummary.linksResolved}</div>
              <div className="text-[11px] text-[var(--text-2)]">links resolved</div>
            </div>
            <div className="bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] px-3 py-2.5">
              <div
                className={`text-[20px] font-semibold ${
                  importSummary.linksUnresolved > 0 ? "text-[var(--danger)]" : "text-[var(--text-0)]"
                }`}
              >
                {importSummary.linksUnresolved}
              </div>
              <div className="text-[11px] text-[var(--text-2)]">links unresolved</div>
            </div>
          </div>

          {importSummary.warnings.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--text-1)] mb-1.5">
                <AlertTriangle size={12} className="text-[var(--danger)]" />
                Unresolved links became bold text, fix by hand if needed
              </div>
              <div className="bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] p-2.5 max-h-32 overflow-y-auto">
                {importSummary.warnings.map((w, i) => (
                  <div key={i} className="text-[11px] text-[var(--text-2)] font-mono py-0.5">
                    {w}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11.5px] text-[var(--text-2)] mb-4 leading-relaxed">
            Every note got a <code className="text-[var(--text-1)]">type: Note</code> (unless it already had one), OKF's
            only required field. Retype notes as <code className="text-[var(--text-1)]">Concept</code>,{" "}
            <code className="text-[var(--text-1)]">Person</code>, or anything else that fits as you go.
          </p>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-full text-[13px] text-[var(--text-1)] hover:bg-[var(--bg-2)] transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => switchTo(importedPath)}
              className="px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-gradient-to-b from-[var(--accent-bright)] to-[var(--accent-dim)] hover:brightness-110 text-[var(--accent-contrast)] shadow-[0_2px_8px_-2px_rgba(var(--accent-rgb),0.5)]"
            >
              Open vault
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-[60] animate-[fadeIn_0.12s_ease]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-1)] border border-[var(--border)] rounded-[var(--radius-lg)] w-[520px] max-h-[85vh] overflow-y-auto p-5 shadow-[var(--shadow-lg)] animate-[popIn_0.15s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-bright)]">
              <FolderPlus size={14} />
            </span>
            New vault
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-2)] hover:text-[var(--text-0)] p-1 rounded-full hover:bg-[var(--bg-2)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-0.5 bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-full p-0.5 w-fit mb-4">
          <button
            onClick={() => {
              setMode("template");
              setError(null);
            }}
            className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
              mode === "template" ? "bg-[var(--accent-dim)] text-[var(--accent-contrast)]" : "text-[var(--text-1)]"
            }`}
          >
            Start fresh
          </button>
          <button
            onClick={() => {
              setMode("obsidian");
              setError(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
              mode === "obsidian" ? "bg-[var(--accent-dim)] text-[var(--accent-contrast)]" : "text-[var(--text-1)]"
            }`}
          >
            <Download size={11} /> Import from Obsidian
          </button>
        </div>

        {mode === "template" ? (
          <>
            <p className="text-[12px] text-[var(--text-2)] mb-4 leading-relaxed">
              These are starting points, not requirements. OKF only requires{" "}
              <code className="text-[var(--text-1)]">type</code> in frontmatter. The structure that fits will come
              from how you actually use the vault, not from what you pick now.
            </p>

            <div className="flex flex-col gap-2 mb-4">
              {templates.map((t) => {
                const active = templateId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`text-left px-3 py-2.5 rounded-[var(--radius-sm)] border transition-colors flex items-start gap-2.5 ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--border-soft)] bg-[var(--bg-2)] hover:border-[var(--border)]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        active ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border)]"
                      }`}
                    >
                      {active && <Check size={11} className="text-[var(--accent-contrast)]" />}
                    </span>
                    <span>
                      <span className="block text-[13px] font-medium text-[var(--text-0)]">{t.name}</span>
                      <span className="block text-[11.5px] text-[var(--text-2)]">{t.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="flex flex-col gap-1.5 text-sm mb-1">
              <span className="text-[var(--text-1)] text-[11.5px] font-medium">Folder (empty or new)</span>
              <div className="flex gap-2">
                <input
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder="C:\Users\you\Documents\my-vault"
                />
                {isElectron && (
                  <button
                    onClick={() => browse(setTargetPath)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[12.5px] text-[var(--text-1)] bg-[var(--bg-2)] border border-[var(--border-soft)] hover:text-[var(--text-0)] transition-colors shrink-0"
                  >
                    <FolderOpen size={13} /> Browse
                  </button>
                )}
              </div>
            </label>

            {error && <div className="text-xs text-[var(--danger)] mt-2">{error}</div>}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-full text-[13px] text-[var(--text-1)] hover:bg-[var(--bg-2)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitTemplate}
                disabled={creating}
                className="px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-gradient-to-b from-[var(--accent-bright)] to-[var(--accent-dim)] hover:brightness-110 text-[var(--accent-contrast)] disabled:opacity-60 shadow-[0_2px_8px_-2px_rgba(var(--accent-rgb),0.5)]"
              >
                {creating ? "Creating…" : "Create vault"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[12px] text-[var(--text-2)] mb-4 leading-relaxed">
              Point Amber at an existing Obsidian vault. It copies every note into a new folder,
              converts <code className="text-[var(--text-1)]">[[wiki-links]]</code> and{" "}
              <code className="text-[var(--text-1)]">![[embeds]]</code> to OKF-style markdown links, and adds{" "}
              <code className="text-[var(--text-1)]">type: Note</code> to anything that doesn't already have a
              type. Your original Obsidian vault is never touched.
            </p>

            <label className="flex flex-col gap-1.5 text-sm mb-3">
              <span className="text-[var(--text-1)] text-[11.5px] font-medium">Obsidian vault (existing folder)</span>
              <div className="flex gap-2">
                <input
                  value={sourcePath}
                  onChange={(e) => setSourcePath(e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder="C:\Users\you\Documents\My Obsidian Vault"
                />
                {isElectron && (
                  <button
                    onClick={() => browse(setSourcePath)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[12.5px] text-[var(--text-1)] bg-[var(--bg-2)] border border-[var(--border-soft)] hover:text-[var(--text-0)] transition-colors shrink-0"
                  >
                    <FolderOpen size={13} /> Browse
                  </button>
                )}
              </div>
            </label>

            <label className="flex flex-col gap-1.5 text-sm mb-1">
              <span className="text-[var(--text-1)] text-[11.5px] font-medium">New Amber vault (empty or new folder)</span>
              <div className="flex gap-2">
                <input
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder="C:\Users\you\Documents\my-amber-vault"
                />
                {isElectron && (
                  <button
                    onClick={() => browse(setTargetPath)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[12.5px] text-[var(--text-1)] bg-[var(--bg-2)] border border-[var(--border-soft)] hover:text-[var(--text-0)] transition-colors shrink-0"
                  >
                    <FolderOpen size={13} /> Browse
                  </button>
                )}
              </div>
            </label>

            {error && <div className="text-xs text-[var(--danger)] mt-2">{error}</div>}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-full text-[13px] text-[var(--text-1)] hover:bg-[var(--bg-2)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitImport}
                disabled={creating}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-gradient-to-b from-[var(--accent-bright)] to-[var(--accent-dim)] hover:brightness-110 text-[var(--accent-contrast)] disabled:opacity-60 shadow-[0_2px_8px_-2px_rgba(var(--accent-rgb),0.5)]"
              >
                <Download size={13} /> {creating ? "Importing…" : "Import vault"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
