import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1a2332", 2: "#4a5568", 3: "#8a94a6" },
        brand: { DEFAULT: "#0f6b5c", dark: "#0a4a40", light: "#e6f2ef" },
        gold: { DEFAULT: "#c8862a", light: "#faf3e6" },
        line: "#e5e9f0",
        canvas: "#f7f8fa",
        good: "#1a7f4e",
        warn: "#b45309",
        risk: "#b3413d",
      },
    },
  },
  plugins: [],
};

export default config;
