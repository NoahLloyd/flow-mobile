import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Play, Pause, Square, ChevronLeft, ChevronDown, Timer, Clock } from "lucide-react-native";
import { colors, spacing, fontSize, borderRadius } from "../../src/lib/theme";
import { useSubmitSession } from "../../src/lib/queries/useSessions";
import { useTasks } from "../../src/lib/queries/useTasks";
import { useAuthStore } from "../../src/lib/store/auth";

const FOCUS_LABELS = ["", "Distracted", "Browsing", "Attentive", "Locked-in", "Flow"];
const FOCUS_COLORS = ["", colors.error, colors.warning, colors.warning, colors.success, colors.accent];

export default function TimerScreen() {
  const router = useRouter();
  const submitSession = useSubmitSession();
  const { data: tasks } = useTasks();
  const { user } = useAuthStore();

  const defaultProject = (user?.preferences?.defaultProject as string) || "";
  const defaultMinutes = (user?.preferences?.defaultMinutes as number) || 60;
  const dayTasks = (tasks || []).filter((t) => t.type === "day" && !t.completed);

  const [task, setTask] = useState("");
  const [project, setProject] = useState(defaultProject);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [timerMode, setTimerMode] = useState<"stopwatch" | "countdown">("stopwatch");
  const [countdownMinutes, setCountdownMinutes] = useState(String(defaultMinutes));
  const [showSeconds, setShowSeconds] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds elapsed
  const [countdownTotal, setCountdownTotal] = useState(0); // total seconds for countdown
  const [showComplete, setShowComplete] = useState(false);
  const [countdownFinished, setCountdownFinished] = useState(false);
  const [focus, setFocus] = useState(3);
  const [notes, setNotes] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          // Check countdown completion
          if (timerMode === "countdown" && next >= countdownTotal) {
            setIsRunning(false);
            setCountdownFinished(true);
            Vibration.vibrate([0, 500, 200, 500]);
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timerMode, countdownTotal]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (showSeconds) {
      if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      return `${m}:${String(s).padStart(2, "0")}`;
    }
    // Minutes only
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getDisplayTime = () => {
    if (timerMode === "countdown") {
      const remaining = Math.max(0, countdownTotal - elapsed);
      return formatTime(remaining);
    }
    return formatTime(elapsed);
  };

  const handleStart = () => {
    if (timerMode === "countdown") {
      const mins = parseInt(countdownMinutes) || 60;
      setCountdownTotal(mins * 60);
    }
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
    if (elapsed >= 60) {
      setShowComplete(true);
    } else {
      Alert.alert(
        "Too short",
        "Session must be at least 1 minute. Continue?",
        [
          { text: "Discard", onPress: () => router.back(), style: "destructive" },
          { text: "Continue", onPress: () => setIsRunning(true) },
        ]
      );
    }
  };

  const handleSubmit = () => {
    const minutes = Math.round(elapsed / 60);
    submitSession.mutate(
      { task, project, minutes, focus, notes, created_at: new Date().toISOString() },
      { onSuccess: () => router.back() }
    );
  };

  // Countdown finished - show completion
  if (countdownFinished && !showComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneOverlay}>
          <Text style={styles.doneEmoji}>Done!</Text>
          <Text style={styles.doneTime}>{Math.round(elapsed / 60)} min</Text>
          <View style={styles.doneActions}>
            <Pressable
              style={styles.doneBtn}
              onPress={() => {
                setCountdownFinished(false);
                setShowComplete(true);
              }}
            >
              <Text style={styles.doneBtnText}>Save Session</Text>
            </Pressable>
            <Pressable
              style={styles.doneBtnSecondary}
              onPress={() => router.back()}
            >
              <Text style={styles.doneBtnSecondaryText}>Discard</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (showComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completeContent}>
          <Text style={styles.completeTitle}>Session Complete</Text>
          <Text style={styles.completeTime}>
            {formatTime(elapsed)}
          </Text>

          <Text style={styles.label}>Focus Rating</Text>
          <View style={styles.focusRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                style={[
                  styles.focusDot,
                  focus === n && { backgroundColor: FOCUS_COLORS[n], borderColor: FOCUS_COLORS[n] },
                ]}
                onPress={() => setFocus(n)}
              >
                <Text
                  style={[styles.focusDotText, focus === n && styles.focusDotTextActive]}
                >
                  {n}
                </Text>
                <Text
                  style={[styles.focusLabel, focus === n && styles.focusDotTextActive]}
                >
                  {FOCUS_LABELS[n]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="What did you work on?"
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitText}>Save Session</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color={colors.text} />
      </Pressable>

      <View style={styles.timerContent}>
        {!isRunning && elapsed === 0 && (
          <View style={styles.setupFields}>
            {/* Timer Mode Toggle */}
            <View style={styles.modeRow}>
              <Pressable
                style={[styles.modeBtn, timerMode === "stopwatch" && styles.modeBtnActive]}
                onPress={() => setTimerMode("stopwatch")}
              >
                <Clock size={16} color={timerMode === "stopwatch" ? "#fff" : colors.textSecondary} />
                <Text style={[styles.modeBtnText, timerMode === "stopwatch" && styles.modeBtnTextActive]}>
                  Stopwatch
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modeBtn, timerMode === "countdown" && styles.modeBtnActive]}
                onPress={() => setTimerMode("countdown")}
              >
                <Timer size={16} color={timerMode === "countdown" ? "#fff" : colors.textSecondary} />
                <Text style={[styles.modeBtnText, timerMode === "countdown" && styles.modeBtnTextActive]}>
                  Timer
                </Text>
              </Pressable>
            </View>

            {/* Countdown duration */}
            {timerMode === "countdown" && (
              <View style={styles.countdownRow}>
                <TextInput
                  style={styles.countdownInput}
                  value={countdownMinutes}
                  onChangeText={setCountdownMinutes}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={styles.countdownLabel}>minutes</Text>
              </View>
            )}

            {/* Task picker */}
            <Pressable
              style={styles.input}
              onPress={() => setShowTaskPicker(!showTaskPicker)}
            >
              <View style={styles.pickerRow}>
                <Text style={[styles.pickerText, !task && { color: colors.textMuted }]}>
                  {task || "Select a task..."}
                </Text>
                <ChevronDown size={18} color={colors.textMuted} />
              </View>
            </Pressable>
            {showTaskPicker && dayTasks.length > 0 && (
              <View style={styles.pickerDropdown}>
                <ScrollView style={{ maxHeight: 160 }}>
                  {dayTasks.map((t) => (
                    <Pressable
                      key={t.id}
                      style={styles.pickerItem}
                      onPress={() => { setTask(t.title); setShowTaskPicker(false); }}
                    >
                      <Text style={styles.pickerItemText}>{t.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Or type a task name..."
              placeholderTextColor={colors.textMuted}
              value={task}
              onChangeText={(v) => { setTask(v); setShowTaskPicker(false); }}
            />
            <TextInput
              style={styles.input}
              placeholder="Project (optional)"
              placeholderTextColor={colors.textMuted}
              value={project}
              onChangeText={setProject}
            />
          </View>
        )}

        {/* Timer display - tap to toggle seconds */}
        <Pressable onPress={() => setShowSeconds(!showSeconds)}>
          <Text style={[
            styles.timerDisplay,
            countdownFinished && styles.timerDisplayDone,
            timerMode === "countdown" && elapsed > 0 && (countdownTotal - elapsed) <= 60 && styles.timerDisplayUrgent,
          ]}>
            {getDisplayTime()}
          </Text>
        </Pressable>

        <View style={styles.controlRow}>
          {!isRunning ? (
            elapsed === 0 ? (
              <Pressable style={styles.playButton} onPress={handleStart}>
                <Play size={32} color="#fff" />
              </Pressable>
            ) : (
              <>
                <Pressable style={styles.playButton} onPress={() => setIsRunning(true)}>
                  <Play size={28} color="#fff" />
                </Pressable>
                <Pressable style={styles.stopButton} onPress={handleStop}>
                  <Square size={28} color="#fff" />
                </Pressable>
              </>
            )
          ) : (
            <>
              <Pressable style={styles.pauseButton} onPress={() => setIsRunning(false)}>
                <Pause size={28} color={colors.text} />
              </Pressable>
              <Pressable style={styles.stopButton} onPress={handleStop}>
                <Square size={28} color="#fff" />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  backButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  timerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  setupFields: { width: "100%", marginBottom: spacing.xxl, gap: spacing.md },
  modeRow: { flexDirection: "row", gap: spacing.sm },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  modeBtnText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: "500" },
  modeBtnTextActive: { color: "#fff" },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  countdownInput: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    minWidth: 100,
  },
  countdownLabel: { fontSize: fontSize.md, color: colors.textSecondary },
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  timerDisplay: {
    fontSize: 72,
    fontWeight: "200",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    marginBottom: spacing.xxl,
  },
  timerDisplayDone: { color: colors.success },
  timerDisplayUrgent: { color: colors.warning },
  controlRow: { flexDirection: "row", gap: spacing.lg },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  pauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center",
  },
  // Done overlay
  doneOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  doneEmoji: {
    fontSize: fontSize.hero,
    fontWeight: "700",
    color: colors.success,
    marginBottom: spacing.md,
  },
  doneTime: {
    fontSize: fontSize.xxl,
    fontWeight: "200",
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  doneActions: { gap: spacing.md, width: "100%" },
  doneBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  doneBtnText: { fontSize: fontSize.md, fontWeight: "600", color: "#fff" },
  doneBtnSecondary: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneBtnSecondaryText: { fontSize: fontSize.md, color: colors.textSecondary },
  // Complete screen
  completeContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  completeTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text, textAlign: "center" },
  completeTime: {
    fontSize: fontSize.hero,
    fontWeight: "200",
    color: colors.accent,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  focusRow: { flexDirection: "row", gap: spacing.sm },
  focusDot: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  focusDotText: { fontSize: fontSize.lg, color: colors.textMuted, fontWeight: "600" },
  focusDotTextActive: { color: "#fff" },
  focusLabel: { fontSize: 8, color: colors.textMuted, marginTop: 2 },
  pickerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickerText: { fontSize: fontSize.md, color: colors.text },
  pickerDropdown: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  pickerItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemText: { fontSize: fontSize.sm, color: colors.text },
  notesInput: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  submitText: { fontSize: fontSize.md, fontWeight: "600", color: "#fff" },
});
