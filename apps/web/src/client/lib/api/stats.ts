import type { InsightsOut, StreakOut } from "@lymi/core";
import { deviceTimezone, request } from "./request";

export const statsApi = {
  streak: () => request<StreakOut>(`/api/stats/streak?tz=${encodeURIComponent(deviceTimezone())}`),
  insights: (period: 30 | 90 | 0 = 30) =>
    request<InsightsOut>(
      `/api/stats/insights?period=${period}&tz=${encodeURIComponent(
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      )}`,
    ),
};
