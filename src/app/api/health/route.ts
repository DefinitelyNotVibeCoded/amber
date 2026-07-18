import { NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { loadVault } from "@/lib/okf";
import { loadSchema, schemaPathAbsolute } from "@/lib/schema";
import { scanHealth } from "@/lib/health";

export async function GET() {
  const root = getVaultPath();
  const vault = loadVault(root);
  const schema = loadSchema(root);
  return NextResponse.json({ ...scanHealth(vault, schema), schemaPath: schemaPathAbsolute(root) });
}
