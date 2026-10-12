import { useLingui } from "@lingui/react/macro";
import { insightsQuery } from "@lymi/client/queries";
import { useQuery } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useMMKVString } from "react-native-mmkv";
import { DEVICE_KEYS, deviceStore } from "../data/kept";
import { useDay } from "../data/queries";
import {
  notificationPermission,
  opensReview,
  registerActions,
  schedule,
  snoozedUntil,
} from "./notifications";
import { planReminders } from "./plan";

/** The forecast moves with grades and the day; an hour old is close enough for a week ahead. */
const FORECAST_STALE_MS = 60 * 60 * 1000;

/**
 * Plans the week's reminders again whenever what they say could change: the time, a grade, the
 * day counting, the language, or the app coming back to the front. A tap on one opens a review.
 */
export function ReminderSync() {
  const router = useRouter();
  const { i18n } = useLingui();
  const [time] = useMMKVString(DEVICE_KEYS.reminder, deviceStore);
  const { left, dayDone } = useDay();
  const insights = useQuery({
    ...insightsQuery(30),
    enabled: !!time,
    staleTime: FORECAST_STALE_MS,
    refetchOnMount: true,
  });
  const forecast = insights.data?.forecast.map((d) => d.count).join(",");
  const [front, setFront] = useState(0);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") setFront((n) => n + 1);
    });
    return () => listener.remove();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the action titles follow the language.
  useEffect(() => {
    void registerActions();
  }, [i18n.locale]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a return to the front and the language replan too.
  useEffect(() => {
    if (time && left === undefined) return;
    // A review grades every few seconds; the plan only needs where the day settled.
    const timer = setTimeout(async () => {
      if (!time) return schedule([]);
      if ((await notificationPermission()) !== "granted") return;
      await schedule(
        planReminders({
          time,
          now: new Date(),
          left: left ?? 0,
          dayDone,
          forecast: forecast?.split(",").map(Number),
          snoozedUntil: snoozedUntil(),
        }),
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, [time, left, dayDone, forecast, front, i18n.locale]);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      if (!opensReview(response)) return;
      Notifications.clearLastNotificationResponse();
      router.navigate("/review");
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) open(last);
    const listener = Notifications.addNotificationResponseReceivedListener(open);
    return () => listener.remove();
  }, [router]);

  return null;
}
