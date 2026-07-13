import { NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { readActivityLog } from "@/lib/activityLog";

export async function GET() {
  const root = getVaultPath();
  const entries = readActivityLog(root).slice().reverse();
  return NextResponse.json({ entries });
}
