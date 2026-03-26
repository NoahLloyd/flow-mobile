import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useAuthStore } from "../store/auth";

function getTodayDate(timezone?: string): string {
  try {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const month = parts.find((p) => p.type === "month")?.value || "01";
    const day = parts.find((p) => p.type === "day")?.value || "01";
    const year = parts.find((p) => p.type === "year")?.value || "2024";
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export function useDailySignals() {
  const user = useAuthStore((s) => s.user);
  const today = getTodayDate(user?.preferences?.timezone);

  return useQuery({
    queryKey: ["signals", today],
    queryFn: () => api.getDailySignals(today),
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useRecordSignal() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const today = getTodayDate(user?.preferences?.timezone);

  return useMutation({
    mutationFn: ({
      metric,
      value,
    }: {
      metric: string;
      value: number | boolean;
    }) => api.recordSignal(today, metric, value),
    onMutate: async ({ metric, value }) => {
      await queryClient.cancelQueries({ queryKey: ["signals", today] });
      const previous = queryClient.getQueryData(["signals", today]);
      queryClient.setQueryData(
        ["signals", today],
        (old: Record<string, any> | undefined) => ({
          ...old,
          [metric]: value,
        })
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["signals", today], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["signals", today] });
    },
  });
}

export function useSignalRange(startDate: string, endDate: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["signals", "range", startDate, endDate],
    queryFn: () => api.getSignalRange(startDate, endDate),
    enabled: !!user,
  });
}
