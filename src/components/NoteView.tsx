"use client";

import { useEffect, useState } from "react";
import { Pencil, Save, X, Link2, ArrowUpRight } from "lucide-react";
import type { OkfNote, VaultData } from "@/lib/types";
import { colorForType } from "@/lib/okfClient";
import MarkdownBody from "./MarkdownBody";

export default function NoteView({
  vault,
  note,
  onNavigate,
  onSaved,
}: {
  vault: VaultData;
  note: OkfNote | null;
  onNavigate: (path: string) => void;
  onSaved: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingRaw, setLoadingRaw] = useState(false);

  useEffect(() => {
    setEditing(false);
  }, [note?.path]);

  if (!note) {
    return <div className="flex-1 flex items-center justify-center text-[var(--text-2)]">No note selected.</div>;
  }

  const notePaths = new Set(vault.notes.map((n) => n.path));
  const backlinkNotes = vault.notes.filter((n) => note.backlinks.includes(n.path));
  const hasType = Boolean(note.frontmatter.type);
  const typeColor = colorForType(note.frontmatter.type, vault.types);

  async function startEdit() {
    setLoadingRaw(true);
    try {
      const res = await fetch(`/api/note?path=${encodeURIComponent(note!.path)}`);
      const data = await res.json();
      setDraft(data.content ?? "");
      setEditing(true);
    } finally {
      setLoadingRaw(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: note!.path, content: draft }),
      });
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
        <div className="max-w-3xl mx-auto px-8 py-10">
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
                <a
                  href={note.frontmatter.resource}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs external-link w-fit"
                >
                  <Link2 size={12} /> {note.frontmatter.resource}
                </a>
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
            <MarkdownBody body={note.body} links={note.links} notePaths={notePaths} onNavigate={onNavigate} />
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
        </div>
      </div>
    </div>
  );
}
