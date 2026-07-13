import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { readSavedViews, addSavedView } from "@/lib/savedViews";
import type { SavedView } from "@/lib/query";

export async function GET() {
  const root = getVaultPath();
  return NextResponse.json({ views: readSavedViews(root) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Omit<SavedView, "id">;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const root = getVaultPath();
  const view = addSavedView(root, body);
  return NextResponse.json({ view });
}
