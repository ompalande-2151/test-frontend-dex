import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#050505",
          cyan: "#00F0FF",
          violet: "#8A2BE2",
          darkGray: "#0B0C10",
        },
        bg: "hsl(var(--bg))",
        surface: "hsl(var(--surface))",
        "text-primary": "hsl(var(--text))",
        muted: "hsl(var(--muted))",
        stroke: "hsl(var(--stroke))",
        accent: "hsl(var(--accent))",
        border: "rgb(var(--border) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        destructive: "rgb(var(--destructive) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        display: ["Outfit", "sans-serif"],
        landing: ["Instrument Serif", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-slow": "glow 4s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 10px rgba(0, 240, 255, 0.1), 0 0 20px rgba(138, 43, 226, 0.05)" },
          "100%": { boxShadow: "0 0 25px rgba(0, 240, 255, 0.25), 0 0 40px rgba(138, 43, 226, 0.15)" }
        }
      }
    },
  },
  plugins: [require("tailwindcss-animate")]
} satisfies Config;
