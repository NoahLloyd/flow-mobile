import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  AppState,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Timer,
  CheckCircle2,
  Circle,
  Settings,
  Check,
  X,
  Plus,
} from "lucide-react-native";
import { colors, spacing, fontSize, borderRadius } from "../../src/lib/theme";
import { useAuthStore } from "../../src/lib/store/auth";
import { useDailySignals, useRecordSignal } from "../../src/lib/queries/useSignals";
import { useTasks, useUpdateTask } from "../../src/lib/queries/useTasks";
import { useTodaySessions, useSubmitSession } from "../../src/lib/queries/useSessions";
import { getAvailableSignals, SignalConfig } from "../../src/types";
import { getWidgetSignalToggle, syncWidgetData } from "../../src/lib/widgetSync";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: signals } = useDailySignals();
  const recordSignal = useRecordSignal();
  const { data: tasks } = useTasks();
  const updateTask = useUpdateTask();
  const { totalHours } = useTodaySessions();
  const submitSession = useSubmitSession();

  // Process any pending widget signal toggles when app comes to foreground
  const processWidgetToggle = useCallback(async () => {
    const toggle = await getWidgetSignalToggle();
    if (toggle) {
      recordSignal.mutate({ metric: toggle.metric, value: toggle.value });
    }
  }, []);

  useEffect(() => {
    processWidgetToggle();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") processWidgetToggle();
    });
    return () => sub.remove();
  }, [processWidgetToggle]);

  const customSignals = (user?.preferences?.customSignals as Record<string, SignalConfig>) || {};
  const allSignals = getAvailableSignals(customSignals);
  const activeSignalKeys = (user?.preferences?.activeSignals as string[]) || Object.keys(allSignals);

  // Sync signal data to widgets whenever signals load
  useEffect(() => {
    if (!signals) return;
    const binarySignals: Record<string, boolean> = {};
    const signalLabels: Record<string, string> = {};
    for (const key of activeSignalKeys) {
      const config = allSignals[key];
      if (config?.type === "binary") {
        const val = signals[key];
        binarySignals[key] = val === true || val === "true" || val === 1;
        signalLabels[key] = config.label;
      }
    }
    syncWidgetData({ binarySignals, signalLabels });
  }, [signals]);

  // Focus card manual entry
  const [showAddSession, setShowAddSession] = useState(false);
  const [manualMinutes, setManualMinutes] = useState("60");
  const [manualFocus, setManualFocus] = useState(3);

  const dayTasks = (tasks || []).filter((t) => t.type === "day" && !t.completed);

  // Signal helpers
  const binarySignals = activeSignalKeys.filter((key) => allSignals[key]?.type === "binary");
  const scaleSignals = activeSignalKeys.filter((key) => allSignals[key]?.type === "scale");
  const numberSignals = activeSignalKeys.filter(
    (key) => allSignals[key]?.type === "number" || allSignals[key]?.type === "water"
  );

  const handleToggleBinary = (key: string) => {
    const val = signals?.[key];
    const boolVal = val === true || val === "true" || val === 1;
    recordSignal.mutate({ metric: key, value: !boolVal });
  };

  const handleManualSession = () => {
    const mins = parseInt(manualMinutes) || 60;
    submitSession.mutate(
      { task: "", project: "", minutes: mins, focus: manualFocus, notes: "", created_at: new Date().toISOString() },
      {
        onSuccess: () => {
          setShowAddSession(false);
          setManualMinutes("60");
          setManualFocus(3);
        },
      }
    );
  };

  const handleToggleTask = (taskId: string, completed: boolean) => {
    updateTask.mutate({ taskId, updates: { completed: !completed } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>
            {getGreeting()}, {user?.name?.split(" ")[0] || ""}
          </Text>
          <Pressable onPress={() => router.push("/settings")}>
            <Settings size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Binary Signals - compact grid */}
        {binarySignals.length > 0 && (
          <View style={styles.binaryGrid}>
            {binarySignals.map((key) => {
              const config = allSignals[key];
              if (!config) return null;
              const val = signals?.[key];
              const boolVal = val === true || val === "true" || val === 1;
              return (
                <Pressable
                  key={key}
                  style={[styles.binaryChip, boolVal && styles.binaryChipActive, config.isComputed && { opacity: 0.6 }]}
                  onPress={config.isComputed ? undefined : () => handleToggleBinary(key)}
                >
                  {boolVal ? <Check size={14} color="#fff" /> : <X size={14} color={colors.textMuted} />}
                  <Text style={[styles.binaryLabel, boolVal && styles.binaryLabelActive]} numberOfLines={1}>
                    {config.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Scale Signals */}
        {scaleSignals.map((key) => {
          const config = allSignals[key];
          if (!config) return null;
          const val = typeof signals?.[key] === "number" ? (signals[key] as number) : 0;
          return (
            <View key={key} style={styles.scaleRow}>
              <Text style={styles.scaleLabel}>{config.label}</Text>
              <View style={styles.scaleDots}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    style={[styles.scaleDot, n <= val && styles.scaleDotActive]}
                    onPress={() => recordSignal.mutate({ metric: key, value: n })}
                  >
                    <Text style={[styles.scaleDotText, n <= val && { color: "#fff" }]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}

        {/* Number Signals - compact */}
        {numberSignals.map((key) => {
          const config = allSignals[key];
          if (!config) return null;
          const val = typeof signals?.[key] === "number" ? (signals[key] as number) : 0;
          const step = key.includes("water") || key === "waterIntake" ? 250
            : key.includes("sleep") || key === "sleep" ? 0.5
            : key.includes("steps") || key === "steps" ? 1000
            : 5;
          return (
            <View key={key} style={styles.numberRow}>
              <Text style={styles.numberLabel}>{config.label}</Text>
              <View style={styles.numberControls}>
                <Pressable style={styles.numBtn} onPress={() => recordSignal.mutate({ metric: key, value: Math.max(0, val - step) })}>
                  <Text style={styles.numBtnText}>-</Text>
                </Pressable>
                <Text style={styles.numValue}>{val}</Text>
                <Pressable style={styles.numBtn} onPress={() => recordSignal.mutate({ metric: key, value: Math.min(config.max || 999, val + step) })}>
                  <Text style={styles.numBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* Focus Hours Card */}
        <View style={styles.focusCard}>
          <View style={styles.focusCardHeader}>
            <View>
              <Text style={styles.focusHours}>{totalHours.toFixed(1)}h</Text>
              <Text style={styles.focusLabel}>focus today</Text>
            </View>
            <View style={styles.focusActions}>
              <Pressable style={styles.startBtn} onPress={() => router.push("/session/timer")}>
                <Timer size={18} color="#fff" />
                <Text style={styles.startBtnText}>Start</Text>
              </Pressable>
              <Pressable
                style={styles.addBtn}
                onPress={() => setShowAddSession(!showAddSession)}
              >
                <Plus size={18} color={colors.accent} />
              </Pressable>
            </View>
          </View>
          {showAddSession && (
            <View style={styles.addSessionForm}>
              <View style={styles.addSessionRow}>
                <TextInput
                  style={styles.addSessionInput}
                  value={manualMinutes}
                  onChangeText={setManualMinutes}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={styles.addSessionUnit}>min</Text>
                <View style={styles.addSessionFocusRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                      key={n}
                      style={[styles.addFocusDot, manualFocus === n && styles.addFocusDotActive]}
                      onPress={() => setManualFocus(n)}
                    >
                      <Text style={[styles.addFocusText, manualFocus === n && { color: "#fff" }]}>{n}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={styles.addSessionSubmit} onPress={handleManualSession}>
                  <Text style={styles.addSessionSubmitText}>Add</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Today's Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>
          {dayTasks.length === 0 ? (
            <Text style={styles.emptyText}>No tasks for today</Text>
          ) : (
            dayTasks.map((task) => (
              <Pressable key={task.id} style={styles.taskRow} onPress={() => handleToggleTask(task.id, task.completed)}>
                {task.completed ? (
                  <CheckCircle2 size={20} color={colors.success} />
                ) : (
                  <Circle size={20} color={colors.textMuted} />
                )}
                <Text style={styles.taskTitle}>{task.title}</Text>
              </Pressable>
            ))
          )}
          {dayTasks.length > 0 && (
            <Pressable onPress={() => router.push("/(tabs)/tasks")}>
              <Text style={styles.seeAllText}>All tasks</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  greeting: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text },
  // Binary signals
  binaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  binaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  binaryChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  binaryLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  binaryLabelActive: { color: "#fff" },
  // Scale
  scaleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scaleLabel: { fontSize: fontSize.sm, color: colors.text, fontWeight: "500" },
  scaleDots: { flexDirection: "row", gap: spacing.xs },
  scaleDot: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  scaleDotActive: { backgroundColor: colors.signalScale },
  scaleDotText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: "600" },
  // Number
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  numberLabel: { fontSize: fontSize.sm, color: colors.text, fontWeight: "500" },
  numberControls: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  numBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  numBtnText: { fontSize: fontSize.lg, color: colors.text, fontWeight: "600" },
  numValue: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: "700",
    minWidth: 40,
    textAlign: "center",
  },
  // Focus card
  focusCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  focusCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  focusHours: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text },
  focusLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  focusActions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  startBtnText: { fontSize: fontSize.sm, color: "#fff", fontWeight: "600" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  addSessionForm: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  addSessionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  addSessionInput: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: "700",
    width: 50,
    textAlign: "center",
  },
  addSessionUnit: { fontSize: fontSize.xs, color: colors.textMuted },
  addSessionFocusRow: { flexDirection: "row", gap: 2, flex: 1 },
  addFocusDot: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  addFocusDotActive: { backgroundColor: colors.accent },
  addFocusText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: "600" },
  addSessionSubmit: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addSessionSubmitText: { fontSize: fontSize.sm, color: "#fff", fontWeight: "600" },
  // Tasks
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  taskTitle: { fontSize: fontSize.md, color: colors.text, flex: 1 },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm },
  seeAllText: { color: colors.accentLight, fontSize: fontSize.sm, marginTop: spacing.sm, textAlign: "center" },
});
