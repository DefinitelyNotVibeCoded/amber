import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { readNoteRaw, writeNoteRaw, versionOf, VaultOpError } from "@/lib/vaultOps";

export async function GET(req: NextRequest) {
  const notePath = req.nextUrl.searchParams.get("path");
  if (!notePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  const root = getVaultPath();
  try {
    const content = readNoteRaw(root, notePath);
    return NextResponse.json({ path: notePath, content, version: versionOf(content) });
  } catch (e) {
    const status = e instanceof VaultOpError ? e.status : 404;
    return NextResponse.json({ error: "Not found" }, { status });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { path: notePath, content, baseVersion } = body as {
    path?: string;
    content?: string;
    baseVersion?: string;
  };
  if (!notePath || typeof content !== "string") {
    return NextResponse.json({ error: "Missing path or content" }, { status: 400 });
  }
  const root = getVaultPath();
  try {
    const version = writeNoteRaw(root, notePath, content, baseVersion);
    return NextResponse.json({ ok: true, version });
  } catch (e) {
    const status = e instanceof VaultOpError ? e.status : 400;
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status });
  }
}
