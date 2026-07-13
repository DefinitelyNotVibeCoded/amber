import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { renameNote, VaultOpError } from "@/lib/vaultOps";

export async function POST(req: NextRequest) {
  const { fromPath, toPath } = (await req.json()) as { fromPath?: string; toPath?: string };
  if (!fromPath || !toPath) {
    return NextResponse.json({ error: "Missing fromPath or toPath" }, { status: 400 });
  }
  const root = getVaultPath();
  try {
    const result = renameNote(root, fromPath, toPath);
    return NextResponse.json({ ok: true, path: result.path });
  } catch (e) {
    const status = e instanceof VaultOpError ? e.status : 400;
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status });
  }
}
