import { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
  useQueryClient,
} from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppState, AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { useAuthStore } from "../src/lib/store/auth";
import { colors } from "../src/lib/theme";
import { offlineQueue } from "../src/lib/offline";
import { api } from "../src/lib/api";
import { syncWidgetData } from "../src/lib/widgetSync";

// ── Background widget refresh ──────────────────────────────────
const BACKGROUND_WIDGET_TASK = "background-widget-refresh";

function getTodayDateInTz(timezone?: string): string {
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

TaskManager.defineTask(BACKGROUND_WIDGET_TASK, async () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayStr = getTodayDateInTz(tz);
    const result = await api.computeDailyScore(todayStr, tz);

    await syncWidgetData({
      signalStreak: result.streak.count,
      signalStreakGoalMet: result.score >= 75,
      signalStreakDanger: result.streak.danger,
      signalStreakTodayScore: result.score,
      signalStreakGoal: 75,
      signalStreakPoints: result.streak.points,
    });

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Tell React Query about network state
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

// Refetch on app focus
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener(
    "change",
    (status: AppStateStatus) => {
      setFocused(status === "active");
    }
  );
  return () => subscription.remove();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60, // 1 hour cache
    },
    mutations: {
      retry: 1,
    },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, []);

  // Register background widget refresh
  useEffect(() => {
    (async () => {
      try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_WIDGET_TASK, {
          minimumInterval: 15 * 60, // 15 minutes (iOS minimum)
          stopOnTerminate: false,
          startOnBoot: true,
        });
      } catch {
        // Background fetch not available (e.g. simulator)
      }
    })();
  }, []);

  return <>{children}</>;
}

// Process any queued offline actions when network comes back
function OfflineSyncManager() {
  const queryClient = useQueryClient();
  const wasOffline = useRef(false);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const isConnected = !!state.isConnected;
      if (isConnected && wasOffline.current) {
        console.log("[offline] Back online, syncing...");
        // Process any queued actions
        offlineQueue.processQueue(async (action) => {
          switch (action.type) {
            case "createTask":
              await api.createTask(action.payload);
              break;
            case "updateTask":
              await api.updateTask(action.payload.taskId, action.payload.updates);
              break;
            case "deleteTask":
              await api.deleteTask(action.payload);
              break;
            case "recordSignal":
              await api.recordSignal(
                action.payload.date,
                action.payload.metric,
                action.payload.value
              );
              break;
            case "createNote":
              await api.createNote(action.payload);
              break;
            case "updateNote":
              await api.updateNote(action.payload.noteId, action.payload.updates);
              break;
            case "deleteNote":
              await api.deleteNote(action.payload);
              break;
            case "submitSession":
              await api.submitSession(action.payload);
              break;
            case "updateEntry":
              await api.updateEntry(
                action.payload.date,
                action.payload.content,
                action.payload.activityContent
              );
              break;
            default:
              console.log("[offline] Unknown action type:", action.type);
          }
        });
        // Refetch everything after sync
        queryClient.invalidateQueries();
      }
      wasOffline.current = !isConnected;
    });
  }, [queryClient]);

  return null;
}

function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>Offline - changes will sync when connected</Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer>
          <OfflineSyncManager />
          <StatusBar style="light" />
          <OfflineBanner />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: "fade",
            }}
          />
        </AuthInitializer>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: colors.warning,
    paddingVertical: 4,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  offlineText: {
    fontSize: 12,
    color: "#000",
    fontWeight: "500",
  },
});
