import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { widgetsDirectory } from "expo-widgets";
import { useEffect, useState } from "react";
import { useStore } from "../data/store";
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

type Images = Lanterns & { flame: string };

/** A widget cannot read the app's sandbox, so its images are copied into the shared app group once. */
async function shareImages(): Promise<Images | null> {
  if (!widgetsDirectory) return null;
  const out = {} as Images;
  for (const [name, source] of Object.entries(IMAGES) as [keyof Images, number][]) {
    const [asset] = await Asset.loadAsync(source);
    const target = new File(widgetsDirectory, `${name}.png`);
    if (target.exists) target.delete();
    if (asset?.localUri) new File(asset.localUri).copy(target);
    out[name] = target.uri;
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
  const [images, setImages] = useState<Images | null>(null);

  useEffect(() => {
    shareImages()
      .then(setImages)
      .catch((e) => console.warn("widget images", e));
  }, []);

  useEffect(() => {
    if (!images) return;
    const days = week.map((n, i) => (i === week.length - 1 && dayDone ? 3 : level(n, goal)));
    const left = dayDone ? 0 : Math.max(0, goal - reviewsToday);
    // A review grades every few seconds; the widget only needs where the day settled.
    const timer = setTimeout(() => {
      try {
        const { flame, ...lanterns } = images;
        TodayWidget.updateSnapshot({
          due: due.length,
          streak,
          out: streak === 0 && reviewsToday === 0,
          lanterns,
        });
        WeekWidget.updateSnapshot({ streak, due: due.length, left, week: days, flame });
        LockWidget.updateSnapshot({ due: due.length, streak, reviewed: reviewsToday, goal });
      } catch (e) {
        console.warn("widget update", e);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [images, due.length, streak, reviewsToday, goal, week, dayDone]);

  return null;
}
