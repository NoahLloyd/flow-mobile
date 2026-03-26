import { SignalConfig } from "../types";

const MILESTONES = [7, 14, 30, 60, 100, 200, 365];

interface StreakState {
  count: number;
  points: number;
}

/**
 * Process a single day's result into the streak.
 * Points system:
 * - Hit goal: +1 day, earn (dailyScore - goal) bonus points
 * - Miss + has ≥100 points: streak holds (no increment), -100 points
 * - Miss + <100 points: streak resets to 0, points reset to 0
 */
export function processDay(
  meetsGoal: boolean,
  dailyScore: number,
  currentCount: number,
  currentPoints: number,
  goal: number,
): StreakState {
  if (meetsGoal) {
    const earned = Math.max(0, dailyScore - goal);
    return { count: currentCount + 1, points: currentPoints + earned };
  }
  // Miss — can we pay 100 points to protect the streak?
  if (currentPoints >= 100) {
    return { count: currentCount, points: Math.max(0, currentPoints - 100) };
  }
  // Not enough points — streak lost
  return { count: 0, points: 0 };
}

/**
 * Compute the signal score for a day (0-100).
 * Matches the desktop app's scoring exactly:
 * - Shower is skipped in the main loop (handled separately by caller)
 * - Binary: 100 if true, 0 if false
 * - Scale: (value / 5) * 100
 * - Number/Water: scored relative to signalGoals (higher-is-better, except minutesToOffice)
 *
 * In historical mode, only count signals that have recorded data for that day.
 */
export function computeDayScore(
  daySignals: Record<string, any>,
  activeSignalKeys: string[],
  allSignals: Record<string, SignalConfig>,
  signalGoals: Record<string, number>,
  historicalMode: boolean,
  percentageGoal: number = 75,
  showerOverride?: boolean,
): number {
  // In historical mode, only evaluate signals that have data for this day
  const signalsToEvaluate = historicalMode
    ? activeSignalKeys.filter((key) => {
        if (key === "shower") return false; // handled separately
        const value = daySignals[key];
        return value !== undefined && value !== null;
      })
    : activeSignalKeys.filter((key) => key !== "shower"); // shower handled separately

  let totalActive = 0;
  let totalScore = 0;
  let allMeetGoal = percentageGoal > 0;

  for (const key of signalsToEvaluate) {
    const config = allSignals[key];
    if (!config) continue;

    totalActive++;
    const value = daySignals[key];

    // No data recorded for this signal = 0 score
    if (value === undefined || value === null) {
      if (percentageGoal > 0) allMeetGoal = false;
      continue;
    }

    let score = 0;

    if (config.type === "binary") {
      score =
        value === true || value === "true" || value === 1 || value === "1"
          ? 100
          : 0;
    } else if (config.type === "scale") {
      if (typeof value === "number") {
        score = (value / 5) * 100;
      }
    } else if (config.type === "number" || config.type === "water") {
      if (config.hasGoal && key in signalGoals) {
        const goal = signalGoals[key];
        if (typeof value === "number") {
          if (key === "minutesToOffice") {
            // Lower is better
            score =
              value <= goal
                ? 100
                : Math.max(0, 100 - ((value - goal) / goal) * 100);
          } else {
            // Higher is better
            score = value >= goal ? 100 : (value / goal) * 100;
          }
        }
      }
      // No goal = 0 score (can't evaluate)
    }

    if (percentageGoal > 0 && score < percentageGoal) {
      allMeetGoal = false;
    }

    totalScore += score;
  }

  // Handle shower separately (matches desktop pattern)
  if (activeSignalKeys.includes("shower")) {
    totalActive++;
    if (showerOverride !== undefined) {
      // Caller provides 3-day window result
      const showerScore = showerOverride ? 100 : 0;
      totalScore += showerScore;
      if (percentageGoal > 0 && showerScore < percentageGoal) allMeetGoal = false;
    } else {
      // Fall back to day's shower value
      const showerVal = daySignals["shower"];
      const showerScore =
        showerVal === true || showerVal === "true" || showerVal === 1 || showerVal === "1"
          ? 100
          : 0;
      totalScore += showerScore;
      if (percentageGoal > 0 && showerScore < percentageGoal) allMeetGoal = false;
    }
  }

  if (totalActive === 0) return 0;

  // Force 100% when every signal individually meets the goal — matches the
  // live daily score calculation so historical points are consistent.
  if (allMeetGoal && totalActive > 0) return 100;

  return Math.round(totalScore / totalActive);
}

/**
 * Get the list of dates between two YYYY-MM-DD strings (inclusive).
 */
export function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + "T12:00:00Z");
  const endDate = new Date(end + "T12:00:00Z");
  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Format YYYY-MM-DD for N days ago.
 */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

/**
 * Get yesterday's date as YYYY-MM-DD.
 */
export function yesterday(): string {
  return daysAgo(1);
}

/**
 * Get today's date as YYYY-MM-DD.
 */
export function today(): string {
  return daysAgo(0);
}

/**
 * Group raw signal rows by date.
 * Input: [{ date, metric, value }, ...]
 * Output: { "2026-03-19": { exercise: true, sleep: 7, ... }, ... }
 */
export function groupSignalsByDate(
  rows: { date: string; metric: string; value: any }[]
): Record<string, Record<string, any>> {
  const grouped: Record<string, Record<string, any>> = {};
  for (const row of rows) {
    if (!grouped[row.date]) grouped[row.date] = {};
    grouped[row.date][row.metric] = row.value;
  }
  return grouped;
}

/**
 * Walk through signal history and compute streak state.
 * Uses the points system: earn bonus points for scoring above goal,
 * spend 100 points to survive a miss, lose streak if insufficient points.
 */
export function walkStreak(
  dates: string[],
  signalsByDate: Record<string, Record<string, any>>,
  allSignals: Record<string, SignalConfig>,
  activeSignalKeys: string[],
  signalGoals: Record<string, number>,
  goal: number,
  initialCount: number,
  initialPoints: number,
): {
  count: number;
  points: number;
  longest: number;
  milestones: number[];
} {
  let count = initialCount;
  let points = initialPoints;
  let longest = initialCount;
  const milestones: number[] = [];

  for (const date of dates) {
    const daySignals = signalsByDate[date] || {};
    const hasData = Object.keys(daySignals).length > 0;
    let score = 0;
    let meetsGoal = false;

    if (hasData) {
      score = computeDayScore(
        daySignals,
        activeSignalKeys,
        allSignals,
        signalGoals,
        true,
        goal,
      );
      meetsGoal = score >= goal;
    }

    const result = processDay(meetsGoal, score, count, points, goal);
    count = result.count;
    points = result.points;

    if (count > longest) longest = count;

    for (const m of MILESTONES) {
      if (count >= m && !milestones.includes(m)) {
        milestones.push(m);
      }
    }
  }

  return { count, points, longest, milestones };
}

export { MILESTONES };
