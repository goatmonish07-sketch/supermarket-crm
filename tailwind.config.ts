import type { Config } from "tailwindcss";

/**
 * Aesthetic violet design system.
 * Soft lavender surfaces, elegant violet accents, gentle gradients.
 * (Deliberately NOT heavy/dark purple.)
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary aesthetic violet ramp
        violet: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b74fb",
          600: "#7c5cfc",
          700: "#6d4af0",
          800: "#5b3ad4",
          900: "#4c2fae",
        },
        // Semantic tokens
        brand: {
          DEFAULT: "#7c5cfc",
          soft: "#f3f0ff",
          softer: "#faf9ff",
          ring: "#c4b5fd",
        },
        ink: {
          DEFAULT: "#1e1b2e",
          soft: "#4b4763",
          muted: "#8b87a3",
        },
        surface: {
          DEFAULT: "#ffffff",
          sunken: "#f7f6fb",
          panel: "#fbfaff",
        },
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#f43f5e",
        info: "#3b82f6",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(30,27,46,0.04), 0 8px 24px rgba(124,92,252,0.06)",
        "card-hover": "0 2px 4px rgba(30,27,46,0.06), 0 12px 32px rgba(124,92,252,0.12)",
        pop: "0 12px 40px rgba(30,27,46,0.16)",
        sidebar: "0 8px 40px rgba(76,47,174,0.18)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #7c5cfc 0%, #a78bfa 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, #f3f0ff 0%, #ede9fe 100%)",
        "sidebar-gradient": "linear-gradient(180deg, #2a2440 0%, #241f38 100%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "scale-in": "scale-in 0.18s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
