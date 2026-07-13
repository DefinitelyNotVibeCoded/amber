import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { deleteNote, VaultOpError } from "@/lib/vaultOps";

export async function POST(req: NextRequest) {
  const { path: notePath } = (await req.json()) as { path?: string };
  if (!notePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  const root = getVaultPath();
  try {
    deleteNote(root, notePath);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e instanceof VaultOpError ? e.status : 400;
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status });
  }
}
