import { lightLevel, lightReference } from "@lymi/design";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { widgetsDirectory } from "expo-widgets";
import { useEffect, useState } from "react";
import { useDay, useDecks } from "../data/queries";
import { weekLetters } from "../ui/days";
import { WIDGET_COLOURS } from "./colours";
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

interface Snapshot {
  due: number;
  streak: number;
  reviewed: number;
  goal: number;
  left: number;
  out: boolean;
  /** Each day's step of the seven lights, oldest first. */
  week: number[];
}

function send(name: string, update: () => void) {
  try {
    update();
  } catch (e) {
    console.warn(`widget ${name}`, e);
  }
}

function sendSnapshot(s: Snapshot, images: Images) {
  const { flame, ...lanterns } = images;
  send("lock", () =>
    LockWidget.updateSnapshot({ due: s.due, streak: s.streak, reviewed: s.reviewed, goal: s.goal }),
  );
  send("today", () =>
    TodayWidget.updateSnapshot({
      due: s.due,
      streak: s.streak,
      out: s.out,
      lanterns: lanterns as Lanterns,
      colours: WIDGET_COLOURS,
    }),
  );
  send("week", () =>
    WeekWidget.updateSnapshot({
      streak: s.streak,
      due: s.due,
      left: s.left,
      week: s.week,
      letters: weekLetters(s.week.length),
      flame: flame ?? "",
      colours: WIDGET_COLOURS,
    }),
  );
}

/** The images an earlier signed-in run already copied into the app group. */
function sharedImages(): Images {
  const out: Images = {};
  if (!widgetsDirectory) return out;
  for (const name of Object.keys(IMAGES) as (keyof Images)[]) {
    const file = new File(widgetsDirectory, `${name}.png`);
    if (file.exists) out[name] = file.uri;
  }
  return out;
}

/**
 * Replaces the app group's snapshots with an unlit lantern and nothing due, so the widgets stop
 * showing a learner who is no longer signed in on this phone.
 */
export function clearWidgets() {
  sendSnapshot(
    { due: 0, streak: 0, reviewed: 0, goal: 0, left: 0, out: true, week: [0, 0, 0, 0, 0, 0, 0] },
    sharedImages(),
  );
}

/** Pushes today's numbers to the widgets whenever they change. The real app does this after each sync. */
export function WidgetSync() {
  const { streak, reviewsToday, goal, week, dayDone, out } = useDay();
  const due = useDecks().data?.reduce((n, d) => n + d.due, 0) ?? 0;
  const [images, setImages] = useState<Images>({});

  useEffect(() => {
    shareImages().then(setImages);
  }, []);

  const weekKey = week.join(",");
  useEffect(() => {
    const days = weekKey.split(",").map(Number);
    const reference = lightReference(days);
    const steps = days.map((n, i) =>
      lightLevel(n, reference, goal, i === days.length - 1 && dayDone),
    );
    const left = dayDone ? 0 : Math.max(0, goal - reviewsToday);
    // A review grades every few seconds; the widget only needs where the day settled.
    const timer = setTimeout(
      () =>
        sendSnapshot({ due, streak, reviewed: reviewsToday, goal, left, out, week: steps }, images),
      1500,
    );
    return () => clearTimeout(timer);
  }, [images, due, streak, reviewsToday, goal, weekKey, dayDone, out]);

  return null;
}
