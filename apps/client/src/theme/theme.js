import { Platform } from "react-native";

export const theme = {
  colors: {
    bgPrimary: "#24121b",
    bgSecondary: "#2c1721",
    surface: "#1d1116",
    surfaceElevated: "#24181e",
    surfaceStrong: "#281c22",
    textPrimary: "#efd0db",
    textSecondary: "#d3a8ba",
    textMuted: "#a38a94",
    accent: "#8f0164",
    accentSoft: "#ffafd6",
    accentBorder: "rgba(255, 175, 214, 0.18)",
    borderSubtle: "rgba(242, 221, 228, 0.08)",
    buttonText: "#f2dde4",
    successText: "#8cca6b",
    errorText: "#d98d84",
  },
  gradient: ["#3c0028", "#8f0164", "#ffafd6"],
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    pill: 999,
  },
  typography: {
    display: {
      fontSize: 58,
      lineHeight: 64,
      fontWeight: "300",
    },
    hero: {
      fontSize: 46,
      lineHeight: 54,
      fontWeight: "400",
    },
    section: {
      fontSize: 30,
      lineHeight: 36,
      fontWeight: "400",
    },
    body: {
      fontSize: 16,
      lineHeight: 27,
      fontWeight: "400",
    },
    caption: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "500",
    },
  },
  layout: {
    maxWidth: 1240,
    contentGap: 24,
  },
  fonts: {
    serif: Platform.select({
      web: "Newsreader, Georgia, serif",
      default: Platform.OS === "ios" ? "Times New Roman" : "serif",
    }),
    sans: Platform.select({
      web: "Manrope, Avenir Next, sans-serif",
      default: Platform.OS === "ios" ? "Avenir Next" : "sans-serif",
    }),
  },
  effects: {
    brandGlow: {
      base: {
        textShadow:
          "0 0 6px rgba(242, 135, 192, 0.34), 0 0 14px rgba(242, 135, 192, 0.24), 0 0 28px rgba(222, 92, 166, 0.16), 0 0 48px rgba(201, 62, 144, 0.08)",
        filter: "drop-shadow(0 0 10px rgba(242, 135, 192, 0.12))",
        nativeTextShadowColor: "rgba(242, 135, 192, 0.22)",
        nativeTextShadowRadius: 16,
      },
      hover: {
        textShadow:
          "0 0 8px rgba(242, 135, 192, 0.4), 0 0 16px rgba(242, 135, 192, 0.3), 0 0 30px rgba(222, 92, 166, 0.2), 0 0 52px rgba(201, 62, 144, 0.1)",
        filter: "drop-shadow(0 0 12px rgba(242, 135, 192, 0.16))",
        nativeTextShadowColor: "rgba(242, 135, 192, 0.28)",
        nativeTextShadowRadius: 18,
      },
    },
  },
};
