import { useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useAuthStore } from "../store/auth";
import { getAvailableSignals, SignalConfig, Session } from "../../types";
import { syncWidgetData } from "../widgetSync";
import {
  applyForce100,
  computeDayScore,
  daysAgo,
  getDateRange,
  groupSignalsByDate,
  today,
  walkStreak,
  yesterday,
  MILESTONES,
} from "../streak";

const JOURNALING_MIN_CHARS = 1000;

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
 * Computes and maintains the signal streak with the points system.
 * Matches the desktop app's scoring exactly:
 * - Computed signals (journaling, focusHours) are evaluated live
 * - Shower uses 3-day window
 * - Points: earn (score - goal) per day above goal, spend 100 to survive a miss
 */
export function useStreak(): StreakDisplay {
  const { user } = useAuthStore();
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const queryClient = useQueryClient();
  const hasProcessed = useRef(false);

  const prefs = user?.preferences || {};
  const goal = (prefs.signalPercentageGoal as number) || 75;
  const storedCount = prefs.signalStreakCount as number | undefined;
  const storedDate = prefs.signalStreakDate as string | undefined;
  const storedPoints = prefs.signalStreakPoints as number | undefined;
  const storedLongest = (prefs.signalStreakLongest as number) || 0;
  const storedMilestones = (prefs.signalStreakMilestones as number[]) || [];
  const signalGoals = (prefs.signalGoals as Record<string, number>) || {};

  const customSignals =
    (prefs.customSignals as Record<string, SignalConfig>) || {};
  const allSignals = getAvailableSignals(customSignals);
  const activeSignalKeys =
    (prefs.activeSignals as string[]) || Object.keys(allSignals);

  // Need backfill when count is unset OR points haven't been computed yet
  const needsBackfill =
    storedCount === undefined || storedCount === -1 || !storedDate || storedPoints === undefined;
  const yesterdayStr = yesterday();
  const todayStr = today();
  const timezone = prefs.timezone as string | undefined;
  const todayTz = getTodayDate(timezone);

  // Determine which date range we need to fetch
  const fetchStart = needsBackfill ? daysAgo(365) : storedDate!;
  const needsProcessing = needsBackfill || storedDate !== yesterdayStr;

  // === Foreground refresh: invalidate queries when app comes back ===
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        queryClient.invalidateQueries({ queryKey: ["signals"] });
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
        queryClient.invalidateQueries({ queryKey: ["morning"] });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  // === Data queries ===

  // Fetch signal history for unprocessed days + today
  const { data: historyRows, isLoading: historyLoading } = useQuery({
    queryKey: ["signals", "streak-history", fetchStart, todayStr],
    queryFn: () => api.getAllSignalHistory(fetchStart, todayStr),
    enabled: !!user && needsProcessing,
    staleTime: 60_000,
  });

  // Fetch today's signals for live score
  const { data: todaySignals } = useQuery({
    queryKey: ["signals", todayTz],
    queryFn: () => api.getDailySignals(todayTz),
    enabled: !!user,
    staleTime: 10_000,
  });

  // Fetch last 3 days of signal history for shower special logic
  const threeDaysAgo = daysAgo(2);
  const { data: recentHistory } = useQuery({
    queryKey: ["signals", "recent-shower", threeDaysAgo, todayStr],
    queryFn: () => api.getAllSignalHistory(threeDaysAgo, todayStr),
    enabled: !!user && activeSignalKeys.includes("shower"),
    staleTime: 30_000,
  });

  // Fetch last 7 days for week view widget
  const weekStart = daysAgo(6);
  const { data: weekHistory } = useQuery({
    queryKey: ["signals", "week-history", weekStart, todayStr],
    queryFn: () => api.getAllSignalHistory(weekStart, todayStr),
    enabled: !!user,
    staleTime: 30_000,
  });

  // === Computed signals (matching desktop) ===

  // Fetch today's morning entry for journaling signal
  const { data: morningEntry } = useQuery({
    queryKey: ["morning", todayTz],
    queryFn: () => api.getEntry(todayTz),
    enabled: !!user && activeSignalKeys.includes("journaling"),
    staleTime: 30_000,
  });

  // Compute journaling signal (matches desktop's hasJournalingContent)
  const journalingValue = useMemo(() => {
    if (!morningEntry) return false;
    let totalChars = 0;
    if (morningEntry.activityContent) {
      const { writing, gratitude, affirmations } = morningEntry.activityContent;
      if (writing) totalChars += String(writing).trim().length;
      if (gratitude) totalChars += String(gratitude).trim().length;
      if (affirmations) totalChars += String(affirmations).trim().length;
    }
    if (morningEntry.content) {
      totalChars += morningEntry.content.trim().length;
    }
    return totalChars >= JOURNALING_MIN_CHARS;
  }, [morningEntry]);

  // Fetch today's sessions for focusHours signal
  const { data: allSessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: api.getUserSessions,
    enabled: !!user && activeSignalKeys.includes("focusHours"),
    staleTime: 30_000,
  });

  // Compute focusHours signal (matches desktop logic)
  const focusHoursValue = useMemo(() => {
    if (!allSessions) return false;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const todaySessions = allSessions.filter((s: Session) => {
      if (!s.created_at) return false;
      return new Date(s.created_at) >= todayDate;
    });

    const hours = todaySessions.reduce((acc: number, s: Session) => acc + s.minutes / 60, 0);

    // Get daily goal from preferences (matches desktop)
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[new Date().getDay()];
    const dailyHoursGoals = prefs.dailyHoursGoals as Record<string, number> | undefined;
    const dailyGoal = dailyHoursGoals && dayName in dailyHoursGoals
      ? dailyHoursGoals[dayName]
      : 4;

    return hours >= dailyGoal;
  }, [allSessions, prefs.dailyHoursGoals]);

  // Persist computed signals to DB (same as desktop)
  useEffect(() => {
    if (!user || !todaySignals) return;

    if (activeSignalKeys.includes("journaling")) {
      const storedVal = todaySignals["journaling"];
      const newVal = journalingValue ? 1 : 0;
      if (storedVal === undefined || storedVal !== newVal) {
        api.recordSignal(todayTz, "journaling", newVal).catch(() => {});
      }
    }

    if (activeSignalKeys.includes("focusHours")) {
      const storedVal = todaySignals["focusHours"];
      const newVal = focusHoursValue ? 1 : 0;
      if (storedVal === undefined || storedVal !== newVal) {
        api.recordSignal(todayTz, "focusHours", newVal).catch(() => {});
      }
    }
  }, [todaySignals, journalingValue, focusHoursValue, todayTz, user]);

  // === Shower 3-day window ===

  const hasShoweredIn3Days = useMemo(() => {
    if (!recentHistory) return false;
    return recentHistory.some(
      (item: any) =>
        item.metric === "shower" &&
        (item.value === true ||
          item.value === "true" ||
          item.value === 1 ||
          item.value === "1")
    );
  }, [recentHistory]);

  // === Today's live score ===

  // Build signals with computed overrides (matches desktop's signalsWithComputed)
  const signalsWithComputed = useMemo(() => {
    if (!todaySignals) return null;
    return {
      ...todaySignals,
      ...(activeSignalKeys.includes("journaling") ? { journaling: journalingValue } : {}),
      ...(activeSignalKeys.includes("focusHours") ? { focusHours: focusHoursValue } : {}),
    };
  }, [todaySignals, journalingValue, focusHoursValue, activeSignalKeys]);

  // Compute raw score then apply force-100% (matching desktop's display logic)
  const todayScore = useMemo(() => {
    if (!signalsWithComputed) return 0;
    const rawScore = computeDayScore(
      signalsWithComputed,
      activeSignalKeys,
      allSignals,
      signalGoals,
      false,
      goal,
      activeSignalKeys.includes("shower") ? hasShoweredIn3Days : undefined,
    );
    // Apply force-100% for display (desktop does this in refreshSignals, not in computeDayScore)
    return applyForce100(
      signalsWithComputed,
      activeSignalKeys,
      allSignals,
      signalGoals,
      goal,
      rawScore,
      activeSignalKeys.includes("shower") ? hasShoweredIn3Days : undefined,
    );
  }, [signalsWithComputed, allSignals, activeSignalKeys, signalGoals, goal, hasShoweredIn3Days]);

  const todayMeetsGoal = todayScore >= goal;

  // === Week days computation ===

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
        const score = computeDayScore(
          daySignals,
          activeSignalKeys,
          allSignals,
          signalGoals,
          true,
          goal,
        );
        met = score >= goal;
      }

      days.push({
        label: labels[d.getUTCDay()],
        met,
        isToday: i === 0,
        hasData: i === 0 ? true : hasData,
      });
    }
    return days;
  }, [weekHistory, todayMeetsGoal, allSignals, activeSignalKeys, signalGoals, goal]);

  // === Process unfinalized days and persist ===

  useEffect(() => {
    if (!user || !needsProcessing || historyLoading || !historyRows) return;
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    (async () => {
      try {
        const signalsByDate = groupSignalsByDate(historyRows);

        let confirmedCount: number;
        let confirmedPoints: number;
        let lastProcessed: string;
        let needsSave = false;

        if (needsBackfill) {
          // Walk up to 365 days back, starting from earliest data
          const datesWithData = Object.keys(signalsByDate).sort();
          if (datesWithData.length > 0) {
            const earliestDate = datesWithData[0];
            const dayBefore = (() => {
              const d = new Date(earliestDate + "T12:00:00Z");
              d.setUTCDate(d.getUTCDate() - 1);
              return d.toISOString().split("T")[0];
            })();
            const allDates = getDateRange(dayBefore, yesterdayStr);

            const result = walkStreak(
              allDates,
              signalsByDate,
              allSignals,
              activeSignalKeys,
              signalGoals,
              goal,
              0,
              0,
            );
            confirmedCount = result.count;
            confirmedPoints = result.points;
          } else {
            confirmedCount = 0;
            confirmedPoints = 0;
          }

          lastProcessed = yesterdayStr;
          needsSave = true;
        } else if (storedDate! < yesterdayStr) {
          // Incremental: process days after storedDate up to yesterday
          const unprocessedDates = getDateRange(
            (() => {
              const d = new Date(storedDate! + "T12:00:00Z");
              d.setUTCDate(d.getUTCDate() + 1);
              return d.toISOString().split("T")[0];
            })(),
            yesterdayStr
          );

          const result = walkStreak(
            unprocessedDates,
            signalsByDate,
            allSignals,
            activeSignalKeys,
            signalGoals,
            goal,
            storedCount!,
            storedPoints || 0,
          );
          confirmedCount = result.count;
          confirmedPoints = result.points;
          lastProcessed = yesterdayStr;
          needsSave = true;
        } else {
          // Already up to date
          return;
        }

        // Personal best recalculation if stored longest seems too low
        let newLongest = storedLongest;
        if (storedLongest < confirmedCount || (storedLongest === 0 && confirmedCount > 0)) {
          try {
            const fullStart = daysAgo(730); // 2 years
            const fullHistory = await api.getAllSignalHistory(fullStart, yesterdayStr);
            const fullByDate = groupSignalsByDate(fullHistory);
            const fullDatesWithData = Object.keys(fullByDate).sort();

            if (fullDatesWithData.length > 0) {
              const earliest = fullDatesWithData[0];
              const dayBefore = (() => {
                const d = new Date(earliest + "T12:00:00Z");
                d.setUTCDate(d.getUTCDate() - 1);
                return d.toISOString().split("T")[0];
              })();
              const allDatesForMax = getDateRange(dayBefore, yesterdayStr);
              const result = walkStreak(
                allDatesForMax,
                fullByDate,
                allSignals,
                activeSignalKeys,
                signalGoals,
                goal,
                0,
                0,
              );
              if (result.longest > newLongest) {
                newLongest = result.longest;
              }
            }
          } catch (err) {
            console.log("[streak] Failed to recalculate personal best:", err);
          }
        }

        // Display = confirmed + today's live contribution
        const displayCount = confirmedCount + (todayMeetsGoal ? 1 : 0);
        // Today's points contribution (live)
        const todayPoints = todayMeetsGoal ? Math.max(0, todayScore - goal) : 0;
        const displayPoints = confirmedPoints + todayPoints;
        newLongest = Math.max(newLongest, displayCount);

        // Track milestones
        const newMilestones = [...storedMilestones];
        for (const m of MILESTONES) {
          if (displayCount >= m && !newMilestones.includes(m)) {
            newMilestones.push(m);
          }
        }

        const longestChanged = newLongest !== storedLongest;
        const milestonesChanged = newMilestones.length !== storedMilestones.length;

        // Persist to Supabase (same shape as desktop app)
        if (needsSave || longestChanged || milestonesChanged) {
          await api.updateUserPreferences(user.id, {
            signalStreakCount: confirmedCount,
            signalStreakDate: lastProcessed,
            signalStreakPoints: confirmedPoints,
            // Remove old danger flag
            signalStreakDanger: false,
            ...(longestChanged ? { signalStreakLongest: newLongest } : {}),
            ...(milestonesChanged ? { signalStreakMilestones: newMilestones } : {}),
          });
          refreshUser();
        }
      } catch (err) {
        console.log("[streak] Failed to calculate signal streak:", err);
      }
    })();
  }, [user, needsProcessing, historyLoading, historyRows]);

  // === Display values ===

  const confirmedCount =
    storedCount !== undefined && storedCount !== -1 ? storedCount : 0;
  const confirmedPoints = storedPoints || 0;
  const displayStreak = confirmedCount + (todayMeetsGoal ? 1 : 0);
  const todayPoints = todayMeetsGoal ? Math.max(0, todayScore - goal) : 0;
  const displayPoints = Math.round(confirmedPoints + todayPoints);
  // Danger = not enough points to survive a miss AND haven't met today's goal
  const displayDanger = displayPoints < 100 && !todayMeetsGoal;

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
    longest: Math.max(storedLongest, displayStreak),
    milestones: storedMilestones,
    todayScore,
    goal,
    isLoading: historyLoading,
    hasShoweredIn3Days,
    weekDays,
  };
}
