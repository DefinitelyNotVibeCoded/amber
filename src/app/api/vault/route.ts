import { NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { loadVault } from "@/lib/okf";

export async function GET() {
  const root = getVaultPath();
  const vault = loadVault(root);
  return NextResponse.json(vault);
}
