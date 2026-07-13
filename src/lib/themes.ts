import { deriveAccentTokens } from "./color";

export interface ThemeBase {
  id: string;
  name: string;
  bg0: string;
  bg1: string;
  bg2: string;
  bg3: string;
  bgHover: string;
  border: string;
  borderSoft: string;
  text0: string;
  text1: string;
  text2: string;
  danger: string;
  accent: string;
  isLight?: boolean;
}

export const THEME_PRESETS: ThemeBase[] = [
  {
    id: "amber",
    name: "Amber",
    bg0: "#171613",
    bg1: "#1d1c18",
    bg2: "#262420",
    bg3: "#322f28",
    bgHover: "#2c2a25",
    border: "#38352c",
    borderSoft: "#2c2a24",
    text0: "#ede8db",
    text1: "#b3ac9c",
    text2: "#7c7466",
    danger: "#d1685c",
    accent: "#e3aa4a",
  },
  {
    id: "slate",
    name: "Slate",
    bg0: "#14171c",
    bg1: "#1a1e24",
    bg2: "#22262e",
    bg3: "#2c313b",
    bgHover: "#262b33",
    border: "#333944",
    borderSoft: "#262b33",
    text0: "#e6e9ee",
    text1: "#a8b0bd",
    text2: "#707885",
    danger: "#e0685f",
    accent: "#5b9dd9",
  },
  {
    id: "violet",
    name: "Violet",
    bg0: "#17141c",
    bg1: "#1d1922",
    bg2: "#26202c",
    bg3: "#322b3a",
    bgHover: "#2b2433",
    border: "#3a3244",
    borderSoft: "#2b2433",
    text0: "#ece7f2",
    text1: "#b0a8c0",
    text2: "#766e85",
    danger: "#e0685f",
    accent: "#a78bfa",
  },
  {
    id: "forest",
    name: "Forest",
    bg0: "#131714",
    bg1: "#181d19",
    bg2: "#202722",
    bg3: "#2a332c",
    bgHover: "#232b25",
    border: "#333f36",
    borderSoft: "#232b25",
    text0: "#e6ece7",
    text1: "#a7b6ab",
    text2: "#6f7d73",
    danger: "#e0685f",
    accent: "#6bbf7a",
  },
  {
    id: "light",
    name: "Light",
    bg0: "#f7f5f0",
    bg1: "#ffffff",
    bg2: "#f0ede6",
    bg3: "#e6e1d6",
    bgHover: "#ece8e0",
    border: "#ddd7ca",
    borderSoft: "#e8e3d8",
    text0: "#211f1b",
    text1: "#55504a",
    text2: "#8a8478",
    danger: "#c0392b",
    accent: "#b5791f",
    isLight: true,
  },
];

export function getThemeBase(id: string): ThemeBase {
  return THEME_PRESETS.find((t) => t.id === id) || THEME_PRESETS[0];
}

const CSS_VAR_MAP: Record<string, string> = {
  bg0: "--bg-0",
  bg1: "--bg-1",
  bg2: "--bg-2",
  bg3: "--bg-3",
  bgHover: "--bg-hover",
  border: "--border",
  borderSoft: "--border-soft",
  text0: "--text-0",
  text1: "--text-1",
  text2: "--text-2",
  danger: "--danger",
};

/** Full set of CSS custom properties for a preset + optional accent override, ready to apply to an element's style. */
export function resolveThemeVars(presetId: string, accentOverride?: string | null): Record<string, string> {
  const base = getThemeBase(presetId);
  const accentHex = accentOverride || base.accent;
  const accentTokens = deriveAccentTokens(accentHex);

  const vars: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    vars[cssVar] = base[key as keyof ThemeBase] as string;
  }
  vars["--accent"] = accentTokens.accent;
  vars["--accent-bright"] = accentTokens.accentBright;
  vars["--accent-dim"] = accentTokens.accentDim;
  vars["--accent-soft"] = accentTokens.accentSoft;
  vars["--accent-rgb"] = accentTokens.accentRgb;
  vars["--accent-contrast"] = accentTokens.accentContrast;
  return vars;
}
