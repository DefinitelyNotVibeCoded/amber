import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        amber: {
          50: "#fdf8ee",
          100: "#f8ecd0",
          200: "#f0d69d",
          300: "#e7bb64",
          400: "#dfa23c",
          500: "#cc8324",
          600: "#ab661d",
          700: "#894c1c",
          800: "#713e1c",
          900: "#5f341c",
          950: "#361a0d",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
