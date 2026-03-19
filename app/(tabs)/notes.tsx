import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Plus,
  Search,
  Tag,
  Trash2,
  Check,
  X,
  Edit,
  Archive,
} from "lucide-react-native";
import { colors, spacing, fontSize, borderRadius } from "../../src/lib/theme";
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from "../../src/lib/queries/useNotes";

export default function NotesScreen() {
  const { data: notes, isLoading } = useNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [newContent, setNewContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showProcessed, setShowProcessed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [addingTagId, setAddingTagId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");

  // Get unique tags from notes
  const allTags = [...new Set((notes || []).flatMap((n) => n.tags || []))].sort();

  // Filter notes
  const filteredNotes = (notes || [])
    .filter((n) => {
      if (!showProcessed && n.is_processed) return false;
      if (activeTag && !(n.tags || []).includes(activeTag)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          n.content.toLowerCase().includes(q) ||
          (n.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const handleCreate = () => {
    if (!newContent.trim()) return;
    createNote.mutate(
      { content: newContent.trim(), tags: [] },
      { onSuccess: () => setNewContent("") }
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Note", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteNote.mutate(id) },
    ]);
  };

  const handleToggleProcessed = (id: string) => {
    const note = notes?.find((n) => n.id === id);
    if (!note) return;
    updateNote.mutate({
      noteId: id,
      updates: { is_processed: !note.is_processed },
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!editedContent.trim()) return;
    updateNote.mutate(
      { noteId: id, updates: { content: editedContent.trim() } },
      { onSuccess: () => { setEditingId(null); setEditedContent(""); } }
    );
  };

  const handleAddTag = (noteId: string) => {
    if (!newTag.trim()) { setAddingTagId(null); return; }
    const note = notes?.find((n) => n.id === noteId);
    if (!note) return;
    const tags = [...(note.tags || []), newTag.trim().toLowerCase()];
    updateNote.mutate(
      { noteId, updates: { tags } },
      { onSuccess: () => { setAddingTagId(null); setNewTag(""); } }
    );
  };

  const handleRemoveTag = (noteId: string, tag: string) => {
    const note = notes?.find((n) => n.id === noteId);
    if (!note) return;
    const tags = (note.tags || []).filter((t) => t !== tag);
    updateNote.mutate({ noteId, updates: { tags } });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.processedToggle}
          onPress={() => setShowProcessed(!showProcessed)}
        >
          <Archive size={16} color={showProcessed ? colors.accent : colors.textMuted} />
          <Text
            style={[
              styles.processedText,
              showProcessed && { color: colors.accent },
            ]}
          >
            {showProcessed ? "All" : "Active"}
          </Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery("")}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagScrollView}
          contentContainerStyle={styles.tagScrollContent}
        >
          <Pressable
            style={[styles.tagChip, !activeTag && styles.tagChipActive]}
            onPress={() => setActiveTag(null)}
          >
            <Text style={[styles.tagChipText, !activeTag && styles.tagChipTextActive]}>
              All
            </Text>
          </Pressable>
          {allTags.map((tag) => (
            <Pressable
              key={tag}
              style={[styles.tagChip, activeTag === tag && styles.tagChipActive]}
              onPress={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              <Text
                style={[
                  styles.tagChipText,
                  activeTag === tag && styles.tagChipTextActive,
                ]}
              >
                #{tag}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Notes list */}
      <ScrollView style={styles.notesList} contentContainerStyle={styles.notesListContent}>
        {filteredNotes.map((note) => (
          <View
            key={note.id}
            style={[styles.noteCard, note.is_processed && styles.noteCardProcessed]}
          >
            {editingId === note.id ? (
              <View>
                <TextInput
                  style={styles.editInput}
                  value={editedContent}
                  onChangeText={setEditedContent}
                  multiline
                  autoFocus
                />
                <View style={styles.editActions}>
                  <Pressable
                    style={styles.editSaveBtn}
                    onPress={() => handleSaveEdit(note.id)}
                  >
                    <Check size={16} color="#fff" />
                  </Pressable>
                  <Pressable
                    style={styles.editCancelBtn}
                    onPress={() => { setEditingId(null); setEditedContent(""); }}
                  >
                    <X size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  setEditingId(note.id);
                  setEditedContent(note.content);
                }}
              >
                <Text style={styles.noteContent}>{note.content}</Text>
              </Pressable>
            )}

            {/* Tags */}
            <View style={styles.tagsRow}>
              {(note.tags || []).map((tag) => (
                <Pressable
                  key={tag}
                  style={styles.noteTag}
                  onLongPress={() => handleRemoveTag(note.id, tag)}
                >
                  <Text style={styles.noteTagText}>#{tag}</Text>
                </Pressable>
              ))}
              {addingTagId === note.id ? (
                <View style={styles.tagInputRow}>
                  <TextInput
                    style={styles.tagInput}
                    placeholder="tag"
                    placeholderTextColor={colors.textMuted}
                    value={newTag}
                    onChangeText={setNewTag}
                    onSubmitEditing={() => handleAddTag(note.id)}
                    autoFocus
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => handleAddTag(note.id)}>
                    <Check size={14} color={colors.accent} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.addTagBtn}
                  onPress={() => { setAddingTagId(note.id); setNewTag(""); }}
                >
                  <Tag size={12} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* Footer */}
            <View style={styles.noteFooter}>
              <Text style={styles.noteDate}>{formatDate(note.created_at)}</Text>
              <View style={styles.noteActions}>
                <Pressable onPress={() => handleToggleProcessed(note.id)}>
                  <Check
                    size={16}
                    color={note.is_processed ? colors.success : colors.textMuted}
                  />
                </Pressable>
                <Pressable onPress={() => handleDelete(note.id)}>
                  <Trash2 size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            </View>
          </View>
        ))}
        {filteredNotes.length === 0 && (
          <Text style={styles.emptyText}>
            {(notes || []).length === 0
              ? "No notes yet. Start capturing!"
              : "No notes match your filters."}
          </Text>
        )}
      </ScrollView>

      {/* Quick add bar */}
      <View style={styles.addBar}>
        <TextInput
          style={styles.addInput}
          placeholder="Quick note..."
          placeholderTextColor={colors.textMuted}
          value={newContent}
          onChangeText={setNewContent}
          onSubmitEditing={handleCreate}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addButton, !newContent.trim() && styles.addButtonDisabled]}
          onPress={handleCreate}
          disabled={!newContent.trim()}
        >
          <Plus size={24} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  processedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  processedText: { fontSize: fontSize.xs, color: colors.textMuted },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  tagScrollView: { maxHeight: 44, marginTop: spacing.sm },
  tagScrollContent: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tagChipText: { fontSize: fontSize.xs, color: colors.textSecondary },
  tagChipTextActive: { color: "#fff" },
  notesList: { flex: 1, marginTop: spacing.sm },
  notesListContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  noteCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteCardProcessed: { opacity: 0.6 },
  noteContent: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  noteTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
  },
  noteTagText: { fontSize: 11, color: colors.accentLight },
  addTagBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagInput: { fontSize: 11, color: colors.text, minWidth: 60 },
  noteFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  noteDate: { fontSize: fontSize.xs, color: colors.textMuted },
  noteActions: { flexDirection: "row", gap: spacing.md },
  editInput: {
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    minHeight: 60,
    textAlignVertical: "top",
  },
  editActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  editSaveBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
  },
  editCancelBtn: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
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
  addButtonDisabled: { opacity: 0.4 },
});
