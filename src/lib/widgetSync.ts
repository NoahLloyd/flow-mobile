import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

let requestWidgetUpdate: ((name: string) => void) | null = null;

try {
  if (Platform.OS === "android") {
    const mod = require("react-native-android-widget");
    requestWidgetUpdate = mod.requestWidgetUpdate;
  }
} catch {
  // Not available
}

/**
 * Sync widget data to AsyncStorage so widgets can read it.
 * Call this whenever signals, tasks, or sessions change.
 */
export async function syncWidgetData(data: {
  binarySignals?: Record<string, boolean>;
  signalLabels?: Record<string, string>;
  focusHours?: number;
  tasksRemaining?: number;
  signalScore?: number;
}) {
  try {
    const existing = await AsyncStorage.getItem("widget_data");
    const parsed = existing ? JSON.parse(existing) : {};
    const merged = { ...parsed, ...data };
    await AsyncStorage.setItem("widget_data", JSON.stringify(merged));

    // Request widget updates on Android
    if (requestWidgetUpdate && Platform.OS === "android") {
      requestWidgetUpdate("QuickCaptureWidget");
      requestWidgetUpdate("SignalToggleWidget");
      requestWidgetUpdate("TodaySummaryWidget");
    }
  } catch {
    // Ignore errors - widget sync is best-effort
  }
}

/**
 * Check if there's a pending signal toggle from a widget tap.
 * Returns the toggle data and clears it, or null if nothing pending.
 */
export async function getWidgetSignalToggle(): Promise<{
  metric: string;
  value: boolean;
  timestamp: number;
} | null> {
  try {
    const data = await AsyncStorage.getItem("widget_signal_toggle");
    if (data) {
      await AsyncStorage.removeItem("widget_signal_toggle");
      return JSON.parse(data);
    }
  } catch {
    // ignore
  }
  return null;
}
