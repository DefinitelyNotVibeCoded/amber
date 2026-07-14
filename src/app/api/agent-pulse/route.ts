import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { readAgentPulseSince } from "@/lib/agentPulse";

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get("since");
  const root = getVaultPath();
  const events = readAgentPulseSince(root, since);
  return NextResponse.json({ events, now: new Date().toISOString() });
}
