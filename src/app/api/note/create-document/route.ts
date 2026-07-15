import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { createDocumentNote, VaultOpError } from "@/lib/vaultOps";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const dir = String(form.get("dir") || "/");
  const type = String(form.get("type") || "").trim();
  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "").trim();
  const tags = String(form.get("tags") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const root = getVaultPath();
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await createDocumentNote(root, {
      dir,
      type,
      title,
      description,
      tags,
      originalFilename: file.name,
      buffer,
    });
    return NextResponse.json({ ok: true, path: result.path, resourcePath: result.resourcePath });
  } catch (e) {
    const status = e instanceof VaultOpError ? e.status : 400;
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status });
  }
}
