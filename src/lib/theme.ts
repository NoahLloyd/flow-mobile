// Dark-first color palette for Flowmatic mobile
// Matches the desktop app's dark blue (slate) theme
export const colors = {
  // Backgrounds — dark blue/slate tones (desktop uses #0f172a)
  bg: "#0c1220",
  bgSecondary: "#131c2e",
  bgTertiary: "#1a2540",
  bgElevated: "#1e293b",

  // Text
  text: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",

  // Accent — blue (matching desktop)
  accent: "#3b82f6",
  accentLight: "#60a5fa",
  accentDark: "#2563eb",

  // Status
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",

  // Borders
  border: "#1e293b",
  borderLight: "#334155",

  // Signal types
  signalBinary: "#3b82f6",
  signalNumber: "#22c55e",
  signalWater: "#3b82f6",

  // Scale level colors (1-5: red → green, matching desktop's Routine)
  scale1: "#991b1b",    // dark red
  scale1Text: "#fca5a5",
  scale2: "#92400e",    // dark orange/red
  scale2Text: "#fca5a5",
  scale3: "#854d0e",    // dark yellow
  scale3Text: "#fef08a",
  scale4: "#166534",    // dark green
  scale4Text: "#bbf7d0",
  scale5: "#166534",    // dark green
  scale5Text: "#bbf7d0",

  // Inactive scale
  scaleInactive: "#1e293b",
  scaleInactiveText: "#64748b",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
  hero: 40,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

// Get scale button color based on level (1-5)
export function getScaleColor(level: number): { bg: string; text: string } {
  switch (level) {
    case 1: return { bg: colors.scale1, text: colors.scale1Text };
    case 2: return { bg: colors.scale2, text: colors.scale2Text };
    case 3: return { bg: colors.scale3, text: colors.scale3Text };
    case 4: return { bg: colors.scale4, text: colors.scale4Text };
    case 5: return { bg: colors.scale5, text: colors.scale5Text };
    default: return { bg: colors.scaleInactive, text: colors.scaleInactiveText };
  }
}
