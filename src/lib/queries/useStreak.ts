import { useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useAuthStore } from "../store/auth";
import { syncWidgetData } from "../widgetSync";
import { daysAgo, groupSignalsByDate } from "../streak";

function getTodayDate(timezone?: string): string {
  try {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const month = parts.find((p) => p.type === "month")?.value || "01";
    const day = parts.find((p) => p.type === "day")?.value || "01";
    const year = parts.find((p) => p.type === "year")?.value || "2024";
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export interface WeekDay {
  label: string; // "M", "T", "W", etc.
  met: boolean;
  isToday: boolean;
  hasData: boolean;
}

interface StreakDisplay {
  streak: number;
  points: number;
  isDanger: boolean;
  longest: number;
  milestones: number[];
  todayScore: number;
  goal: number;
  isLoading: boolean;
  hasShoweredIn3Days: boolean;
  weekDays: WeekDay[];
}

/**
 * Computes and maintains the signal streak via the compute-daily-score edge function.
 * All scoring and streak logic lives server-side; the client just displays the results.
 */
export function useStreak(): StreakDisplay {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const prefs = user?.preferences || {};
  const goal = (prefs.signalPercentageGoal as number) || 75;
  const timezone = (prefs.timezone as string) || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayTz = getTodayDate(timezone);

  // === Foreground refresh: invalidate queries when app comes back ===
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        queryClient.invalidateQueries({ queryKey: ["daily-score"] });
        queryClient.invalidateQueries({ queryKey: ["signals", "week-history"] });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  // === Call edge function for today's score + streak ===
  const { data: edgeResult, isLoading } = useQuery({
    queryKey: ["daily-score", todayTz, timezone],
    queryFn: () => api.computeDailyScore(todayTz, timezone),
    enabled: !!user,
    staleTime: 10_000,
  });

  const todayScore = edgeResult?.score ?? 0;
  const todayMeetsGoal = todayScore >= goal;
  const streak = edgeResult?.streak;

  // === Shower 3-day window (for display purposes) ===
  const hasShoweredIn3Days = useMemo(() => {
    if (!edgeResult?.signals) return false;
    // The edge function already applies the 3-day window to the shower signal
    const shower = edgeResult.signals.shower;
    return shower === true || shower === "true" || shower === 1 || shower === "1";
  }, [edgeResult]);

  // === Week days computation ===
  // Still fetch week history for the week view widget
  const weekStart = daysAgo(6);
  const todayStr = daysAgo(0);
  const { data: weekHistory } = useQuery({
    queryKey: ["signals", "week-history", weekStart, todayStr],
    queryFn: () => api.getAllSignalHistory(weekStart, todayStr),
    enabled: !!user,
    staleTime: 30_000,
  });

  const weekDays = useMemo((): WeekDay[] => {
    const labels = ["S", "M", "T", "W", "T", "F", "S"];
    const weekByDate = weekHistory ? groupSignalsByDate(weekHistory) : {};
    const days: WeekDay[] = [];

    for (let i = 6; i >= 0; i--) {
      const dateStr = daysAgo(i);
      const d = new Date(dateStr + "T12:00:00Z");
      const daySignals = weekByDate[dateStr] || {};
      const hasData = Object.keys(daySignals).length > 0;
      let met = false;

      if (i === 0) {
        met = todayMeetsGoal;
      } else if (hasData) {
        // Use _dailyScore persisted by the edge function
        const dailyScore = daySignals._dailyScore;
        if (dailyScore !== undefined && dailyScore !== null) {
          met = Number(dailyScore) >= goal;
        }
      }

      days.push({
        label: labels[d.getUTCDay()],
        met,
        isToday: i === 0,
        hasData: i === 0 ? true : hasData,
      });
    }
    return days;
  }, [weekHistory, todayMeetsGoal, goal]);

  // === Display values ===

  const displayStreak = streak?.count ?? 0;
  const displayPoints = Math.round(streak?.points ?? 0);
  const displayDanger = streak?.danger ?? false;
  const displayLongest = streak?.longest ?? 0;
  const displayMilestones = streak?.milestones ?? [];

  // === Sync to widgets ===

  useEffect(() => {
    syncWidgetData({
      signalStreak: displayStreak,
      signalStreakGoalMet: todayMeetsGoal,
      signalStreakDanger: displayDanger,
      signalStreakTodayScore: todayScore,
      signalStreakGoal: goal,
      signalStreakWeek: weekDays,
      signalStreakPoints: displayPoints,
    });
  }, [displayStreak, todayMeetsGoal, displayDanger, todayScore, goal, weekDays, displayPoints]);

  return {
    streak: displayStreak,
    points: displayPoints,
    isDanger: displayDanger,
    longest: displayLongest,
    milestones: displayMilestones,
    todayScore,
    goal,
    isLoading,
    hasShoweredIn3Days,
    weekDays,
  };
}
