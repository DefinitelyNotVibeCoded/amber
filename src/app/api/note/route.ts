import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { readNoteRaw, writeNoteRaw, VaultOpError } from "@/lib/vaultOps";

export async function GET(req: NextRequest) {
  const notePath = req.nextUrl.searchParams.get("path");
  if (!notePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  const root = getVaultPath();
  try {
    const content = readNoteRaw(root, notePath);
    return NextResponse.json({ path: notePath, content });
  } catch (e) {
    const status = e instanceof VaultOpError ? e.status : 404;
    return NextResponse.json({ error: "Not found" }, { status });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { path: notePath, content } = body as { path?: string; content?: string };
  if (!notePath || typeof content !== "string") {
    return NextResponse.json({ error: "Missing path or content" }, { status: 400 });
  }
  const root = getVaultPath();
  try {
    writeNoteRaw(root, notePath, content);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e instanceof VaultOpError ? e.status : 400;
    return NextResponse.json({ error: String(e) }, { status });
  }
}
