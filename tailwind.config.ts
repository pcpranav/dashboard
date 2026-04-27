import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-soft": "var(--bg-soft)",
        surface: "var(--surface)",
        "surface-strong": "var(--surface-strong)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: "var(--accent)",
        blue: "var(--blue)",
        "blue-soft": "var(--blue-soft)",
        success: "var(--emerald)",
        danger: "var(--red)",
        warning: "var(--amber)",
        info: "var(--blue-soft)",
        muted: "var(--muted)",
        fg: "var(--fg)",
        // legacy aliases → collapsed to new palette
        violet: "var(--blue)",
        cyan: "var(--blue-soft)",
        pink: "var(--blue-soft)",
        mint: "var(--emerald)",
        emerald: "var(--emerald)",
        sky: "var(--blue-soft)",
        "blue-bright": "var(--blue-soft)",
      },
      fontFamily: {
        mono: ["var(--font-space-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui"],
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.85)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "pulse-dot": "pulseDot 1.4s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
      backgroundImage: {
        "aurora": "linear-gradient(100deg, #3b82f6, #60a5fa)",
        "aurora-soft": "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(96,165,250,0.08))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
