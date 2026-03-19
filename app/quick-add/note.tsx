import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { colors, spacing, fontSize, borderRadius } from "../../src/lib/theme";
import { useCreateNote } from "../../src/lib/queries/useNotes";

export default function QuickAddNote() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const createNote = useCreateNote();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = () => {
    if (!content.trim()) return;
    createNote.mutate(
      { content: content.trim(), tags: [] },
      {
        onSuccess: () => {
          setContent("");
          inputRef.current?.focus();
        },
      }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Note</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textMuted}
          value={content}
          onChangeText={setContent}
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={handleSubmit}
          multiline
          autoFocus
        />

        <Pressable
          style={[styles.submitBtn, !content.trim() && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!content.trim()}
        >
          <Text style={styles.submitBtnText}>Save Note</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontSize: fontSize.md,
    color: "#fff",
    fontWeight: "600",
  },
});
