import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { VaultOpError } from "@/lib/vaultOps";
import { restoreFromTrash } from "@/lib/trash";

export async function POST(req: NextRequest) {
  const { trashId } = (await req.json()) as { trashId?: string };
  if (!trashId) {
    return NextResponse.json({ error: "Missing trashId" }, { status: 400 });
  }
  const root = getVaultPath();
  try {
    const { restored } = restoreFromTrash(root, trashId);
    return NextResponse.json({ ok: true, restored });
  } catch (e) {
    const status = e instanceof VaultOpError ? e.status : 400;
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status });
  }
}
