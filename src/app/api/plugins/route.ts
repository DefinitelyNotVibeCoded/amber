import { NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { listPluginFiles, pluginsDirAbsolute } from "@/lib/plugins";

export async function GET() {
  const root = getVaultPath();
  return NextResponse.json({ plugins: listPluginFiles(root), pluginsDir: pluginsDirAbsolute(root) });
}
