import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { setPluginEnabled } from "@/lib/plugins";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { filename?: string; enabled?: boolean };
  if (!body.filename || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Missing filename or enabled" }, { status: 400 });
  }
  setPluginEnabled(getVaultPath(), body.filename, body.enabled);
  return NextResponse.json({ ok: true });
}
