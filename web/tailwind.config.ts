import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        bg: {
          DEFAULT: "#0d1117",
          card: "#161b22",
          elevated: "#1f2630",
        },
        accent: {
          DEFAULT: "#7c5cff",
          dim: "#5640d2",
        },
        ink: {
          DEFAULT: "#e6edf3",
          dim: "#8b949e",
          muted: "#6e7681",
        },
        edge: "#30363d",
        win: "#3fb950",
        loss: "#f85149",
        draw: "#d29922",
      },
    },
  },
  plugins: [],
} satisfies Config;
