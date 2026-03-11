import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: "#ffd54a",
          yellowDeep: "#f5c400",
          green: "#1f8f4d",
          mint: "#eef9e6",
          cream: "#fffdf6",
          ink: "#1b2d1f",
          line: "#e7eadb",
          soft: "#fff7cf"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 16px 40px -28px rgba(27, 45, 31, 0.28)",
        float: "0 24px 60px -34px rgba(27, 45, 31, 0.35)"
      },
      keyframes: {
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(18px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "cart-bump": {
          "0%": {
            transform: "scale(1)"
          },
          "45%": {
            transform: "scale(1.08)"
          },
          "100%": {
            transform: "scale(1)"
          }
        }
      },
      animation: {
        "fade-in-up": "fade-in-up 0.7s ease-out both",
        "cart-bump": "cart-bump 0.28s ease-out"
      }
    }
  },
  plugins: []
};

export default config;
