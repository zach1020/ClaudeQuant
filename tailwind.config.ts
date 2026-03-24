import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        surface: "#111111",
        border: "#1e1e1e",
        "border-bright": "#2a2a2a",
        bull: "#00ff41",
        bear: "#ff2222",
        info: "#00ccff",
        warn: "#ff8800",
        muted: "#666666",
        dim: "#333333",
        text: "#e0e0e0",
        "text-dim": "#888888",
        accent: "#aa00ff",
      },
      fontFamily: { mono: ["JetBrains Mono", "Fira Code", "monospace"] },
    },
  },
  plugins: [],
};

export default config;
