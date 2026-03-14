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
          yellow: "#F7C600",
          yellowDeep: "#E6B800",
          green: "#1f8f4d",
          mint: "#F1F8EE",
          cream: "#F7F7F7",
          ink: "#111111",
          line: "#E6E6E6",
          soft: "#FFF5C2",
          muted: "#6B6B6B"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-poppins)", "system-ui", "sans-serif"]
      },
      borderRadius: {
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px"
      },
      boxShadow: {
        card: "0 2px 8px rgba(0, 0, 0, 0.08)",
        float: "0 10px 24px rgba(0, 0, 0, 0.12)"
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
