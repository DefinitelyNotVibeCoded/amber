import path from "path";

/**
 * Resolves a bundle-relative path (e.g. "/concepts/okf.md") against the vault
 * root and guarantees the result stays inside the vault. Throws otherwise.
 */
export function resolveInVault(root: string, bundleRelativePath: string): string {
  const cleaned = bundleRelativePath.replace(/^\/+/, "");
  const resolved = path.resolve(root, cleaned);
  const normalizedRoot = path.resolve(root) + path.sep;
  if (!(resolved + path.sep).startsWith(normalizedRoot) && resolved !== path.resolve(root)) {
    throw new Error("Path escapes vault root");
  }
  return resolved;
}
