"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { OkfLink } from "@/lib/types";

export default function MarkdownBody({
  body,
  links,
  notePaths,
  onNavigate,
}: {
  body: string;
  links: OkfLink[];
  notePaths: Set<string>;
  onNavigate: (path: string) => void;
}) {
  const linkByRaw = new Map(links.map((l) => [l.raw, l]));

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const match = href ? linkByRaw.get(href) : undefined;
            if (match) {
              const exists = notePaths.has(match.target);
              return (
                <a
                  {...props}
                  href="#"
                  className={`internal-link ${exists ? "" : "broken"}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (exists) onNavigate(match.target);
                  }}
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
    </div>
  );
}
