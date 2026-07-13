import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { deleteSavedView } from "@/lib/savedViews";

export async function POST(req: NextRequest) {
  const { id } = (await req.json()) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const root = getVaultPath();
  deleteSavedView(root, id);
  return NextResponse.json({ ok: true });
}
