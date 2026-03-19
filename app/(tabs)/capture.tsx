import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mic, MicOff } from "lucide-react-native";
import { colors, spacing, fontSize, borderRadius } from "../../src/lib/theme";
import { useCreateTask } from "../../src/lib/queries/useTasks";
import { useCreateNote } from "../../src/lib/queries/useNotes";
import { useVoiceInput } from "../../src/lib/voice";

export default function CaptureScreen() {
  const [taskText, setTaskText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [voiceTarget, setVoiceTarget] = useState<"task" | "note" | null>(null);
  const createTask = useCreateTask();
  const createNote = useCreateNote();
  const voice = useVoiceInput();
  const taskInputRef = useRef<TextInput>(null);
  const noteInputRef = useRef<TextInput>(null);

  const handleTaskSubmit = () => {
    if (!taskText.trim()) return;
    const content = taskText.trim();
    createTask.mutate(
      { title: content, type: "day" },
      {
        onSuccess: () => {
          setTaskText("");
          Keyboard.dismiss();
        },
      }
    );
  };

  const handleNoteSubmit = () => {
    if (!noteText.trim()) return;
    const content = noteText.trim();
    createNote.mutate(
      { content, tags: [] },
      {
        onSuccess: () => {
          setNoteText("");
          Keyboard.dismiss();
        },
      }
    );
  };

  const toggleVoice = (target: "task" | "note") => {
    if (voice.isListening) {
      voice.stopListening();
      // Append transcript to the target
      if (voice.transcript && voiceTarget) {
        if (voiceTarget === "task") {
          setTaskText((prev) => (prev ? prev + " " + voice.transcript : voice.transcript));
        } else {
          setNoteText((prev) => (prev ? prev + " " + voice.transcript : voice.transcript));
        }
      }
      setVoiceTarget(null);
    } else {
      voice.resetTranscript();
      setVoiceTarget(target);
      voice.startListening();
    }
  };

  // Update text from voice while listening
  const getVoiceIndicator = (target: "task" | "note") => {
    if (voice.isListening && voiceTarget === target) {
      return voice.transcript || "Listening...";
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Task Input */}
        <View style={styles.inputGroup}>
          <View style={styles.inputRow}>
            <TextInput
              ref={taskInputRef}
              style={styles.input}
              placeholder="Add a task..."
              placeholderTextColor={colors.textMuted}
              value={taskText}
              onChangeText={setTaskText}
              onSubmitEditing={handleTaskSubmit}
              returnKeyType="done"
              blurOnSubmit={false}
            />
            <Pressable
              style={[
                styles.voiceBtn,
                voice.isListening && voiceTarget === "task" && styles.voiceBtnActive,
              ]}
              onPress={() => toggleVoice("task")}
            >
              {voice.isListening && voiceTarget === "task" ? (
                <MicOff size={20} color={colors.error} />
              ) : (
                <Mic size={20} color={colors.textSecondary} />
              )}
            </Pressable>
          </View>
          {getVoiceIndicator("task") && (
            <Text style={styles.voicePreview}>{getVoiceIndicator("task")}</Text>
          )}
        </View>

        {/* Note Input */}
        <View style={styles.inputGroup}>
          <View style={styles.inputRow}>
            <TextInput
              ref={noteInputRef}
              style={[styles.input, styles.noteInput]}
              placeholder="Add a note..."
              placeholderTextColor={colors.textMuted}
              value={noteText}
              onChangeText={setNoteText}
              onSubmitEditing={handleNoteSubmit}
              returnKeyType="done"
              multiline
              blurOnSubmit
            />
            <Pressable
              style={[
                styles.voiceBtn,
                voice.isListening && voiceTarget === "note" && styles.voiceBtnActive,
              ]}
              onPress={() => toggleVoice("note")}
            >
              {voice.isListening && voiceTarget === "note" ? (
                <MicOff size={20} color={colors.error} />
              ) : (
                <Mic size={20} color={colors.textSecondary} />
              )}
            </Pressable>
          </View>
          {getVoiceIndicator("note") && (
            <Text style={styles.voicePreview}>{getVoiceIndicator("note")}</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  voiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceBtnActive: {
    borderColor: colors.error,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  voicePreview: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: "italic",
    paddingLeft: spacing.md,
  },
});
