import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getTemplate } from "@/lib/templates";
import { resolveInVault } from "@/lib/pathSafety";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { path?: string; templateId?: string };
  const targetPath = body.path?.trim();
  const templateId = body.templateId?.trim();

  if (!targetPath || !path.isAbsolute(targetPath)) {
    return NextResponse.json({ error: "An absolute folder path is required." }, { status: 400 });
  }
  const template = templateId ? getTemplate(templateId) : undefined;
  if (!template) {
    return NextResponse.json({ error: "Unknown template." }, { status: 400 });
  }

  try {
    if (fs.existsSync(targetPath)) {
      const existing = fs.readdirSync(targetPath).filter((f) => !f.startsWith("."));
      if (existing.length > 0) {
        return NextResponse.json({ error: "That folder already has files in it. Pick an empty or new folder." }, { status: 409 });
      }
    } else {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    for (const file of template.files) {
      const abs = resolveInVault(targetPath, file.path);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, file.content, "utf-8");
    }

    return NextResponse.json({ ok: true, path: targetPath });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
