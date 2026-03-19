import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Animated,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RectButton } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { CheckCircle2, Circle, Trash2, Plus, Check, ChevronDown } from "lucide-react-native";
import { colors, spacing, fontSize, borderRadius } from "../../src/lib/theme";
import {
  useTasks,
  useTaskTypes,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "../../src/lib/queries/useTasks";
import { Task } from "../../src/types";

const PAGE_SIZE = 30;

export default function TasksScreen() {
  const { data: tasks, isLoading } = useTasks();
  const taskTypes = useTaskTypes();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [activeType, setActiveType] = useState("day");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("");
  const inputRef = useRef<TextInput>(null);

  const types = taskTypes.length > 0 ? taskTypes : ["day", "week", "future", "blocked", "shopping"];

  const filteredTasks = (tasks || []).filter((t) => t.type === activeType);
  const incompleteTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);
  const allOrdered = [...incompleteTasks, ...completedTasks];
  const visibleTasks = allOrdered.slice(0, visibleCount);
  const hasMore = allOrdered.length > visibleCount;

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    createTask.mutate(
      { title: newTaskTitle.trim(), type: activeType },
      { onSuccess: () => setNewTaskTitle("") }
    );
  };

  const handleToggle = (taskId: string, completed: boolean) => {
    updateTask.mutate({ taskId, updates: { completed: !completed } });
  };

  const handleSaveEdit = () => {
    if (!editingTask || !editTitle.trim()) return;
    const updates: Partial<Task> = {};
    if (editTitle.trim() !== editingTask.title) updates.title = editTitle.trim();
    if (editType !== editingTask.type) updates.type = editType;
    if (Object.keys(updates).length > 0) {
      updateTask.mutate({ taskId: editingTask.id, updates });
    }
    setEditingTask(null);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditType(task.type);
  };

  const loadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  // Reset visible count when switching tabs
  const switchType = (type: string) => {
    setActiveType(type);
    setVisibleCount(PAGE_SIZE);
  };

  const incompleteCount = incompleteTasks.length;
  const completedCount = completedTasks.length;
  const completedStartIndex = incompleteCount;

  return (
    <SafeAreaView style={styles.container}>
      {/* Dynamic Type Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {types.map((type) => (
          <Pressable
            key={type}
            style={[styles.tab, activeType === type && styles.tabActive]}
            onPress={() => switchType(type)}
          >
            <Text
              style={[
                styles.tabText,
                activeType === type && styles.tabTextActive,
              ]}
              numberOfLines={1}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Task List */}
      <FlatList
        data={visibleTasks}
        keyExtractor={(item) => item.id}
        style={styles.taskList}
        contentContainerStyle={styles.taskListContent}
        renderItem={({ item: task, index }) => {
          if (index === completedStartIndex && completedCount > 0) {
            return (
              <View>
                <Text style={styles.completedHeader}>
                  Completed ({completedCount})
                </Text>
                {task.completed ? (
                  <CompletedTaskRow
                    task={task}
                    onToggle={() => handleToggle(task.id, task.completed)}
                    onPress={() => openEdit(task)}
                  />
                ) : (
                  <SwipeableTask
                    task={task}
                    onComplete={() => handleToggle(task.id, false)}
                    onDelete={() => deleteTask.mutate(task.id)}
                    onPress={() => openEdit(task)}
                  />
                )}
              </View>
            );
          }
          if (task.completed) {
            return (
              <CompletedTaskRow
                task={task}
                onToggle={() => handleToggle(task.id, task.completed)}
                onPress={() => openEdit(task)}
              />
            );
          }
          return (
            <SwipeableTask
              task={task}
              onComplete={() => handleToggle(task.id, false)}
              onDelete={() => deleteTask.mutate(task.id)}
              onPress={() => openEdit(task)}
            />
          );
        }}
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No {activeType} tasks yet
          </Text>
        }
      />

      {/* Quick Add Bar */}
      <View style={styles.addBar}>
        <TextInput
          ref={inputRef}
          style={styles.addInput}
          placeholder={`Add ${activeType} task...`}
          placeholderTextColor={colors.textMuted}
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
          onSubmitEditing={handleAddTask}
          returnKeyType="done"
        />
        <Pressable
          style={[
            styles.addButton,
            !newTaskTitle.trim() && styles.addButtonDisabled,
          ]}
          onPress={handleAddTask}
          disabled={!newTaskTitle.trim()}
        >
          <Plus size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Edit Task Modal */}
      <Modal
        visible={!!editingTask}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingTask(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setEditingTask(null)} />
          <View style={styles.modalContent}>
            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
              multiline
              placeholder="Task title"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.editLabel}>Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.editTypesRow}
            >
              {types.map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.editTypeChip,
                    editType === type && styles.editTypeChipActive,
                  ]}
                  onPress={() => setEditType(type)}
                >
                  <Text
                    style={[
                      styles.editTypeText,
                      editType === type && styles.editTypeTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.editActions}>
              <Pressable
                style={styles.editCancelBtn}
                onPress={() => setEditingTask(null)}
              >
                <Text style={styles.editCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.editSaveBtn}
                onPress={handleSaveEdit}
              >
                <Text style={styles.editSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function CompletedTaskRow({
  task,
  onToggle,
  onPress,
}: {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
}) {
  return (
    <View style={styles.taskRow}>
      <Pressable style={styles.taskCheckbox} onPress={onToggle}>
        <CheckCircle2 size={24} color={colors.success} />
      </Pressable>
      <Pressable style={{ flex: 1 }} onPress={onPress}>
        <Text style={[styles.taskTitle, styles.taskTitleCompleted]}>
          {task.title}
        </Text>
      </Pressable>
    </View>
  );
}

function SwipeableTask({
  task,
  onComplete,
  onDelete,
  onPress,
}: {
  task: Task;
  onComplete: () => void;
  onDelete: () => void;
  onPress: () => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0.5, 1],
      extrapolate: "clamp",
    });
    return (
      <RectButton
        style={styles.swipeCompleteAction}
        onPress={() => {
          onComplete();
          swipeableRef.current?.close();
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Check size={24} color="#fff" />
        </Animated.View>
        <Text style={styles.swipeActionText}>Complete</Text>
      </RectButton>
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: "clamp",
    });
    return (
      <RectButton
        style={styles.swipeDeleteAction}
        onPress={() => {
          onDelete();
          swipeableRef.current?.close();
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Trash2 size={24} color="#fff" />
        </Animated.View>
        <Text style={styles.swipeActionText}>Delete</Text>
      </RectButton>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      leftThreshold={80}
      rightThreshold={80}
      onSwipeableOpen={(direction) => {
        if (direction === "left") {
          onComplete();
        } else if (direction === "right") {
          onDelete();
        }
        swipeableRef.current?.close();
      }}
    >
      <Pressable style={styles.taskRow} onPress={onPress}>
        <Circle size={24} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <Text style={styles.taskTitle}>{task.title}</Text>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabsContainer: {
    maxHeight: 48,
    marginTop: spacing.sm,
  },
  tabsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    height: 36,
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "500",
    lineHeight: fontSize.sm + 2,
  },
  tabTextActive: {
    color: "#fff",
  },
  taskList: {
    flex: 1,
    marginTop: spacing.sm,
  },
  taskListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  taskCheckbox: {
    marginRight: spacing.sm,
  },
  taskTitle: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  taskTitleCompleted: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  completedHeader: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: "500",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: "center",
    marginTop: spacing.xxl,
  },
  addBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgSecondary,
    gap: spacing.sm,
  },
  addInput: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  swipeCompleteAction: {
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
    width: 100,
    flexDirection: "column",
    gap: 4,
  },
  swipeDeleteAction: {
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center",
    width: 100,
    flexDirection: "column",
    gap: 4,
  },
  swipeActionText: {
    color: "#fff",
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  // Edit modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  editInput: {
    fontSize: fontSize.lg,
    color: colors.text,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
    marginBottom: spacing.md,
  },
  editLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  editTypesRow: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  editTypeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    height: 36,
    justifyContent: "center",
  },
  editTypeChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  editTypeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  editTypeTextActive: {
    color: "#fff",
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  editCancelText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  editSaveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  editSaveText: {
    fontSize: fontSize.md,
    color: "#fff",
    fontWeight: "600",
  },
});
