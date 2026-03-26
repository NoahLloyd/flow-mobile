import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Task } from "../../types";
import { useAuthStore } from "../store/auth";
import { syncWidgetData } from "../widgetSync";
import { isOnline } from "../offline";
import { offlineQueue } from "../offline";

export function useTasks() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const tasks = await api.getUserTasks();
      // Sync to widgets on every fetch
      const dailyIncomplete = tasks.filter(
        (t: Task) => !t.completed && t.type === "day"
      );
      syncWidgetData({
        dailyTasks: dailyIncomplete.map((t: Task) => ({ id: t.id, title: t.title })),
        tasksRemaining: dailyIncomplete.length,
      });
      return tasks;
    },
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

function syncTasksToWidgets(queryClient: ReturnType<typeof useQueryClient>) {
  const tasks = queryClient.getQueryData<Task[]>(["tasks"]);
  if (tasks) {
    const dailyIncomplete = tasks.filter(
      (t) => !t.completed && t.type === "day"
    );
    syncWidgetData({
      dailyTasks: dailyIncomplete.map((t) => ({ id: t.id, title: t.title })),
      tasksRemaining: dailyIncomplete.length,
    });
  }
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskData: { title: string; type: string }) => {
      const online = await isOnline();
      if (online) {
        return api.createTask(taskData);
      }
      // Queue for later and return a temporary task
      await offlineQueue.add("createTask", taskData);
      return {
        id: `temp-${Date.now()}`,
        title: taskData.title,
        type: taskData.type,
        completed: false,
        completedAt: null,
        createdAt: new Date(),
      } as Task;
    },
    onMutate: async (taskData) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueryData<Task[]>(["tasks"]);

      const tempTask: Task = {
        id: `temp-${Date.now()}`,
        title: taskData.title,
        type: taskData.type,
        completed: false,
        completedAt: null,
        createdAt: new Date(),
      };

      queryClient.setQueryData<Task[]>(["tasks"], (old) => [
        ...(old || []),
        tempTask,
      ]);

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tasks"], context.previous);
      }
    },
    onSettled: async () => {
      const online = await isOnline();
      if (online) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
      syncTasksToWidgets(queryClient);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: Partial<Task>;
    }) => {
      const online = await isOnline();
      if (online) {
        return api.updateTask(taskId, updates);
      }
      await offlineQueue.add("updateTask", { taskId, updates });
      return { id: taskId, ...updates } as Task;
    },
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
    onSettled: async () => {
      const online = await isOnline();
      if (online) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
      syncTasksToWidgets(queryClient);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const online = await isOnline();
      if (online) {
        return api.deleteTask(taskId);
      }
      await offlineQueue.add("deleteTask", taskId);
    },
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
    onSettled: async () => {
      const online = await isOnline();
      if (online) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
    },
  });
}
