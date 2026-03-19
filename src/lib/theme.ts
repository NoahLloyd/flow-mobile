// Dark-first color palette for Flowmatic mobile
export const colors = {
  // Backgrounds
  bg: "#0a0a0a",
  bgSecondary: "#141414",
  bgTertiary: "#1e1e1e",
  bgElevated: "#242424",

  // Text
  text: "#f5f5f5",
  textSecondary: "#a0a0a0",
  textMuted: "#666666",

  // Accent
  accent: "#6366f1", // indigo
  accentLight: "#818cf8",
  accentDark: "#4f46e5",

  // Status
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",

  // Borders
  border: "#2a2a2a",
  borderLight: "#333333",

  // Signal types
  signalBinary: "#6366f1",
  signalScale: "#f59e0b",
  signalNumber: "#22c55e",
  signalWater: "#3b82f6",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  hero: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
