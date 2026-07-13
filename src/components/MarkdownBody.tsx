"use client";

import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { OkfLink, OkfNote, VaultData } from "@/lib/types";
import { colorForType } from "@/lib/okfClient";

const HOVER_DELAY_MS = 250;

function LinkPreview({ note, vault, x, y }: { note: OkfNote; vault: VaultData; x: number; y: number }) {
  const typeColor = colorForType(note.frontmatter.type, vault.types);
  const snippet = note.body
    .replace(/^#.+$/m, "")
    .replace(/[#*`_>]/g, "")
    .trim()
    .slice(0, 160);

  return (
    <div
      style={{ position: "fixed", left: x, top: y, zIndex: 150 }}
      className="w-72 pointer-events-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-1)] shadow-[var(--shadow-lg)] p-3.5 animate-[popIn_0.12s_ease]"
    >
      <div className="flex items-center gap-2 mb-1.5">
        {note.frontmatter.type && (
          <span
            className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold shrink-0"
            style={{ background: typeColor + "22", color: typeColor }}
          >
            {note.frontmatter.type}
          </span>
        )}
        <span className="text-[12.5px] font-medium text-[var(--text-0)] truncate">{note.title}</span>
      </div>
      {note.frontmatter.description ? (
        <p className="text-[12px] text-[var(--text-1)] leading-relaxed line-clamp-3">
          {note.frontmatter.description}
        </p>
      ) : snippet ? (
        <p className="text-[12px] text-[var(--text-2)] leading-relaxed line-clamp-3">{snippet}…</p>
      ) : (
        <p className="text-[12px] text-[var(--text-2)] italic">Empty note.</p>
      )}
    </div>
  );
}

export default function MarkdownBody({
  body,
  links,
  vault,
  onNavigate,
}: {
  body: string;
  links: OkfLink[];
  vault: VaultData;
  onNavigate: (path: string) => void;
}) {
  const linkByRaw = useMemo(() => new Map(links.map((l) => [l.raw, l])), [links]);
  const notesByPath = useMemo(() => new Map(vault.notes.map((n) => [n.path, n])), [vault.notes]);
  const [preview, setPreview] = useState<{ note: OkfNote; x: number; y: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearHoverTimer() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function handleEnter(e: React.MouseEvent<HTMLAnchorElement>, targetPath: string) {
    const note = notesByPath.get(targetPath);
    if (!note) return;
    const rect = e.currentTarget.getBoundingClientRect();
    clearHoverTimer();
    timeoutRef.current = setTimeout(() => {
      const x = Math.min(rect.left, window.innerWidth - 300);
      const y = rect.bottom + 8 + 160 > window.innerHeight ? rect.top - 8 - 130 : rect.bottom + 8;
      setPreview({ note, x, y });
    }, HOVER_DELAY_MS);
  }

  function handleLeave() {
    clearHoverTimer();
    setPreview(null);
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const match = href ? linkByRaw.get(href) : undefined;
            if (match) {
              const exists = notesByPath.has(match.target);
              return (
                <a
                  {...props}
                  href="#"
                  className={`internal-link ${exists ? "" : "broken"}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (exists) onNavigate(match.target);
                  }}
                  onMouseEnter={exists ? (e) => handleEnter(e, match.target) : undefined}
                  onMouseLeave={exists ? handleLeave : undefined}
                  title={exists ? match.target : `${match.target} (not found)`}
                >
                  {children}
                </a>
              );
            }
            return (
              <a {...props} href={href} className="external-link" target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {body || "*This note is empty.*"}
      </ReactMarkdown>

      {preview && <LinkPreview note={preview.note} vault={vault} x={preview.x} y={preview.y} />}
    </div>
  );
}
