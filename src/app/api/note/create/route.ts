import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { createNote, VaultOpError, type CreateNoteParams } from "@/lib/vaultOps";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateNoteParams;
  const root = getVaultPath();
  try {
    const result = createNote(root, body);
    return NextResponse.json({ ok: true, path: result.path });
  } catch (e) {
    const status = e instanceof VaultOpError ? e.status : 400;
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status });
  }
}
