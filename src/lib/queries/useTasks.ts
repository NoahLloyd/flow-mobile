import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Task } from "../../types";
import { useAuthStore } from "../store/auth";
import { syncWidgetData } from "../widgetSync";

export function useTasks() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["tasks"],
    queryFn: api.getUserTasks,
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useTaskTypes() {
  const { data: tasks } = useTasks();

  if (!tasks) return [];

  // Derive unique types from actual data
  const types = [...new Set(tasks.map((t) => t.type))];
  return types;
}

function syncTaskCount(queryClient: ReturnType<typeof useQueryClient>) {
  const tasks = queryClient.getQueryData<Task[]>(["tasks"]);
  if (tasks) {
    const remaining = tasks.filter(
      (t) => !t.completed && (t.type === "day" || t.type === "week")
    ).length;
    syncWidgetData({ tasksRemaining: remaining });
  }
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskData: { title: string; type: string }) =>
      api.createTask(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      syncTaskCount(queryClient);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: Partial<Task>;
    }) => api.updateTask(taskId, updates),
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueryData<Task[]>(["tasks"]);

      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        (old || []).map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tasks"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      syncTaskCount(queryClient);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => api.deleteTask(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueryData<Task[]>(["tasks"]);
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        (old || []).filter((t) => t.id !== taskId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tasks"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
