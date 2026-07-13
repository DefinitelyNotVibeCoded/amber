import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { getActivityLogEntry, markActivityLogEntryReverted } from "@/lib/activityLog";
import { writeNoteRaw, deleteNote, noteExists, VaultOpError } from "@/lib/vaultOps";

export async function POST(req: NextRequest) {
  const { id } = (await req.json()) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const root = getVaultPath();
  const entry = getActivityLogEntry(root, id);
  if (!entry) {
    return NextResponse.json({ error: "Log entry not found" }, { status: 404 });
  }
  if (entry.revertedAt) {
    return NextResponse.json({ error: "Already reverted" }, { status: 409 });
  }

  try {
    if (entry.before === null) {
      if (noteExists(root, entry.path)) deleteNote(root, entry.path);
    } else {
      writeNoteRaw(root, entry.path, entry.before);
    }
    markActivityLogEntryReverted(root, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e instanceof VaultOpError ? e.status : 400;
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status });
  }
}
