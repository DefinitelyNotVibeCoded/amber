import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import matter from "gray-matter";
import { getVaultPath } from "@/lib/config";
import { deleteNote, readNoteRaw, VaultOpError } from "@/lib/vaultOps";
import { loadVault } from "@/lib/okf";
import { resolveInVault } from "@/lib/pathSafety";
import { isLocalResource } from "@/lib/attachments";

export async function POST(req: NextRequest) {
  const { path: notePath } = (await req.json()) as { path?: string };
  if (!notePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  const root = getVaultPath();
  try {
    let resource: string | undefined;
    try {
      resource = (matter(readNoteRaw(root, notePath)).data || {}).resource;
    } catch {
      // note unreadable or already gone; nothing to clean up
    }

    deleteNote(root, notePath);

    if (resource && isLocalResource(resource)) {
      const stillReferenced = loadVault(root).notes.some((n) => n.frontmatter.resource === resource);
      if (!stillReferenced) {
        const attachmentAbs = resolveInVault(root, resource);
        if (fs.existsSync(attachmentAbs)) fs.unlinkSync(attachmentAbs);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e instanceof VaultOpError ? e.status : 400;
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status });
  }
}
