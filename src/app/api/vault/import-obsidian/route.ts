import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { importObsidianVault } from "@/lib/obsidianImport";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { sourcePath?: string; destPath?: string };
  const sourcePath = body.sourcePath?.trim();
  const destPath = body.destPath?.trim();

  if (!sourcePath || !path.isAbsolute(sourcePath)) {
    return NextResponse.json({ error: "An absolute source vault path is required." }, { status: 400 });
  }
  if (!destPath || !path.isAbsolute(destPath)) {
    return NextResponse.json({ error: "An absolute destination folder is required." }, { status: 400 });
  }
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
    return NextResponse.json({ error: "Source folder does not exist." }, { status: 400 });
  }
  if (path.resolve(sourcePath) === path.resolve(destPath)) {
    return NextResponse.json({ error: "Source and destination must be different folders." }, { status: 400 });
  }

  try {
    if (fs.existsSync(destPath)) {
      const existing = fs.readdirSync(destPath).filter((f) => !f.startsWith("."));
      if (existing.length > 0) {
        return NextResponse.json({ error: "That folder already has files in it. Pick an empty or new folder." }, { status: 409 });
      }
    } else {
      fs.mkdirSync(destPath, { recursive: true });
    }

    const result = importObsidianVault(sourcePath, destPath);
    return NextResponse.json({ ok: true, path: destPath, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
