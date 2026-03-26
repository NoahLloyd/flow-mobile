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
  Flame,
} from "lucide-react-native";
import { colors, spacing, fontSize, borderRadius, getScaleColor } from "../../src/lib/theme";
import { useAuthStore } from "../../src/lib/store/auth";
import { useDailySignals, useRecordSignal } from "../../src/lib/queries/useSignals";
import { useTasks, useUpdateTask } from "../../src/lib/queries/useTasks";
import { useTodaySessions, useSubmitSession } from "../../src/lib/queries/useSessions";
import { getAvailableSignals, SignalConfig } from "../../src/types";
import { getWidgetTaskComplete } from "../../src/lib/widgetSync";
import { useStreak } from "../../src/lib/queries/useStreak";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: signals } = useDailySignals();
  const recordSignal = useRecordSignal();
  const { data: tasks } = useTasks();
  const updateTask = useUpdateTask();
  const { totalHours } = useTodaySessions();
  const submitSession = useSubmitSession();
  const { streak, isDanger, todayScore, goal, points } = useStreak();

  const processWidgetAction = useCallback(async () => {
    const taskComplete = await getWidgetTaskComplete();
    if (taskComplete) {
      updateTask.mutate({ taskId: taskComplete.taskId, updates: { completed: true } });
    }
  }, []);

  useEffect(() => {
    processWidgetAction();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") processWidgetAction();
    });
    return () => sub.remove();
  }, [processWidgetAction]);

  const customSignals = (user?.preferences?.customSignals as Record<string, SignalConfig>) || {};
  const allSignals = getAvailableSignals(customSignals);
  const activeSignalKeys = (user?.preferences?.activeSignals as string[]) || Object.keys(allSignals);

  const [showAddSession, setShowAddSession] = useState(false);
  const [manualMinutes, setManualMinutes] = useState("60");
  const [manualFocus, setManualFocus] = useState(3);

  const dayTasks = (tasks || []).filter((t) => t.type === "day" && !t.completed);

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

  const todayMet = todayScore >= goal;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Top bar: streak + score + settings */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.push("/(tabs)/signals")}
            style={styles.streakPill}
          >
            <Flame size={14} color={isDanger ? colors.error : "#f59e0b"} />
            <Text style={[styles.streakNum, isDanger && { color: colors.error }]}>
              {streak}
            </Text>
          </Pressable>
          <Text style={[styles.scoreText, todayMet && styles.scoreTextMet]}>
            {Math.round(todayScore)}%
          </Text>
          <Text style={styles.pointsText}>
            {points}pt
          </Text>
          <Pressable onPress={() => router.push("/settings")}>
            <Settings size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Focus + Start */}
        <Pressable style={styles.focusRow} onPress={() => router.push("/session/timer")}>
          <View>
            <Text style={styles.focusHours}>{totalHours.toFixed(1)}h</Text>
            <Text style={styles.focusLabel}>focus</Text>
          </View>
          <View style={styles.focusActions}>
            <Pressable
              style={styles.addSessionBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                setShowAddSession(!showAddSession);
              }}
            >
              <Plus size={14} color={colors.textSecondary} />
            </Pressable>
            <View style={styles.startBtn}>
              <Timer size={16} color="#fff" />
              <Text style={styles.startBtnText}>Start</Text>
            </View>
          </View>
        </Pressable>
        {showAddSession && (
          <View style={styles.addSessionForm}>
            <TextInput
              style={styles.addSessionInput}
              value={manualMinutes}
              onChangeText={setManualMinutes}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <Text style={styles.addSessionUnit}>min</Text>
            <View style={styles.addSessionFocusRow}>
              {[1, 2, 3, 4, 5].map((n) => {
                const sc = getScaleColor(n);
                return (
                  <Pressable
                    key={n}
                    style={[
                      styles.addFocusDot,
                      manualFocus === n && { backgroundColor: sc.bg },
                    ]}
                    onPress={() => setManualFocus(n)}
                  >
                    <Text style={[
                      styles.addFocusText,
                      manualFocus === n && { color: sc.text },
                    ]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={styles.addSessionSubmit} onPress={handleManualSession}>
              <Text style={styles.addSessionSubmitText}>Add</Text>
            </Pressable>
          </View>
        )}

        {/* Binary Signals */}
        {binarySignals.length > 0 && (
          <View style={styles.binaryGrid}>
            {binarySignals.map((key) => {
              const config = allSignals[key];
              if (!config) return null;
              const val = signals?.[key];
              const rawBool = val === true || val === "true" || val === 1;
              return (
                <Pressable
                  key={key}
                  style={[styles.binaryChip, rawBool && styles.binaryChipActive, config.isComputed && { opacity: 0.6 }]}
                  onPress={config.isComputed ? undefined : () => handleToggleBinary(key)}
                >
                  {rawBool ? <Check size={12} color="#fff" /> : <X size={12} color={colors.textMuted} />}
                  <Text style={[styles.binaryLabel, rawBool && styles.binaryLabelActive]} numberOfLines={1}>
                    {config.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Scale Signals — color per level like desktop */}
        {scaleSignals.map((key) => {
          const config = allSignals[key];
          if (!config) return null;
          const val = typeof signals?.[key] === "number" ? (signals[key] as number) : 0;
          return (
            <View key={key} style={styles.scaleRow}>
              <Text style={styles.scaleLabel}>{config.label}</Text>
              <View style={styles.scaleDots}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const sc = getScaleColor(n);
                  const isActive = n === val;
                  return (
                    <Pressable
                      key={n}
                      style={[
                        styles.scaleDot,
                        isActive && { backgroundColor: sc.bg },
                      ]}
                      onPress={() => recordSignal.mutate({ metric: key, value: n })}
                    >
                      <Text style={[
                        styles.scaleDotText,
                        isActive && { color: sc.text },
                      ]}>{n}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Number Signals */}
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

        {/* Today's Tasks */}
        {dayTasks.length > 0 && (
          <View style={styles.section}>
            <Pressable
              style={styles.sectionHeader}
              onPress={() => router.push("/(tabs)/tasks")}
            >
              <Text style={styles.sectionTitle}>Today</Text>
              <Text style={styles.sectionCount}>{dayTasks.length}</Text>
            </Pressable>
            {dayTasks.slice(0, 5).map((task) => (
              <Pressable key={task.id} style={styles.taskRow} onPress={() => handleToggleTask(task.id, task.completed)}>
                <Circle size={16} color={colors.textMuted} />
                <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
              </Pressable>
            ))}
            {dayTasks.length > 5 && (
              <Pressable onPress={() => router.push("/(tabs)/tasks")}>
                <Text style={styles.seeAllText}>+{dayTasks.length - 5} more</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakNum: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text,
  },
  scoreText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textMuted,
  },
  scoreTextMet: {
    color: colors.success,
  },
  pointsText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textMuted,
  },
  // Focus
  focusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  focusHours: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text },
  focusLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  focusActions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  addSessionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  startBtnText: { fontSize: fontSize.sm, color: "#fff", fontWeight: "600" },
  // Add session
  addSessionForm: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addSessionInput: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "700",
    width: 40,
    textAlign: "center",
  },
  addSessionUnit: { fontSize: fontSize.xs, color: colors.textMuted },
  addSessionFocusRow: { flexDirection: "row", gap: 2, flex: 1 },
  addFocusDot: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  addFocusText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: "600" },
  addSessionSubmit: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addSessionSubmitText: { fontSize: fontSize.sm, color: "#fff", fontWeight: "600" },
  // Binary signals
  binaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  binaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  scaleLabel: { fontSize: fontSize.sm, color: colors.text, fontWeight: "500" },
  scaleDots: { flexDirection: "row", gap: spacing.xs },
  scaleDot: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.scaleInactive,
    justifyContent: "center",
    alignItems: "center",
  },
  scaleDotText: { fontSize: fontSize.sm, color: colors.scaleInactiveText, fontWeight: "600" },
  // Number
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  numberLabel: { fontSize: fontSize.sm, color: colors.text, fontWeight: "500" },
  numberControls: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  numBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  numBtnText: { fontSize: fontSize.md, color: colors.text, fontWeight: "600" },
  numValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "center",
  },
  // Tasks
  section: {},
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: "600", color: colors.text },
  sectionCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    fontWeight: "500",
    overflow: "hidden",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  taskTitle: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  seeAllText: { color: colors.accentLight, fontSize: fontSize.xs, marginTop: spacing.sm, textAlign: "center" },
});
