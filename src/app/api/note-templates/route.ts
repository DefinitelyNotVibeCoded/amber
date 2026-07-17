import { NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { listTemplates, templatesDirAbsolute } from "@/lib/userTemplates";

export async function GET() {
  const root = getVaultPath();
  return NextResponse.json({ templates: listTemplates(root), dir: templatesDirAbsolute(root) });
}
