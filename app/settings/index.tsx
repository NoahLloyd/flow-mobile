import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  LogOut,
  Clock,
  Globe,
  BarChart3,
  Sunrise,
  ChevronLeft,
  Save,
  Plus,
  Trash2,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { colors, spacing, fontSize, borderRadius } from "../../src/lib/theme";
import { useAuthStore } from "../../src/lib/store/auth";
import { api } from "../../src/lib/api";
import { getAvailableSignals, SignalConfig } from "../../src/types";

const COMMON_TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Europe/Helsinki",
  "Asia/Istanbul",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const SIGNAL_TYPE_OPTIONS: { label: string; value: SignalConfig["type"] }[] = [
  { label: "Binary (yes/no)", value: "binary" },
  { label: "Scale (1-5)", value: "scale" },
  { label: "Number", value: "number" },
];

export default function SettingsScreen() {
  const { user, logout, refreshUser } = useAuthStore();
  const router = useRouter();

  const existingCustomSignals = (user?.preferences?.customSignals as Record<string, SignalConfig>) || {};
  const allSignals = getAvailableSignals(existingCustomSignals);

  const [defaultProject, setDefaultProject] = useState(
    (user?.preferences?.defaultProject as string) || ""
  );
  const [defaultMinutes, setDefaultMinutes] = useState(
    String((user?.preferences?.defaultMinutes as number) || 60)
  );
  const [timezone, setTimezone] = useState(
    (user?.preferences?.timezone as string) ||
      Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [activeSignals, setActiveSignals] = useState<string[]>(
    (user?.preferences?.activeSignals as string[]) || Object.keys(allSignals)
  );
  const [customSignals, setCustomSignals] = useState<Record<string, SignalConfig>>(
    existingCustomSignals
  );
  const [signalGoals, setSignalGoals] = useState<Record<string, number>>(
    (user?.preferences?.signalGoals as Record<string, number>) || {
      minutesToOffice: 30,
      waterIntake: 2000,
      sleep: 8,
      steps: 10000,
    }
  );
  const [dailyHoursGoals, setDailyHoursGoals] = useState<Record<string, number>>(
    (user?.preferences?.dailyHoursGoals as Record<string, number>) || {
      monday: 4, tuesday: 4, wednesday: 4, thursday: 4, friday: 4, saturday: 2, sunday: 0,
    }
  );
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // New signal form
  const [newSignalName, setNewSignalName] = useState("");
  const [newSignalType, setNewSignalType] = useState<SignalConfig["type"]>("binary");
  const [showAddSignal, setShowAddSignal] = useState(false);

  const mergedSignals = getAvailableSignals(customSignals);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleSignal = (key: string) => {
    setActiveSignals((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const addCustomSignal = () => {
    const name = newSignalName.trim();
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key) return;
    if (mergedSignals[key]) {
      Alert.alert("Exists", "A signal with that name already exists");
      return;
    }
    const config: SignalConfig = {
      label: name,
      type: newSignalType,
      hasGoal: newSignalType === "number",
      ...(newSignalType === "number" ? { max: 100 } : {}),
    };
    setCustomSignals((prev) => ({ ...prev, [key]: config }));
    setActiveSignals((prev) => [...prev, key]);
    setNewSignalName("");
    setShowAddSignal(false);
  };

  const removeCustomSignal = (key: string) => {
    setCustomSignals((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setActiveSignals((prev) => prev.filter((s) => s !== key));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await api.updateUserPreferences(user.id, {
        defaultProject,
        defaultMinutes: parseInt(defaultMinutes) || 60,
        timezone,
        activeSignals,
        customSignals,
        signalGoals,
        dailyHoursGoals,
      });
      await refreshUser();
      Alert.alert("Saved", "Settings updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Save size={16} color="#fff" />
          <Text style={styles.saveBtnText}>{saving ? "..." : "Save"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Projects & Timer */}
        <Pressable
          style={styles.sectionHeader}
          onPress={() => toggleSection("timer")}
        >
          <Clock size={18} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>Projects & Timer</Text>
        </Pressable>
        {expandedSection === "timer" && (
          <View style={styles.sectionBody}>
            <Text style={styles.label}>Default Project</Text>
            <TextInput
              style={styles.input}
              value={defaultProject}
              onChangeText={setDefaultProject}
              placeholder="Project name"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.label}>Default Session Minutes</Text>
            <TextInput
              style={styles.input}
              value={defaultMinutes}
              onChangeText={setDefaultMinutes}
              keyboardType="number-pad"
              placeholder="60"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        )}

        {/* Timezone */}
        <Pressable
          style={styles.sectionHeader}
          onPress={() => toggleSection("timezone")}
        >
          <Globe size={18} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>Timezone</Text>
          <Text style={styles.sectionValue}>
            {timezone.split("/").pop()?.replace("_", " ")}
          </Text>
        </Pressable>
        {expandedSection === "timezone" && (
          <View style={styles.sectionBody}>
            {COMMON_TIMEZONES.map((tz) => (
              <Pressable
                key={tz}
                style={[
                  styles.timezoneRow,
                  timezone === tz && styles.timezoneRowActive,
                ]}
                onPress={() => setTimezone(tz)}
              >
                <Text
                  style={[
                    styles.timezoneText,
                    timezone === tz && styles.timezoneTextActive,
                  ]}
                >
                  {tz.split("/").pop()?.replace("_", " ")}
                </Text>
                <Text style={styles.timezoneOffset}>
                  {(() => {
                    try {
                      return new Intl.DateTimeFormat("en", {
                        timeZoneName: "short",
                        timeZone: tz,
                      })
                        .formatToParts(new Date())
                        .find((p) => p.type === "timeZoneName")?.value;
                    } catch {
                      return "";
                    }
                  })()}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Active Signals */}
        <Pressable
          style={styles.sectionHeader}
          onPress={() => toggleSection("signals")}
        >
          <BarChart3 size={18} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>Signals</Text>
          <Text style={styles.sectionValue}>{activeSignals.length} active</Text>
        </Pressable>
        {expandedSection === "signals" && (
          <View style={styles.sectionBody}>
            {Object.entries(mergedSignals).map(([key, config]) => {
              const isCustom = key in customSignals;
              return (
                <View key={key} style={styles.signalRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.signalLabel}>{config.label}</Text>
                      {isCustom && (
                        <Pressable onPress={() => removeCustomSignal(key)}>
                          <Trash2 size={14} color={colors.error} />
                        </Pressable>
                      )}
                    </View>
                    <Text style={styles.signalType}>{config.type}</Text>
                    {config.hasGoal && activeSignals.includes(key) && (
                      <View style={styles.goalInputRow}>
                        <Text style={styles.goalLabel}>Goal:</Text>
                        <TextInput
                          style={styles.goalInput}
                          value={String(signalGoals[key] || 0)}
                          onChangeText={(v) =>
                            setSignalGoals((prev) => ({
                              ...prev,
                              [key]: parseInt(v) || 0,
                            }))
                          }
                          keyboardType="number-pad"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                    )}
                  </View>
                  <Switch
                    value={activeSignals.includes(key)}
                    onValueChange={() => toggleSignal(key)}
                    trackColor={{
                      false: colors.bgTertiary,
                      true: colors.accent,
                    }}
                    thumbColor="#fff"
                  />
                </View>
              );
            })}

            {/* Add Custom Signal */}
            {showAddSignal ? (
              <View style={styles.addSignalForm}>
                <TextInput
                  style={styles.addSignalInput}
                  placeholder="Signal name (e.g. Anki)"
                  placeholderTextColor={colors.textMuted}
                  value={newSignalName}
                  onChangeText={setNewSignalName}
                  autoFocus
                  autoCapitalize="words"
                />
                <View style={styles.addSignalTypeRow}>
                  {SIGNAL_TYPE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.typeOption,
                        newSignalType === opt.value && styles.typeOptionActive,
                      ]}
                      onPress={() => setNewSignalType(opt.value)}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          newSignalType === opt.value && styles.typeOptionTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.addSignalActions}>
                  <Pressable
                    style={styles.addSignalCancel}
                    onPress={() => { setShowAddSignal(false); setNewSignalName(""); }}
                  >
                    <Text style={styles.addSignalCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.addSignalConfirm, !newSignalName.trim() && { opacity: 0.4 }]}
                    onPress={addCustomSignal}
                    disabled={!newSignalName.trim()}
                  >
                    <Text style={styles.addSignalConfirmText}>Add Signal</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.addSignalBtn}
                onPress={() => setShowAddSignal(true)}
              >
                <Plus size={16} color={colors.accent} />
                <Text style={styles.addSignalBtnText}>Add Custom Signal</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Working Hours Goals */}
        <Pressable
          style={styles.sectionHeader}
          onPress={() => toggleSection("hours")}
        >
          <Sunrise size={18} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>Daily Focus Goals</Text>
        </Pressable>
        {expandedSection === "hours" && (
          <View style={styles.sectionBody}>
            {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(
              (day) => (
                <View key={day} style={styles.hoursRow}>
                  <Text style={styles.hoursDay}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Text>
                  <View style={styles.hoursInputRow}>
                    <TextInput
                      style={styles.hoursInput}
                      value={String(dailyHoursGoals[day] ?? 4)}
                      onChangeText={(v) =>
                        setDailyHoursGoals((prev) => ({
                          ...prev,
                          [day]: parseFloat(v) || 0,
                        }))
                      }
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={styles.hoursUnit}>hrs</Text>
                  </View>
                </View>
              )
            )}
          </View>
        )}

        {/* Logout */}
        <Pressable style={styles.logoutRow} onPress={handleLogout}>
          <LogOut size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: fontSize.sm, color: "#fff", fontWeight: "600" },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: fontSize.xl, fontWeight: "700", color: "#fff" },
  profileName: { fontSize: fontSize.md, fontWeight: "600", color: colors.text },
  profileEmail: { fontSize: fontSize.sm, color: colors.textSecondary },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { flex: 1, fontSize: fontSize.md, color: colors.text, fontWeight: "500" },
  sectionValue: { fontSize: fontSize.sm, color: colors.textMuted },
  sectionBody: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  timezoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timezoneRowActive: { backgroundColor: colors.bgTertiary, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm },
  timezoneText: { fontSize: fontSize.sm, color: colors.text },
  timezoneTextActive: { color: colors.accent, fontWeight: "600" },
  timezoneOffset: { fontSize: fontSize.xs, color: colors.textMuted },
  signalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  signalLabel: { fontSize: fontSize.sm, color: colors.text },
  signalType: { fontSize: fontSize.xs, color: colors.textMuted },
  goalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 4,
  },
  goalLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  goalInput: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    fontSize: fontSize.xs,
    color: colors.text,
    width: 70,
  },
  // Add custom signal
  addSignalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: borderRadius.md,
    borderStyle: "dashed",
  },
  addSignalBtnText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: "500",
  },
  addSignalForm: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  addSignalInput: {
    backgroundColor: colors.bg,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  addSignalTypeRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  typeOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeOptionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  typeOptionText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  typeOptionTextActive: {
    color: "#fff",
  },
  addSignalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  addSignalCancel: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: borderRadius.sm,
    alignItems: "center",
  },
  addSignalCancelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  addSignalConfirm: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    alignItems: "center",
  },
  addSignalConfirmText: {
    fontSize: fontSize.sm,
    color: "#fff",
    fontWeight: "600",
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hoursDay: { fontSize: fontSize.sm, color: colors.text },
  hoursInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  hoursInput: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    fontSize: fontSize.sm,
    color: colors.text,
    width: 50,
    textAlign: "center",
  },
  hoursUnit: { fontSize: fontSize.xs, color: colors.textMuted },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: { fontSize: fontSize.md, color: colors.error, fontWeight: "500" },
});
