"use client";

import { ExternalLink, FolderOpen, File as FileIcon } from "lucide-react";
import { extOf, isImageExt, isLocalResource } from "@/lib/attachments";

export default function AttachmentPreview({ resource, vaultRoot }: { resource: string; vaultRoot: string }) {
  if (!isLocalResource(resource)) {
    return (
      <a href={resource} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs external-link w-fit">
        <ExternalLink size={12} /> {resource}
      </a>
    );
  }

  const url = `/api/attachment?path=${encodeURIComponent(resource)}`;
  const filename = resource.split("/").pop() || resource;
  const ext = extOf(filename);

  if (isImageExt(ext)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block w-fit max-w-full">
        <img
          src={url}
          alt={filename}
          className="max-h-72 rounded-[var(--radius-sm)] border border-[var(--border-soft)] shadow-[var(--shadow-sm)]"
        />
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border-soft)] bg-[var(--bg-2)] w-fit max-w-full">
      <span className="w-8 h-8 rounded-md bg-[var(--bg-3)] flex items-center justify-center text-[var(--text-1)] shrink-0">
        <FileIcon size={15} />
      </span>
      <span className="min-w-0 text-[13px] text-[var(--text-0)] truncate">{filename}</span>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 text-[11.5px] text-[var(--accent-bright)] hover:underline shrink-0 ml-1"
      >
        <ExternalLink size={11} /> Open
      </a>
      {typeof window !== "undefined" && window.amber && (
        <button
          onClick={() => window.amber?.revealInFolder(`${vaultRoot}${resource}`.replace(/\//g, "\\"))}
          className="flex items-center gap-1 text-[11.5px] text-[var(--text-2)] hover:text-[var(--text-0)] shrink-0"
        >
          <FolderOpen size={11} /> Reveal
        </button>
      )}
    </div>
  );
}
