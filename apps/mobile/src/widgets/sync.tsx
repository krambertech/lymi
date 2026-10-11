import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { widgetsDirectory } from "expo-widgets";
import { useEffect, useState } from "react";
import { useStore } from "../data/store";
import { weekLetters } from "../ui/days";
import LockWidget from "./lock-widget";
import TodayWidget, { type Lanterns } from "./today-widget";
import WeekWidget from "./week-widget";

const IMAGES = {
  dark: require("../../assets/widget-lantern-dark.png"),
  light: require("../../assets/widget-lantern-light.png"),
  darkOut: require("../../assets/widget-lantern-unlit-dark.png"),
  lightOut: require("../../assets/widget-lantern-unlit-light.png"),
  flame: require("../../assets/widget-flame.png"),
};

type Images = Partial<Lanterns & { flame: string }>;

/** A widget cannot read the app's sandbox, so its images are copied into the shared app group. */
async function shareImages(): Promise<Images> {
  const out: Images = {};
  if (!widgetsDirectory) return out;
  for (const [name, source] of Object.entries(IMAGES) as [keyof Images, number][]) {
    try {
      const [asset] = await Asset.loadAsync(source);
      if (!asset?.localUri) continue;
      const target = new File(widgetsDirectory, `${name}.png`);
      await new File(asset.localUri).copy(target, { overwrite: true });
      out[name] = target.uri;
    } catch (e) {
      // A widget without one picture still shows its numbers.
      console.warn(`widget image ${name}`, e);
    }
  }
  return out;
}

function level(n: number, goal: number) {
  if (n <= 0) return 0;
  return n >= goal ? 3 : n >= goal / 2 ? 2 : 1;
}

/** Pushes today's numbers to the widgets whenever they change. The real app does this after each sync. */
export function WidgetSync() {
  const { due, streak, reviewsToday, goal, week, dayDone } = useStore();
  const [images, setImages] = useState<Images>({});

  useEffect(() => {
    shareImages().then(setImages);
  }, []);

  const weekKey = week.join(",");
  useEffect(() => {
    const days = weekKey.split(",").map(Number);
    const steps = days.map((n, i) => (i === days.length - 1 && dayDone ? 3 : level(n, goal)));
    const left = dayDone ? 0 : Math.max(0, goal - reviewsToday);
    const { flame, ...lanterns } = images;
    // A review grades every few seconds; the widget only needs where the day settled.
    const timer = setTimeout(() => {
      const send = (name: string, update: () => void) => {
        try {
          update();
        } catch (e) {
          console.warn(`widget ${name}`, e);
        }
      };
      send("lock", () =>
        LockWidget.updateSnapshot({ due: due.length, streak, reviewed: reviewsToday, goal }),
      );
      send("today", () =>
        TodayWidget.updateSnapshot({
          due: due.length,
          streak,
          out: streak === 0 && reviewsToday === 0,
          lanterns: lanterns as Lanterns,
        }),
      );
      send("week", () =>
        WeekWidget.updateSnapshot({
          streak,
          due: due.length,
          left,
          week: steps,
          letters: weekLetters(steps.length),
          flame: flame ?? "",
        }),
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, [images, due.length, streak, reviewsToday, goal, weekKey, dayDone]);

  return null;
}
