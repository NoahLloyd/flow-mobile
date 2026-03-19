import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useAuthStore } from "../store/auth";

export function useMorningEntries() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["morning", "entries"],
    queryFn: api.getAllEntries,
    enabled: !!user,
  });
}

export function useTodayEntry(date: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["morning", "entry", date],
    queryFn: () => api.getEntry(date),
    enabled: !!user && !!date,
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      date,
      content,
      activityContent,
    }: {
      date: string;
      content: string;
      activityContent?: any;
    }) => api.updateEntry(date, content, activityContent),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["morning", "entry", variables.date],
      });
      queryClient.invalidateQueries({ queryKey: ["morning", "entries"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
    },
  });
}
