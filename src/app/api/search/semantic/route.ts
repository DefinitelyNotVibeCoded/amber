import { NextRequest, NextResponse } from "next/server";
import { getVaultPath } from "@/lib/config";
import { loadVault } from "@/lib/okf";
import { semanticSearchByPath, semanticSearchByText } from "@/lib/embeddings";

export async function GET(req: NextRequest) {
  const root = getVaultPath();
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  const notePath = searchParams.get("path");
  const topKRaw = Number(searchParams.get("topK"));
  const topK = Number.isFinite(topKRaw) && topKRaw > 0 ? topKRaw : undefined;

  const vault = loadVault(root);

  if (notePath) {
    const results = await semanticSearchByPath(root, vault.notes, notePath, topK ?? 6);
    return NextResponse.json({ results });
  }
  if (query) {
    const results = await semanticSearchByText(root, vault.notes, query, topK ?? 8);
    return NextResponse.json({ results });
  }
  return NextResponse.json({ error: "query or path is required" }, { status: 400 });
}
