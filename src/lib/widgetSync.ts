import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Lazy imports to avoid circular deps and platform issues
let requestWidgetUpdateFn: any = null;

try {
  if (Platform.OS === "android") {
    requestWidgetUpdateFn = require("react-native-android-widget").requestWidgetUpdate;
  }
} catch {
  // Not available
}

export interface WidgetData {
  dailyTasks?: { id: string; title: string }[];
  signalStreak?: number;
  signalStreakGoalMet?: boolean;
  signalStreakDanger?: boolean;
  signalStreakTodayScore?: number;
  signalStreakGoal?: number;
  signalStreakWeek?: { label: string; met: boolean; isToday: boolean; hasData: boolean }[];
  signalStreakPoints?: number;
  tasksRemaining?: number;
  focusHours?: number;
}

// Widget rendering imports — lazy loaded to avoid circular deps
let widgetModules: any = null;
function getWidgetModules() {
  if (!widgetModules) {
    widgetModules = {
      QuickCaptureWidget: require("../widgets/QuickCaptureWidget").QuickCaptureWidget,
      QuickAddTaskWidget: require("../widgets/QuickAddTaskWidget").QuickAddTaskWidget,
      QuickAddNoteWidget: require("../widgets/QuickAddNoteWidget").QuickAddNoteWidget,
      DailyTasksWidget: require("../widgets/DailyTasksWidget").DailyTasksWidget,
      StartFocusWidget: require("../widgets/StartFocusWidget").StartFocusWidget,
      SignalStreakWidget: require("../widgets/SignalStreakWidget").SignalStreakWidget,
    };
  }
  return widgetModules;
}

function renderWidgetByName(name: string, data: WidgetData): React.JSX.Element | null {
  const mods = getWidgetModules();

  switch (name) {
    case "QuickCaptureWidget":
      return React.createElement(mods.QuickCaptureWidget);
    case "QuickAddTaskWidget":
      return React.createElement(mods.QuickAddTaskWidget);
    case "QuickAddNoteWidget":
      return React.createElement(mods.QuickAddNoteWidget);
    case "DailyTasksWidget":
      return React.createElement(mods.DailyTasksWidget, { tasks: data.dailyTasks || [] });
    case "StartFocusWidget":
      return React.createElement(mods.StartFocusWidget);
    case "SignalStreakWidget":
      return React.createElement(mods.SignalStreakWidget, {
        streak: data.signalStreak || 0,
        goalMet: data.signalStreakGoalMet || false,
        isDanger: data.signalStreakDanger || false,
        variant: "bold",
      });
    case "SignalStreakCompactWidget":
      return React.createElement(mods.SignalStreakWidget, {
        streak: data.signalStreak || 0,
        goalMet: data.signalStreakGoalMet || false,
        isDanger: data.signalStreakDanger || false,
        variant: "compact",
      });
    case "SignalStreakWeekWidget":
      return React.createElement(mods.SignalStreakWidget, {
        streak: data.signalStreak || 0,
        goalMet: data.signalStreakGoalMet || false,
        isDanger: data.signalStreakDanger || false,
        week: data.signalStreakWeek || [],
        variant: "week",
      });
    case "SignalStreakRingWidget":
      return React.createElement(mods.SignalStreakWidget, {
        streak: data.signalStreak || 0,
        goalMet: data.signalStreakGoalMet || false,
        isDanger: data.signalStreakDanger || false,
        todayScore: data.signalStreakTodayScore || 0,
        goal: data.signalStreakGoal || 75,
        variant: "ring",
      });
    case "SignalStreakScoreWidget":
      return React.createElement(mods.SignalStreakWidget, {
        streak: data.signalStreak || 0,
        goalMet: data.signalStreakGoalMet || false,
        isDanger: data.signalStreakDanger || false,
        todayScore: data.signalStreakTodayScore || 0,
        goal: data.signalStreakGoal || 75,
        variant: "score",
      });
    case "SignalStreakDuoWidget":
      return React.createElement(mods.SignalStreakWidget, {
        streak: data.signalStreak || 0,
        goalMet: data.signalStreakGoalMet || false,
        isDanger: data.signalStreakDanger || false,
        variant: "duo",
      });
    case "SignalStreakMiniWidget":
      return React.createElement(mods.SignalStreakWidget, {
        streak: data.signalStreak || 0,
        goalMet: data.signalStreakGoalMet || false,
        isDanger: data.signalStreakDanger || false,
        variant: "mini",
      });
    case "SignalStreakFlameWidget":
      return React.createElement(mods.SignalStreakWidget, {
        streak: data.signalStreak || 0,
        goalMet: data.signalStreakGoalMet || false,
        isDanger: data.signalStreakDanger || false,
        variant: "flame",
      });
    default:
      return null;
  }
}

const ALL_WIDGETS = [
  "QuickCaptureWidget",
  "QuickAddTaskWidget",
  "QuickAddNoteWidget",
  "DailyTasksWidget",
  "StartFocusWidget",
  "SignalStreakWidget",
  "SignalStreakCompactWidget",
  "SignalStreakWeekWidget",
  "SignalStreakRingWidget",
  "SignalStreakScoreWidget",
  "SignalStreakDuoWidget",
  "SignalStreakMiniWidget",
  "SignalStreakFlameWidget",
];

/**
 * Sync widget data to AsyncStorage and trigger widget re-renders.
 * Call this whenever signals, tasks, or sessions change.
 */
export async function syncWidgetData(data: WidgetData) {
  try {
    const existing = await AsyncStorage.getItem("widget_data");
    const parsed = existing ? JSON.parse(existing) : {};
    const merged = { ...parsed, ...data };
    await AsyncStorage.setItem("widget_data", JSON.stringify(merged));

    // Request widget re-renders on Android
    if (requestWidgetUpdateFn && Platform.OS === "android") {
      for (const name of ALL_WIDGETS) {
        try {
          await requestWidgetUpdateFn({
            widgetName: name,
            renderWidget: () => renderWidgetByName(name, merged),
          });
        } catch {
          // Widget might not be on home screen — that's fine
        }
      }
    }
  } catch {
    // Ignore errors - widget sync is best-effort
  }
}

/**
 * Check if there's a pending task completion from a widget tap.
 * Returns the data and clears it, or null if nothing pending.
 */
export async function getWidgetTaskComplete(): Promise<{
  taskId: string;
  timestamp: number;
} | null> {
  try {
    const data = await AsyncStorage.getItem("widget_complete_task");
    if (data) {
      await AsyncStorage.removeItem("widget_complete_task");
      return JSON.parse(data);
    }
  } catch {
    // ignore
  }
  return null;
}
