import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Mic,
  PenLine,
  Heart,
  Eye,
  Wind,
  CheckSquare,
  Star,
  Timer,
  ChevronUp,
  ChevronDown,
} from "lucide-react-native";
import { colors, spacing, fontSize, borderRadius } from "../../src/lib/theme";
import { useAuthStore } from "../../src/lib/store/auth";
import {
  useTodayEntry,
  useUpdateEntry,
  useMorningEntries,
} from "../../src/lib/queries/useMorning";
import { MorningActivity } from "../../src/types";
import { useVoiceInput } from "../../src/lib/voice";

const DEFAULT_ACTIVITIES: MorningActivity[] = [
  {
    id: "writing",
    type: "writing",
    enabled: true,
    timerMinutes: 15,
    title: "Stream of Consciousness",
  },
  {
    id: "gratitude",
    type: "gratitude",
    enabled: true,
    timerMinutes: 5,
    title: "Gratitude",
  },
  {
    id: "affirmations",
    type: "affirmations",
    enabled: true,
    timerMinutes: 3,
    title: "Affirmations",
  },
];

const ACTIVITY_ICONS: Record<string, any> = {
  writing: PenLine,
  gratitude: Heart,
  affirmations: Star,
  visualization: Eye,
  breathwork: Wind,
  tasks: CheckSquare,
};

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function MorningScreen() {
  const { user } = useAuthStore();
  const today = getTodayDate();
  const { data: entryData } = useTodayEntry(today);
  const { data: allEntries } = useMorningEntries();
  const updateEntry = useUpdateEntry();

  // Activities from user preferences (weekly schedule or legacy)
  const activities: MorningActivity[] = (() => {
    const prefs = user?.preferences;
    if (prefs?.weeklyMorningSchedule) {
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayName = days[new Date().getDay()];
      const dayActivities = prefs.weeklyMorningSchedule[dayName];
      if (dayActivities) {
        return dayActivities.filter((a: MorningActivity) => a.enabled);
      }
    }
    if (prefs?.morningActivities) {
      return prefs.morningActivities.filter((a: MorningActivity) => a.enabled);
    }
    return DEFAULT_ACTIVITIES;
  })();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timerMode, setTimerMode] = useState<"countdown" | "stopwatch">("countdown");
  const [timerActive, setTimerActive] = useState(false);
  const [timerComplete, setTimerComplete] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [writingText, setWritingText] = useState("");
  const [gratitudeText, setGratitudeText] = useState("");
  const [affirmationsText, setAffirmationsText] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedWriting = useRef(false);
  const voice = useVoiceInput();
  const lastTranscriptRef = useRef("");

  const currentActivity = activities[currentIndex];

  // Initialize from saved entry
  useEffect(() => {
    if (entryData?.activityContent) {
      setWritingText(entryData.activityContent.writing || "");
      setGratitudeText(entryData.activityContent.gratitude || "");
      setAffirmationsText(entryData.activityContent.affirmations || "");
      if (typeof entryData.activityContent.lastActivityIndex === "number") {
        const idx = entryData.activityContent.lastActivityIndex;
        if (idx >= 0 && idx < activities.length) {
          setCurrentIndex(idx);
        }
      }
    }
  }, [entryData]);

  // Reset timer when activity changes
  useEffect(() => {
    if (currentActivity?.timerMinutes) {
      setTimeRemaining(currentActivity.timerMinutes * 60);
    }
    setStopwatchTime(0);
    setTimerActive(false);
    setTimerComplete(false);
    hasStartedWriting.current = false;
  }, [currentIndex]);

  // Timer tick
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        if (timerMode === "countdown") {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              setTimerActive(false);
              setTimerComplete(true);
              return 0;
            }
            return prev - 1;
          });
        } else {
          setStopwatchTime((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, timerMode]);

  // Auto-start timer on first typing
  const handleTextChange = (text: string, setter: (t: string) => void) => {
    setter(text);
    if (!hasStartedWriting.current && text.trim() !== "") {
      hasStartedWriting.current = true;
      if (!timerActive && !timerComplete) {
        setTimerActive(true);
      }
    }
  };

  // Auto-save
  const save = useCallback(() => {
    const activityContent = {
      writing: writingText,
      gratitude: gratitudeText,
      affirmations: affirmationsText,
      lastActivityIndex: currentIndex,
    };
    updateEntry.mutate({ date: today, content: "", activityContent });
  }, [writingText, gratitudeText, affirmationsText, currentIndex, today]);

  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(save, 2000);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [writingText, gratitudeText, affirmationsText]);

  // Voice: append transcript to current text activity
  useEffect(() => {
    if (voice.transcript && voice.transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = voice.transcript;
      const actType = currentActivity?.type;
      if (actType === "writing" || actType === "gratitude" || actType === "affirmations") {
        const setter = actType === "writing" ? setWritingText
          : actType === "gratitude" ? setGratitudeText
          : setAffirmationsText;
        setter((prev) => prev ? prev + " " + voice.transcript : voice.transcript);
      }
    }
  }, [voice.transcript, currentActivity?.type]);

  const formatTime = (seconds: number, showSeconds = false) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (showSeconds || seconds < 60) {
      return `${m}:${String(s).padStart(2, "0")}`;
    }
    return `${m} min`;
  };

  const displayTime = timerMode === "countdown" ? timeRemaining : stopwatchTime;

  const getTextForActivity = () => {
    switch (currentActivity?.type) {
      case "writing": return writingText;
      case "gratitude": return gratitudeText;
      case "affirmations": return affirmationsText;
      default: return "";
    }
  };

  const setTextForActivity = (text: string) => {
    switch (currentActivity?.type) {
      case "writing": handleTextChange(text, setWritingText); break;
      case "gratitude": handleTextChange(text, setGratitudeText); break;
      case "affirmations": handleTextChange(text, setAffirmationsText); break;
    }
  };

  const goToNext = () => {
    save();
    if (currentIndex < activities.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    save();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (currentActivity?.timerMinutes) {
      setTimeRemaining(currentActivity.timerMinutes * 60);
    }
    setStopwatchTime(0);
    setTimerActive(false);
    setTimerComplete(false);
  };

  // Auto-start timer for visualization/breathwork
  useEffect(() => {
    if (
      currentActivity &&
      (currentActivity.type === "visualization" || currentActivity.type === "breathwork") &&
      !timerActive &&
      !timerComplete
    ) {
      setTimerActive(true);
    }
  }, [currentIndex, currentActivity]);

  const Icon = ACTIVITY_ICONS[currentActivity?.type] || PenLine;
  const isTextActivity =
    currentActivity?.type === "writing" ||
    currentActivity?.type === "gratitude" ||
    currentActivity?.type === "affirmations";

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.streak}>
          {allEntries?.streak || 0} day streak
        </Text>
      </View>

      {/* Activity Progress */}
      <View style={styles.progressRow}>
        {activities.map((a, i) => (
          <Pressable
            key={a.id}
            style={[
              styles.progressDot,
              i === currentIndex && styles.progressDotActive,
              i < currentIndex && styles.progressDotComplete,
            ]}
            onPress={() => { save(); setCurrentIndex(i); }}
          />
        ))}
      </View>

      {/* Activity Nav + Timer */}
      <View style={styles.controlBar}>
        {/* Prev */}
        <Pressable
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          onPress={goToPrev}
          disabled={currentIndex === 0}
        >
          <SkipBack size={18} color={currentIndex === 0 ? colors.textMuted : colors.text} />
        </Pressable>

        {/* Activity label */}
        <View style={styles.activityInfo}>
          <Icon size={18} color={colors.accent} />
          <Text style={styles.activityTitle}>
            {currentActivity?.title} ({currentIndex + 1}/{activities.length})
          </Text>
        </View>

        {/* Next */}
        <Pressable
          style={[
            styles.navButton,
            currentIndex === activities.length - 1 && styles.navButtonDisabled,
          ]}
          onPress={goToNext}
          disabled={currentIndex === activities.length - 1}
        >
          <SkipForward
            size={18}
            color={
              currentIndex === activities.length - 1
                ? colors.textMuted
                : colors.text
            }
          />
        </Pressable>
      </View>

      {/* Timer Row */}
      <View style={styles.timerRow}>
        <Pressable
          style={styles.timerModeBtn}
          onPress={() => setTimerMode(timerMode === "countdown" ? "stopwatch" : "countdown")}
        >
          <Timer size={14} color={colors.textSecondary} />
          <Text style={styles.timerModeText}>
            {timerMode === "countdown" ? "Countdown" : "Stopwatch"}
          </Text>
          <ChevronDown size={12} color={colors.textMuted} />
        </Pressable>

        <View style={styles.timerControls}>
          <Pressable
            style={styles.timerBtn}
            onPress={() => setTimerActive(!timerActive)}
          >
            {timerActive ? (
              <Pause size={16} color={colors.text} />
            ) : (
              <Play size={16} color={colors.text} />
            )}
          </Pressable>
          <Text
            style={[
              styles.timerText,
              timerComplete && styles.timerTextComplete,
              timerActive && styles.timerTextActive,
            ]}
          >
            {formatTime(displayTime, timerActive || timerComplete || displayTime < 120)}
          </Text>
          <Pressable style={styles.timerBtn} onPress={resetTimer}>
            <RotateCcw size={14} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Timer completion banner */}
      {timerComplete && (
        <View style={styles.completeBanner}>
          <Text style={styles.completeText}>
            {currentActivity?.timerMinutes}-min session complete!
          </Text>
          <View style={styles.completeActions}>
            <Pressable style={styles.completeBtn} onPress={resetTimer}>
              <Text style={styles.completeBtnText}>Restart</Text>
            </Pressable>
            {currentIndex < activities.length - 1 && (
              <Pressable style={styles.completeNextBtn} onPress={goToNext}>
                <Text style={styles.completeNextBtnText}>Next</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Writing Area */}
      {isTextActivity && (
        <View style={styles.writingContainer}>
          <TextInput
            style={styles.writingInput}
            placeholder={
              currentActivity?.type === "writing"
                ? "Just write. Don't think, don't edit, just let it flow..."
                : currentActivity?.type === "gratitude"
                ? "What are you grateful for today?"
                : "Write your positive affirmations..."
            }
            placeholderTextColor={colors.textMuted}
            value={getTextForActivity()}
            onChangeText={setTextForActivity}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.writingFooter}>
            <Text style={styles.charCount}>
              {getTextForActivity().length} chars
            </Text>
            <Pressable
              style={[
                styles.voiceButton,
                voice.isListening && styles.voiceButtonActive,
              ]}
              onPress={() => {
                if (voice.isListening) {
                  voice.stopListening();
                } else {
                  voice.resetTranscript();
                  lastTranscriptRef.current = "";
                  voice.startListening();
                }
              }}
            >
              <Mic size={16} color={voice.isListening ? colors.error : colors.accent} />
              <Text style={[styles.voiceText, voice.isListening && { color: colors.error }]}>
                {voice.isListening ? "Stop" : "Voice"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Non-text activities */}
      {currentActivity?.type === "breathwork" && (
        <View style={styles.centerActivity}>
          <Wind size={56} color={colors.accent} />
          <Text style={styles.centerTitle}>Breathwork</Text>
          <Text style={styles.centerText}>
            {currentActivity.text ||
              "Breathe in for 4 counts\nHold for 4 counts\nExhale for 6 counts\nRepeat"}
          </Text>
        </View>
      )}

      {currentActivity?.type === "visualization" && (
        <View style={styles.centerActivity}>
          <Eye size={56} color={colors.accent} />
          <Text style={styles.centerTitle}>Visualization</Text>
          <Text style={styles.centerText}>
            {currentActivity.text ||
              "Close your eyes and visualize your goals. Imagine achieving them in vivid detail."}
          </Text>
        </View>
      )}

      {currentActivity?.type === "tasks" && (
        <View style={styles.centerActivity}>
          <CheckSquare size={56} color={colors.success} />
          <Text style={styles.centerTitle}>Daily Tasks</Text>
          <Text style={styles.centerText}>
            Plan your day. What are the most important tasks to accomplish today?
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  streak: { fontSize: fontSize.sm, color: colors.warning, fontWeight: "600" },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  progressDot: {
    flex: 1,
    maxWidth: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bgTertiary,
  },
  progressDotActive: { backgroundColor: colors.accent },
  progressDotComplete: { backgroundColor: colors.success },
  controlBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButtonDisabled: { opacity: 0.4 },
  activityInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  activityTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  timerModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerModeText: { fontSize: 11, color: colors.textSecondary },
  timerControls: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  timerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerText: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    minWidth: 80,
    textAlign: "center",
  },
  timerTextActive: { color: colors.accentLight },
  timerTextComplete: { color: colors.success },
  completeBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: "#22c55e20",
    borderWidth: 1,
    borderColor: "#22c55e40",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  completeText: { fontSize: fontSize.sm, color: colors.success, fontWeight: "500" },
  completeActions: { flexDirection: "row", gap: spacing.sm },
  completeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "#22c55e30",
    borderRadius: borderRadius.sm,
  },
  completeBtnText: { fontSize: fontSize.xs, color: colors.success, fontWeight: "500" },
  completeNextBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
  },
  completeNextBtnText: { fontSize: fontSize.xs, color: "#fff", fontWeight: "500" },
  writingContainer: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  writingInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 24,
  },
  writingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  charCount: { fontSize: fontSize.xs, color: colors.textMuted },
  voiceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.full,
  },
  voiceText: { fontSize: fontSize.xs, color: colors.accent, fontWeight: "500" },
  voiceButtonActive: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: colors.error,
  },
  centerActivity: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  centerTitle: { fontSize: fontSize.xl, fontWeight: "600", color: colors.text },
  centerText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
});
