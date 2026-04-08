// ── Signal Types ────────────────────────────────────────────

export interface Signal {
  type: "binary" | "number" | "water" | "scale";
  value: number | boolean;
  timestamp?: string | Date;
  metric: string;
  date?: string;
}

export interface SignalConfig {
  label: string;
  type: "binary" | "number" | "water" | "scale";
  max?: number;
  hasGoal: boolean;
  isComputed?: boolean;
}

export const DEFAULT_SIGNALS: Record<string, SignalConfig> = {
  focusHours: {
    label: "Focus Hours",
    type: "binary",
    hasGoal: false,
    isComputed: true,
  },
  minutesToOffice: {
    label: "Minutes to Office",
    type: "number",
    max: 180,
    hasGoal: true,
  },
  waterIntake: { label: "Water", type: "water", max: 5000, hasGoal: true },
  energy: { label: "Energy", type: "scale", hasGoal: false },
  mood: { label: "Routine", type: "scale", hasGoal: false },
  exercise: { label: "Exercise", type: "binary", hasGoal: false },
  breakfast: { label: "Breakfast", type: "binary", hasGoal: false },
  lunch: { label: "Lunch", type: "binary", hasGoal: false },
  shower: { label: "Shower", type: "binary", hasGoal: false },
  meditation: { label: "Meditation", type: "binary", hasGoal: false },
  reading: { label: "Reading", type: "binary", hasGoal: false },
  journaling: { label: "Journaling", type: "binary", hasGoal: false, isComputed: true },
  vitamins: { label: "Vitamins", type: "binary", hasGoal: false },
  sleep: { label: "Sleep Hours", type: "number", max: 12, hasGoal: true },
  steps: { label: "Steps", type: "number", max: 30000, hasGoal: true },
};

// AVAILABLE_SIGNALS is now a function that merges defaults with user's custom signals
export function getAvailableSignals(customSignals?: Record<string, SignalConfig>): Record<string, SignalConfig> {
  return { ...DEFAULT_SIGNALS, ...(customSignals || {}) };
}

// For backwards compat - static reference (without custom signals)
export const AVAILABLE_SIGNALS = DEFAULT_SIGNALS;

// ── Session Types ───────────────────────────────────────────

export interface Session {
  id: string;
  user_id: string;
  notes: string;
  task: string;
  project: string;
  minutes: number;
  focus: number;
  created_at?: string;
}

// ── Task Types ──────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  completedAt: Date | null;
  type: string; // dynamic - fetched from DB
  createdAt: Date;
}

// ── Morning Types ───────────────────────────────────────────

export interface MorningEntry {
  date: string;
  content: string;
  user_id: string;
  activityContent?: MorningActivityContent;
}

export interface MorningActivityContent {
  writing?: string;
  gratitude?: string;
  affirmations?: string;
  lastActivityIndex?: number;
}

export interface MorningEntries {
  entries: MorningEntry[];
  streak: number;
}

export interface MorningActivity {
  id: string;
  type:
    | "writing"
    | "visualization"
    | "gratitude"
    | "affirmations"
    | "breathwork"
    | "tasks";
  enabled: boolean;
  timerMinutes: number;
  text?: string;
  title: string;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

// ── Note Types ──────────────────────────────────────────────

export interface Note {
  id: string;
  user_id: string;
  content: string;
  tags: string[];
  is_processed: boolean;
  created_at: string;
  updated_at: string;
}

// ── User Types ──────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  picture_url?: string;
  preferences: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}
