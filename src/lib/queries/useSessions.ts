import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Session } from "../../types";
import { useAuthStore } from "../store/auth";
import { syncWidgetData } from "../widgetSync";

export function useSessions() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["sessions"],
    queryFn: api.getUserSessions,
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useSubmitSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionData: Omit<Session, "id" | "user_id">) =>
      api.submitSession(sessionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      // Update widget with new session data
      const sessions = queryClient.getQueryData<Session[]>(["sessions"]);
      if (sessions) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMins = sessions
          .filter((s) => s.created_at && new Date(s.created_at) >= today)
          .reduce((sum, s) => sum + s.minutes, 0);
        syncWidgetData({ focusHours: todayMins / 60 });
      }
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => api.deleteSession(sessionId),
    onMutate: async (sessionId) => {
      await queryClient.cancelQueries({ queryKey: ["sessions"] });
      const previous = queryClient.getQueryData<Session[]>(["sessions"]);
      queryClient.setQueryData<Session[]>(["sessions"], (old) =>
        (old || []).filter((s) => s.id !== sessionId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["sessions"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useTodaySessions() {
  const { data: sessions } = useSessions();

  if (!sessions) return { sessions: [], totalMinutes: 0, totalHours: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySessions = sessions.filter((s) => {
    if (!s.created_at) return false;
    const sessionDate = new Date(s.created_at);
    return sessionDate >= today;
  });

  const totalMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0);

  return {
    sessions: todaySessions,
    totalMinutes,
    totalHours: totalMinutes / 60,
  };
}
