"use client";

import { useEffect, useState } from "react";
import { Pencil, Save, X, ArrowUpRight, Sparkles } from "lucide-react";
import type { OkfNote, VaultData } from "@/lib/types";
import type { SemanticResult } from "@/lib/embeddings";
import { colorForType } from "@/lib/okfClient";
import MarkdownBody from "./MarkdownBody";
import AttachmentPreview from "./AttachmentPreview";

export default function NoteView({
  vault,
  note,
  onNavigate,
  onSaved,
  autoEdit,
  onAutoEditHandled,
}: {
  vault: VaultData;
  note: OkfNote | null;
  onNavigate: (path: string) => void;
  onSaved: () => Promise<void> | void;
  autoEdit?: boolean;
  onAutoEditHandled?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [baseVersion, setBaseVersion] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [loadingRaw, setLoadingRaw] = useState(false);
  const [related, setRelated] = useState<SemanticResult[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    setEditing(false);
    if (autoEdit && note) {
      startEdit();
      onAutoEditHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.path]);

  useEffect(() => {
    if (!note) {
      setRelated([]);
      return;
    }
    let cancelled = false;
    setLoadingRelated(true);
    fetch(`/api/search/semantic?path=${encodeURIComponent(note.path)}&topK=6`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setRelated(data.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRelated(false);
      });
    return () => {
      cancelled = true;
    };
  }, [note?.path]);

  if (!note) {
    return <div className="flex-1 flex items-center justify-center text-[var(--text-2)]">No note selected.</div>;
  }

  const backlinkNotes = vault.notes.filter((n) => note.backlinks.includes(n.path));
  const filteredRelated = related.filter((r) => !note.backlinks.includes(r.path));
  const hasType = Boolean(note.frontmatter.type);
  const typeColor = colorForType(note.frontmatter.type, vault.types);

  async function startEdit() {
    setLoadingRaw(true);
    try {
      const res = await fetch(`/api/note?path=${encodeURIComponent(note!.path)}`);
      const data = await res.json();
      setDraft(data.content ?? "");
      setBaseVersion(data.version);
      setEditing(true);
    } finally {
      setLoadingRaw(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: note!.path, content: draft, baseVersion }),
      });
      if (res.status === 409) {
        alert(
          "This note changed since you started editing it (likely an agent wrote to it). Your text was NOT saved, so nothing is lost. Cancel and reopen to get the latest version, then reapply your change."
        );
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Save failed.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setBaseVersion(data.version);
      await onSaved();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="h-12 shrink-0 border-b border-[var(--border-soft)] flex items-center px-6 gap-2">
        <span className="text-[12px] text-[var(--text-2)] font-mono truncate flex-1">{note.path}</span>
        {editing ? (
          <>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 text-[12.5px] px-2.5 py-1.5 rounded-full text-[var(--text-1)] hover:bg-[var(--bg-2)] transition-colors"
            >
              <X size={13} /> Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-full bg-gradient-to-b from-[var(--accent-bright)] to-[var(--accent-dim)] hover:brightness-110 text-[var(--accent-contrast)] font-medium disabled:opacity-60 shadow-[0_2px_8px_-2px_rgba(var(--accent-rgb),0.5)]"
            >
              <Save size={13} /> {saving ? "Saving…" : "Save"}
            </button>
          </>
        ) : (
          <button
            onClick={startEdit}
            disabled={loadingRaw}
            className="flex items-center gap-1.5 text-[12.5px] px-2.5 py-1.5 rounded-full text-[var(--text-1)] hover:bg-[var(--bg-2)] hover:text-[var(--text-0)] transition-colors"
          >
            <Pencil size={13} /> {loadingRaw ? "Loading…" : "Edit"}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto px-8 py-10" style={{ maxWidth: "var(--content-width)" }}>
          <h1 className="text-[26px] font-semibold tracking-tight mb-4">{note.title}</h1>

          {hasType && (
            <div
              className="mb-7 rounded-[var(--radius-lg)] bg-[var(--bg-1)] border border-[var(--border-soft)] p-4 flex flex-col gap-2.5 text-sm shadow-[var(--shadow-sm)] relative overflow-hidden"
              style={{ borderLeft: `3px solid ${typeColor}` }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold"
                  style={{ background: typeColor + "22", color: typeColor }}
                >
                  {note.frontmatter.type}
                </span>
                {(note.frontmatter.tags || []).map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.5 rounded text-[10.5px] bg-[var(--bg-2)] text-[var(--text-2)]"
                  >
                    #{t}
                  </span>
                ))}
                {note.frontmatter.timestamp && (
                  <span className="text-[11px] text-[var(--text-2)] ml-auto font-mono">
                    {new Date(note.frontmatter.timestamp).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
              {note.frontmatter.description && (
                <p className="text-[var(--text-1)] leading-relaxed">{note.frontmatter.description}</p>
              )}
              {note.frontmatter.resource && (
                <AttachmentPreview resource={note.frontmatter.resource} vaultRoot={vault.root} />
              )}
            </div>
          )}

          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              className="w-full h-[60vh] bg-[var(--bg-1)] border border-[var(--border-soft)] rounded-[var(--radius-md)] p-4 text-sm font-mono text-[var(--text-0)] outline-none focus:border-[var(--accent-dim)] resize-none leading-relaxed"
            />
          ) : (
            <MarkdownBody body={note.body} links={note.links} vault={vault} onNavigate={onNavigate} />
          )}

          {!editing && backlinkNotes.length > 0 && (
            <div className="mt-12 pt-6 border-t border-[var(--border-soft)]">
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-2)] mb-3">
                Linked from ({backlinkNotes.length})
              </h3>
              <div className="flex flex-col gap-0.5 -mx-2.5">
                {backlinkNotes.map((n) => (
                  <button
                    key={n.path}
                    onClick={() => onNavigate(n.path)}
                    className="flex items-center gap-1.5 text-left text-sm text-[var(--text-1)] hover:text-[var(--accent-bright)] hover:bg-[var(--bg-hover)] rounded-md px-2.5 py-1.5 transition-colors group"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: colorForType(n.frontmatter.type, vault.types) }}
                    />
                    {n.title}
                    <ArrowUpRight
                      size={12}
                      className="opacity-0 group-hover:opacity-60 transition-opacity ml-auto"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {!editing && (loadingRelated || filteredRelated.length > 0) && (
            <div className="mt-8 pt-6 border-t border-[var(--border-soft)]">
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-2)] mb-3 flex items-center gap-1.5">
                <Sparkles size={12} /> Related notes
              </h3>
              {loadingRelated && filteredRelated.length === 0 ? (
                <p className="text-sm text-[var(--text-2)] px-2.5">Finding related notes…</p>
              ) : (
                <div className="flex flex-col gap-0.5 -mx-2.5">
                  {filteredRelated.map((r) => (
                    <button
                      key={r.path}
                      onClick={() => onNavigate(r.path)}
                      className="flex items-center gap-1.5 text-left text-sm text-[var(--text-1)] hover:text-[var(--accent-bright)] hover:bg-[var(--bg-hover)] rounded-md px-2.5 py-1.5 transition-colors group"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: colorForType(r.type, vault.types) }}
                      />
                      {r.title}
                      <span className="text-[10.5px] font-mono text-[var(--text-2)] ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        {Math.round(r.score * 100)}%
                      </span>
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 group-hover:opacity-60 transition-opacity"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
