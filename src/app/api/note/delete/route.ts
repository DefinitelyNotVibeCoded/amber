import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { getVaultPath } from "@/lib/config";
import { readNoteRaw, VaultOpError } from "@/lib/vaultOps";
import { moveToTrash } from "@/lib/trash";
import { loadVault } from "@/lib/okf";
import { isLocalResource } from "@/lib/attachments";

export async function POST(req: NextRequest) {
  const { path: notePath } = (await req.json()) as { path?: string };
  if (!notePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  const root = getVaultPath();
  try {
    let resource: string | undefined;
    let title: string | undefined;
    try {
      const parsed = matter(readNoteRaw(root, notePath));
      resource = (parsed.data || {}).resource;
      title = (parsed.data || {}).title;
    } catch {
      // note unreadable or already gone; nothing extra to clean up
    }

    // Include the note's attachment in the same trash entry if nothing else references it, so a
    // restore brings the note and its file back together.
    const files = [notePath];
    if (resource && isLocalResource(resource)) {
      const stillReferenced = loadVault(root).notes.some(
        (n) => n.path !== notePath && n.frontmatter.resource === resource
      );
      if (!stillReferenced) files.push(resource);
    }

    const entry = moveToTrash(root, files, { title });
    return NextResponse.json({ ok: true, trashId: entry.id });
  } catch (e) {
    const status = e instanceof VaultOpError ? e.status : 400;
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status });
  }
}
