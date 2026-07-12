const RESERVED_FILENAMES = new Set(["index.md", "log.md"]);

export function isReservedFilename(filename: string): boolean {
  return RESERVED_FILENAMES.has(filename);
}

const TYPE_PALETTE = [
  "#cc8324", // amber
  "#3b82f6", // blue
  "#10b981", // emerald
  "#a855f7", // purple
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f59e0b", // orange
  "#84cc16", // lime
  "#ec4899", // pink
];

export function colorForType(type: string | undefined, types: string[]): string {
  if (!type) return "#8a8a8a";
  const idx = types.indexOf(type);
  if (idx === -1) return "#8a8a8a";
  return TYPE_PALETTE[idx % TYPE_PALETTE.length];
}
