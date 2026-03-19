import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Check,
  X,
} from "lucide-react-native";
import { colors, spacing, fontSize, borderRadius } from "../../src/lib/theme";
import { useAuthStore } from "../../src/lib/store/auth";
import { useDailySignals, useRecordSignal } from "../../src/lib/queries/useSignals";
import { getAvailableSignals, SignalConfig } from "../../src/types";

function BinarySignal({
  label,
  value,
  onToggle,
  isComputed,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  isComputed?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.signalCard,
        value && styles.signalCardActive,
        isComputed && styles.signalCardComputed,
      ]}
      onPress={isComputed ? undefined : onToggle}
    >
      <View
        style={[styles.signalIcon, value && styles.signalIconActive]}
      >
        {value ? (
          <Check size={20} color="#fff" />
        ) : (
          <X size={20} color={colors.textMuted} />
        )}
      </View>
      <Text
        style={[styles.signalLabel, value && styles.signalLabelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {isComputed && (
        <Text style={styles.computedBadge}>auto</Text>
      )}
    </Pressable>
  );
}

function ScaleSignal({
  label,
  value,
  onSet,
}: {
  label: string;
  value: number;
  onSet: (val: number) => void;
}) {
  return (
    <View style={styles.scaleContainer}>
      <Text style={styles.scaleLabel}>{label}</Text>
      <View style={styles.scaleRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            style={[
              styles.scaleDot,
              n <= value && styles.scaleDotActive,
            ]}
            onPress={() => onSet(n)}
          >
            <Text
              style={[
                styles.scaleDotText,
                n <= value && styles.scaleDotTextActive,
              ]}
            >
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function NumberSignal({
  label,
  value,
  max,
  unit,
  onSet,
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  onSet: (val: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const step = label.includes("Water")
    ? 250
    : label.includes("Sleep")
    ? 0.5
    : label.includes("Steps")
    ? 1000
    : 5;

  const startEditing = () => {
    setEditValue(String(value));
    setEditing(true);
  };

  const commitEdit = () => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      onSet(Math.max(0, Math.min(max, parsed)));
    }
    setEditing(false);
  };

  return (
    <View style={styles.numberContainer}>
      <Text style={styles.numberLabel}>{label}</Text>
      <View style={styles.numberRow}>
        <Pressable
          style={styles.numberButton}
          onPress={() => onSet(Math.max(0, value - step))}
        >
          <Text style={styles.numberButtonText}>-</Text>
        </Pressable>
        {editing ? (
          <TextInput
            style={styles.numberEditInput}
            value={editValue}
            onChangeText={setEditValue}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            keyboardType="numeric"
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <Pressable onPress={startEditing}>
            <Text style={styles.numberValue}>
              {value}
              {unit && <Text style={styles.numberUnit}>{unit}</Text>}
            </Text>
          </Pressable>
        )}
        <Pressable
          style={styles.numberButton}
          onPress={() => onSet(Math.min(max, value + step))}
        >
          <Text style={styles.numberButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SignalsScreen() {
  const { user } = useAuthStore();
  const { data: signals, isLoading } = useDailySignals();
  const recordSignal = useRecordSignal();

  const customSignals = (user?.preferences?.customSignals as Record<string, SignalConfig>) || {};
  const allSignals = getAvailableSignals(customSignals);
  const activeSignalKeys =
    (user?.preferences?.activeSignals as string[]) || Object.keys(allSignals);

  const handleRecord = (metric: string, value: number | boolean) => {
    recordSignal.mutate({ metric, value });
  };

  const binarySignals = activeSignalKeys.filter(
    (key) => allSignals[key]?.type === "binary"
  );
  const scaleSignals = activeSignalKeys.filter(
    (key) => allSignals[key]?.type === "scale"
  );
  const numberSignals = activeSignalKeys.filter(
    (key) =>
      allSignals[key]?.type === "number" ||
      allSignals[key]?.type === "water"
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Binary Signals Grid */}
        {binarySignals.length > 0 && (
          <View style={styles.binaryGrid}>
            {binarySignals.map((key) => {
              const config = allSignals[key];
              const val = signals?.[key];
              const boolVal = val === true || val === "true" || val === 1;
              return (
                <BinarySignal
                  key={key}
                  label={config.label}
                  value={boolVal}
                  isComputed={config.isComputed}
                  onToggle={() => handleRecord(key, !boolVal)}
                />
              );
            })}
          </View>
        )}

        {/* Scale Signals */}
        {scaleSignals.map((key) => {
          const config = allSignals[key];
          const val = typeof signals?.[key] === "number" ? signals[key] : 0;
          return (
            <ScaleSignal
              key={key}
              label={config.label}
              value={val as number}
              onSet={(v) => handleRecord(key, v)}
            />
          );
        })}

        {/* Number Signals */}
        {numberSignals.map((key) => {
          const config = allSignals[key];
          const val = typeof signals?.[key] === "number" ? signals[key] : 0;
          return (
            <NumberSignal
              key={key}
              label={config.label}
              value={val as number}
              max={config.max || 100}
              onSet={(v) => handleRecord(key, v)}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  // Binary signal grid
  binaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  signalCard: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signalCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.bgTertiary,
  },
  signalCardComputed: {
    opacity: 0.7,
  },
  signalIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  signalIconActive: {
    backgroundColor: colors.accent,
  },
  signalLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  signalLabelActive: {
    color: colors.text,
    fontWeight: "500",
  },
  computedBadge: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Scale signals
  scaleContainer: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scaleLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  scaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  scaleDot: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  scaleDotActive: {
    backgroundColor: colors.signalScale,
  },
  scaleDotText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: "600",
  },
  scaleDotTextActive: {
    color: "#fff",
  },
  // Number signals
  numberContainer: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  numberLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  numberButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  numberButtonText: {
    fontSize: fontSize.xl,
    color: colors.text,
    fontWeight: "600",
  },
  numberValue: {
    fontSize: fontSize.xxl,
    color: colors.text,
    fontWeight: "700",
    minWidth: 80,
    textAlign: "center",
  },
  numberEditInput: {
    fontSize: fontSize.xxl,
    color: colors.text,
    fontWeight: "700",
    minWidth: 80,
    textAlign: "center",
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  numberUnit: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
