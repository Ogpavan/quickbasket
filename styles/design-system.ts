export const designSystem = {
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    "2xl": "32px"
  },
  radius: {
    sm: "12px",
    md: "16px",
    lg: "24px",
    xl: "32px"
  },
  shadow: {
    card: "0 2px 8px rgba(0,0,0,0.08)"
  },
  typography: {
    fontFamily: "Inter, Poppins, sans-serif",
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  colors: {
    primary: "#F7C600",
    background: "#FFFFFF",
    lightBackground: "#F7F7F7",
    text: "#111111",
    muted: "#6B6B6B"
  }
} as const;

export type DesignSystem = typeof designSystem;
