import { NextResponse } from "next/server";
import { VAULT_TEMPLATES } from "@/lib/templates";

export async function GET() {
  const templates = VAULT_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    fileCount: t.files.length,
  }));
  return NextResponse.json({ templates });
}
