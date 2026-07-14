import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getVaultPath } from "@/lib/config";
import { resolveInVault } from "@/lib/pathSafety";
import { extOf, mimeForExt } from "@/lib/attachments";

export async function GET(req: NextRequest) {
  const attachmentPath = req.nextUrl.searchParams.get("path");
  if (!attachmentPath || !attachmentPath.startsWith("/attachments/")) {
    return NextResponse.json({ error: "Invalid attachment path" }, { status: 400 });
  }

  const root = getVaultPath();
  try {
    const abs = resolveInVault(root, attachmentPath);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const buffer = fs.readFileSync(abs);
    const mime = mimeForExt(extOf(attachmentPath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachmentPath.split("/").pop() || "file")}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
