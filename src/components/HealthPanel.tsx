"use client";

import { useEffect, useState } from "react";
import { X, Stethoscope, Unlink, Unplug, ShieldAlert, CheckCircle2, FolderOpen, ArrowUpRight } from "lucide-react";

interface BrokenLink {
  from: string;
  fromTitle: string;
  target: string;
  text: string;
}
interface OrphanNote {
  path: string;
  title: string;
  type?: string;
}
interface SchemaIssue {
  path: string;
  title: string;
  type?: string;
  missing: string[];
  unknown: string[];
}
interface Health {
  brokenLinks: BrokenLink[];
  orphans: OrphanNote[];
  schemaIssues: SchemaIssue[];
  counts: { brokenLinks: number; orphans: number; schemaIssues: number; total: number };
  schemaPath: string;
}

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-1">
      <span className="text-[var(--text-2)]">{icon}</span>
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-1)]">{label}</h3>
      <span className="text-[11px] text-[var(--text-2)] bg-[var(--bg-2)] rounded-full px-2 py-0.5">{count}</span>
    </div>
  );
}

function NoteLink({ path, title, onNavigate }: { path: string; title: string; onNavigate: (p: string) => void }) {
  return (
    <button
      onClick={() => onNavigate(path)}
      className="flex items-center gap-1.5 text-left text-[13px] text-[var(--text-1)] hover:text-[var(--accent-bright)] hover:bg-[var(--bg-hover)] rounded-md px-2 py-1.5 transition-colors group w-full"
    >
      <span className="truncate">{title}</span>
      <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-60 transition-opacity ml-auto shrink-0" />
    </button>
  );
}

export default function HealthPanel({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const allClear = health && health.counts.total === 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-[fadeIn_0.12s_ease]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-1)] border border-[var(--border)] rounded-[var(--radius-lg)] w-[560px] h-[600px] shadow-[var(--shadow-lg)] animate-[popIn_0.15s_ease] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)]">
          <h2 className="text-[15px] font-semibold flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-bright)]">
              <Stethoscope size={14} />
            </span>
            Vault health
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-2)] hover:text-[var(--text-0)] p-1 rounded-full hover:bg-[var(--bg-2)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {health === null && <p className="text-[12.5px] text-[var(--text-2)]">Scanning…</p>}

          {allClear && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-10">
              <CheckCircle2 size={28} className="text-emerald-400" />
              <p className="text-[13px] text-[var(--text-1)] max-w-[320px]">
                Vault is healthy. No broken links, orphaned notes, or schema issues.
              </p>
            </div>
          )}

          {health && health.counts.total > 0 && (
            <div className="flex flex-col gap-5">
              {health.brokenLinks.length > 0 && (
                <div>
                  <SectionHeader icon={<Unlink size={14} />} label="Broken links" count={health.brokenLinks.length} />
                  <p className="text-[11.5px] text-[var(--text-2)] mb-1.5">Links pointing at a note that does not exist.</p>
                  <div className="flex flex-col gap-0.5">
                    {health.brokenLinks.map((b, i) => (
                      <button
                        key={i}
                        onClick={() => onNavigate(b.from)}
                        className="flex items-center gap-2 text-left rounded-md px-2 py-1.5 hover:bg-[var(--bg-hover)] transition-colors group w-full"
                      >
                        <span className="text-[13px] text-[var(--text-1)] group-hover:text-[var(--accent-bright)] truncate">
                          {b.fromTitle}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--danger)] truncate ml-auto shrink-0">{b.target}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {health.schemaIssues.length > 0 && (
                <div>
                  <SectionHeader icon={<ShieldAlert size={14} />} label="Schema issues" count={health.schemaIssues.length} />
                  <p className="text-[11.5px] text-[var(--text-2)] mb-1.5 flex items-center gap-1.5">
                    Notes missing required fields or using unexpected ones.
                    {typeof window !== "undefined" && window.amber && (
                      <button
                        onClick={() => window.amber?.revealInFolder(health.schemaPath)}
                        className="inline-flex items-center gap-1 text-[var(--text-1)] hover:text-[var(--accent-bright)]"
                      >
                        <FolderOpen size={11} /> edit rules
                      </button>
                    )}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {health.schemaIssues.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => onNavigate(s.path)}
                        className="flex flex-col text-left rounded-md px-2 py-1.5 hover:bg-[var(--bg-hover)] transition-colors group w-full"
                      >
                        <span className="text-[13px] text-[var(--text-1)] group-hover:text-[var(--accent-bright)] truncate">
                          {s.title} <span className="text-[var(--text-2)]">({s.type})</span>
                        </span>
                        <span className="text-[11px] text-[var(--text-2)]">
                          {s.missing.length > 0 && <span className="text-[var(--danger)]">missing: {s.missing.join(", ")}</span>}
                          {s.missing.length > 0 && s.unknown.length > 0 && " · "}
                          {s.unknown.length > 0 && <span>unexpected: {s.unknown.join(", ")}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {health.orphans.length > 0 && (
                <div>
                  <SectionHeader icon={<Unplug size={14} />} label="Orphaned notes" count={health.orphans.length} />
                  <p className="text-[11.5px] text-[var(--text-2)] mb-1.5">Notes that nothing else links to.</p>
                  <div className="flex flex-col gap-0.5">
                    {health.orphans.map((o) => (
                      <NoteLink key={o.path} path={o.path} title={o.title} onNavigate={onNavigate} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
