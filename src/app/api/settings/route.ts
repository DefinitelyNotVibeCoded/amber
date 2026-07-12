import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { getVaultPath, setVaultPath } from "@/lib/config";

export async function GET() {
  return NextResponse.json({ vaultPath: getVaultPath() });
}

export async function POST(req: NextRequest) {
  const { vaultPath } = (await req.json()) as { vaultPath?: string };
  if (!vaultPath) {
    return NextResponse.json({ error: "Missing vaultPath" }, { status: 400 });
  }
  if (!fs.existsSync(vaultPath)) {
    return NextResponse.json({ error: "Directory does not exist" }, { status: 400 });
  }
  setVaultPath(vaultPath);
  return NextResponse.json({ ok: true, vaultPath });
}
