import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, ChevronDown } from "lucide-react-native";
import { colors, spacing, fontSize, borderRadius } from "../../src/lib/theme";
import { useCreateTask, useTaskTypes } from "../../src/lib/queries/useTasks";

const DEFAULT_TYPES = ["day", "week", "future", "blocked", "shopping"];

export default function QuickAddTask() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("day");
  const [showTypes, setShowTypes] = useState(false);
  const createTask = useCreateTask();
  const inputRef = useRef<TextInput>(null);
  const dbTypes = useTaskTypes();

  const types = dbTypes.length > 0
    ? [...new Set([...DEFAULT_TYPES, ...dbTypes])]
    : DEFAULT_TYPES;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = () => {
    if (!title.trim()) return;
    createTask.mutate(
      { title: title.trim(), type },
      {
        onSuccess: () => {
          setTitle("");
          // Stay on page for rapid entry
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
        <Text style={styles.headerTitle}>Add Task</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="What needs to be done?"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          blurOnSubmit={false}
          autoFocus
        />

        <Pressable
          style={styles.typeSelector}
          onPress={() => setShowTypes(!showTypes)}
        >
          <Text style={styles.typeSelectorLabel}>Category</Text>
          <View style={styles.typeSelectorValue}>
            <Text style={styles.typeSelectorText}>{type}</Text>
            <ChevronDown size={16} color={colors.textSecondary} />
          </View>
        </Pressable>

        {showTypes && (
          <View style={styles.typeGrid}>
            {types.map((t) => (
              <Pressable
                key={t}
                style={[styles.typeChip, type === t && styles.typeChipActive]}
                onPress={() => {
                  setType(t);
                  setShowTypes(false);
                }}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    type === t && styles.typeChipTextActive,
                  ]}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
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
  },
  typeSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeSelectorLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  typeSelectorValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  typeSelectorText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "600",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  typeChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  typeChipTextActive: {
    color: "#fff",
  },
});
