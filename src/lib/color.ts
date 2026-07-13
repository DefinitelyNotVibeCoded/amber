export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return "#" + [r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("");
}

/** Mix a hex color toward a target RGB by `amount` (0-1). */
export function mix(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (target[0] - r) * amount,
    g + (target[1] - g) * amount,
    b + (target[2] - b) * amount
  );
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface AccentTokens {
  accent: string;
  accentBright: string;
  accentDim: string;
  accentSoft: string;
  accentRgb: string;
  accentContrast: string;
}

/** Derive the full accent-dependent token set from a single base hex color. */
export function deriveAccentTokens(hex: string): AccentTokens {
  const rgb = hexToRgb(hex);
  const bright = mix(hex, [255, 255, 255], 0.28);
  const dim = mix(hex, [0, 0, 0], 0.35);
  const contrast = relativeLuminance(hex) > 0.42 ? "#1b1a17" : "#fdf8ee";
  return {
    accent: hex,
    accentBright: bright,
    accentDim: dim,
    accentSoft: `rgba(${rgb.join(", ")}, 0.14)`,
    accentRgb: rgb.join(", "),
    accentContrast: contrast,
  };
}
