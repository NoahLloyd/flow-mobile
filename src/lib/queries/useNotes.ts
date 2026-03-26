import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Note } from "../../types";
import { useAuthStore } from "../store/auth";
import { isOnline } from "../offline";
import { offlineQueue } from "../offline";

export function useNotes() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["notes"],
    queryFn: api.getNotes,
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteData: { content: string; tags: string[] }) => {
      const online = await isOnline();
      if (online) {
        return api.createNote(noteData);
      }
      await offlineQueue.add("createNote", noteData);
      const now = new Date().toISOString();
      return {
        id: `temp-${Date.now()}`,
        content: noteData.content,
        tags: noteData.tags,
        is_processed: false,
        created_at: now,
        updated_at: now,
        user_id: "",
      } as Note;
    },
    onMutate: async (noteData) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previous = queryClient.getQueryData<Note[]>(["notes"]);

      const now = new Date().toISOString();
      const tempNote: Note = {
        id: `temp-${Date.now()}`,
        content: noteData.content,
        tags: noteData.tags,
        is_processed: false,
        created_at: now,
        updated_at: now,
        user_id: "",
      };

      queryClient.setQueryData<Note[]>(["notes"], (old) => [
        tempNote,
        ...(old || []),
      ]);

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notes"], context.previous);
      }
    },
    onSettled: async () => {
      const online = await isOnline();
      if (online) {
        queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      updates,
    }: {
      noteId: string;
      updates: { content?: string; is_processed?: boolean; tags?: string[] };
    }) => {
      const online = await isOnline();
      if (online) {
        return api.updateNote(noteId, updates);
      }
      await offlineQueue.add("updateNote", { noteId, updates });
      return { id: noteId, ...updates } as Note;
    },
    onMutate: async ({ noteId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previous = queryClient.getQueryData<Note[]>(["notes"]);

      queryClient.setQueryData<Note[]>(["notes"], (old) =>
        (old || []).map((n) => (n.id === noteId ? { ...n, ...updates } : n))
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notes"], context.previous);
      }
    },
    onSettled: async () => {
      const online = await isOnline();
      if (online) {
        queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const online = await isOnline();
      if (online) {
        return api.deleteNote(noteId);
      }
      await offlineQueue.add("deleteNote", noteId);
    },
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previous = queryClient.getQueryData<Note[]>(["notes"]);
      queryClient.setQueryData<Note[]>(["notes"], (old) =>
        (old || []).filter((n) => n.id !== noteId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notes"], context.previous);
      }
    },
    onSettled: async () => {
      const online = await isOnline();
      if (online) {
        queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
    },
  });
}
