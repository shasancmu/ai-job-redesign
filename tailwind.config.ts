import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        mist: "#F6F8FB", // light section background
        ink: "#14283A", // deep navy (Stripe-like)
        slate2: "#47586A", // muted slate-blue body text
        line: "#E7EBF0", // crisp cool border
        sage: { DEFAULT: "#3F7A52", soft: "#E7F1EA" }, // primary / plants
        amber: { DEFAULT: "#C98A2B", soft: "#FBEFD6" }, // sunlight
        clay: { DEFAULT: "#C06A47", soft: "#F7E5DB" },
        sky: { DEFAULT: "#4E79C9", soft: "#E6EDFA" },
        ai: "#4E79C9",
        human: "#C06A47",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(26,39,51,.04), 0 6px 20px -8px rgba(26,39,51,.10)",
        lift: "0 2px 4px rgba(26,39,51,.05), 0 20px 40px -20px rgba(26,39,51,.22)",
        btn: "0 1px 1px rgba(26,39,51,.06), 0 2px 6px rgba(26,39,51,.12)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
