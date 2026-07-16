import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import type { OkfNote } from "./types";
import { isReservedFilename } from "./okfClient";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
// Notes can contain very long bodies (e.g. markitdown-extracted PDF/Word text). The
// embedding model only attends to its first ~256 tokens anyway, so a generous character
// cap keeps embedding latency bounded without needing real chunking.
const MAX_INPUT_CHARS = 4000;

interface EmbeddingRecord {
  hash: string;
  vector: number[];
}

interface EmbeddingIndex {
  model: string;
  notes: Record<string, EmbeddingRecord>;
}

export interface SemanticResult {
  path: string;
  title: string;
  type?: string;
  description?: string;
  score: number;
}

// Shared across all vaults on this machine, deliberately kept out of the vault's own
// .amber/ folder (per-vault, git-tracked) and out of the app's install directory (which
// gets wiped and re-mirrored on every release build via `robocopy /MIR`).
function modelCacheDir(): string {
  return path.join(os.homedir(), ".amber", "models");
}

function indexPath(root: string): string {
  return path.join(root, ".amber", "embeddings.json");
}

function loadIndex(root: string): EmbeddingIndex {
  try {
    const raw = fs.readFileSync(indexPath(root), "utf-8");
    const parsed = JSON.parse(raw) as EmbeddingIndex;
    if (parsed.model === MODEL_ID && parsed.notes) return parsed;
  } catch {
    // no index yet, or unreadable/stale format
  }
  return { model: MODEL_ID, notes: {} };
}

function saveIndex(root: string, index: EmbeddingIndex): void {
  const dir = path.join(root, ".amber");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(indexPath(root), JSON.stringify(index), "utf-8");
}

function contentHash(note: OkfNote): string {
  const raw = JSON.stringify({
    title: note.title,
    description: note.frontmatter.description || "",
    tags: note.frontmatter.tags || [],
    body: note.body,
  });
  return crypto.createHash("sha1").update(raw).digest("hex");
}

function embeddingInput(note: OkfNote): string {
  const parts = [note.title, note.frontmatter.description, (note.frontmatter.tags || []).join(" "), note.body];
  return parts.filter(Boolean).join("\n\n").slice(0, MAX_INPUT_CHARS);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedderPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getEmbedder(): Promise<any> {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir = modelCacheDir();
      return pipeline("feature-extraction", MODEL_ID);
    })();
  }
  return embedderPromise;
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const embedder = await getEmbedder();
  const output = await embedder(texts, { pooling: "mean", normalize: true });
  return output.tolist();
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Re-embeds only new or changed notes, drops removed ones, and persists. Cheap when nothing changed. */
async function ensureIndexFresh(root: string, notes: OkfNote[]): Promise<EmbeddingIndex> {
  const index = loadIndex(root);
  const relevant = notes.filter((n) => !isReservedFilename(n.filename));
  const currentPaths = new Set(relevant.map((n) => n.path));

  let changed = false;
  for (const p of Object.keys(index.notes)) {
    if (!currentPaths.has(p)) {
      delete index.notes[p];
      changed = true;
    }
  }

  const stale = relevant.filter((n) => index.notes[n.path]?.hash !== contentHash(n));
  if (stale.length > 0) {
    const vectors = await embedTexts(stale.map(embeddingInput));
    stale.forEach((n, i) => {
      index.notes[n.path] = { hash: contentHash(n), vector: vectors[i] };
    });
    changed = true;
  }

  if (changed) saveIndex(root, index);
  return index;
}

function toResults(index: EmbeddingIndex, notes: OkfNote[], scored: { path: string; score: number }[]): SemanticResult[] {
  const byPath = new Map(notes.map((n) => [n.path, n]));
  return scored
    .map(({ path: p, score }): SemanticResult | null => {
      const note = byPath.get(p);
      if (!note) return null;
      return {
        path: note.path,
        title: note.title,
        type: note.frontmatter.type,
        description: note.frontmatter.description,
        score: Math.round(score * 1000) / 1000,
      };
    })
    .filter((r): r is SemanticResult => r !== null);
}

/** Ranks every note in the vault by conceptual similarity to a free-text query. */
export async function semanticSearchByText(
  root: string,
  notes: OkfNote[],
  queryText: string,
  topK = 8
): Promise<SemanticResult[]> {
  const index = await ensureIndexFresh(root, notes);
  const [queryVector] = await embedTexts([queryText.slice(0, MAX_INPUT_CHARS)]);
  const scored = Object.entries(index.notes)
    .map(([p, rec]) => ({ path: p, score: cosineSimilarity(queryVector, rec.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return toResults(index, notes, scored);
}

/** Ranks every other note in the vault by conceptual similarity to one existing note. */
export async function semanticSearchByPath(
  root: string,
  notes: OkfNote[],
  notePath: string,
  topK = 6
): Promise<SemanticResult[]> {
  const index = await ensureIndexFresh(root, notes);
  const selfVector = index.notes[notePath]?.vector;
  if (!selfVector) return [];
  const scored = Object.entries(index.notes)
    .filter(([p]) => p !== notePath)
    .map(([p, rec]) => ({ path: p, score: cosineSimilarity(selfVector, rec.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return toResults(index, notes, scored);
}
