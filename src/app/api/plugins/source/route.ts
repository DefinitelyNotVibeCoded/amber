import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { readPluginSource } from "@/lib/plugins";

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get("filename");
  if (!filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }
  const source = readPluginSource(getVaultPath(), filename);
  if (source === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(source, { headers: { "Content-Type": "application/javascript" } });
}
