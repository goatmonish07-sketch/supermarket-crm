import type { Config } from "tailwindcss";

// Every colour is a CSS variable holding "R G B" channels, so a theme switch
// is just a different set of variables (see app/globals.css).
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        "surface-2": token("surface-2"),
        border: token("border"),
        fg: token("fg"),
        muted: token("muted"),
        primary: { DEFAULT: token("primary"), strong: token("primary-strong"), soft: token("primary-soft"), fg: token("primary-fg") },
        accent: token("accent"),
        success: token("success"),
        warning: token("warning"),
        danger: token("danger"),
        info: token("info"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { card: "1.75rem", xl2: "1.25rem" },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.08)",
        glow: "0 12px 32px -12px rgb(var(--primary) / 0.55)",
      },
    },
  },
  plugins: [],
};

export default config;
