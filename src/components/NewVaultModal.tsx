"use client";

import { useEffect, useState } from "react";
import { X, FolderPlus, FolderOpen, Check } from "lucide-react";

interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  fileCount: number;
}

const inputCls =
  "bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] px-2.5 py-1.5 outline-none focus:border-[var(--accent-dim)] transition-colors text-[var(--text-0)] placeholder:text-[var(--text-2)] font-mono text-[12.5px]";

export default function NewVaultModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (path: string) => void;
}) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templateId, setTemplateId] = useState<string>("second-brain");
  const [targetPath, setTargetPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const isElectron = typeof window !== "undefined" && Boolean(window.amber);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => {});
  }, []);

  async function browse() {
    if (!window.amber) return;
    const picked = await window.amber.pickFolder();
    if (picked) setTargetPath(picked);
  }

  async function submit() {
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
      const switchRes = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultPath: targetPath.trim() }),
      });
      if (!switchRes.ok) {
        const switchData = await switchRes.json();
        setError(switchData.error || "Vault created, but could not switch to it.");
        return;
      }
      onCreated(targetPath.trim());
    } finally {
      setCreating(false);
    }
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
        <div className="flex items-center justify-between mb-2">
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
        <p className="text-[12px] text-[var(--text-2)] mb-4 leading-relaxed">
          These are starting points, not requirements. OKF only requires <code className="text-[var(--text-1)]">type</code> in
          frontmatter. The structure that fits will come from how you actually use the vault, not from what you pick now.
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
                  {active && <Check size={11} className="text-[#1b1a17]" />}
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
                onClick={browse}
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
            onClick={submit}
            disabled={creating}
            className="px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-gradient-to-b from-[var(--accent-bright)] to-[var(--accent-dim)] hover:brightness-110 text-[#211a0d] disabled:opacity-60 shadow-[0_2px_8px_-2px_rgba(227,170,74,0.5)]"
          >
            {creating ? "Creating…" : "Create vault"}
          </button>
        </div>
      </div>
    </div>
  );
}
