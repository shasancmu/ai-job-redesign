import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FBFAF4", // sunlit off-white
        ink: "#23241D", // warm near-black
        line: "#ECE6D6", // warm border
        // brand naturals — colorful but subtle
        sage: { DEFAULT: "#4A6A4E", soft: "#EAF0E5" }, // plants / primary
        amber: { DEFAULT: "#CE8F2C", soft: "#FBEECF" }, // sunlight
        clay: { DEFAULT: "#B4623F", soft: "#F6E3D8" }, // terracotta
        sky: { DEFAULT: "#5B7FA6", soft: "#E5ECF4" }, // dusty blue
        // engine roles, re-harmonized to the palette
        ai: "#5B7FA6",
        human: "#B4623F",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(35,36,29,.04), 0 10px 30px -14px rgba(35,36,29,.12)",
        lift: "0 2px 6px rgba(35,36,29,.05), 0 18px 40px -18px rgba(35,36,29,.18)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.15rem",
      },
    },
  },
  plugins: [],
};

export default config;
