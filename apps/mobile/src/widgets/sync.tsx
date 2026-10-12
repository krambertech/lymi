import { lightLevel, lightReference } from "@lymi/design";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { widgetsDirectory } from "expo-widgets";
import { useEffect, useState } from "react";
import { dueToday } from "../data/due";
import { useDay, useDecks, useDraw, useKeptSince } from "../data/queries";
import { weekLetters } from "../ui/days";
import { WIDGET_COLOURS } from "./colours";
import LockWidget from "./lock-widget";
import { nextDay, type Snapshot } from "./next-day";
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

function send(name: string, update: () => void) {
  try {
    update();
  } catch (e) {
    console.warn(`widget ${name}`, e);
  }
}

function widgetProps(s: Snapshot, images: Images) {
  const { flame, ...lanterns } = images;
  return {
    lock: { due: s.due, streak: s.streak, reviewed: s.reviewed, goal: s.goal },
    today: {
      due: s.due,
      streak: s.streak,
      out: s.out,
      lanterns: lanterns as Lanterns,
      colours: WIDGET_COLOURS,
    },
    week: {
      streak: s.streak,
      due: s.due,
      left: s.left,
      signedIn: s.signedIn,
      week: s.week,
      letters: weekLetters(s.week.length),
      flame: flame ?? "",
      colours: WIDGET_COLOURS,
    },
  };
}

function sendSnapshot(s: Snapshot, images: Images) {
  const props = widgetProps(s, images);
  send("lock", () => LockWidget.updateSnapshot(props.lock));
  send("today", () => TodayWidget.updateSnapshot(props.today));
  send("week", () => WeekWidget.updateSnapshot(props.week));
}

/** Now, then the next day from its first moment, so the widgets roll over without the app. */
function sendTimeline(now: Snapshot, next: { at: Date; snapshot: Snapshot }, images: Images) {
  const a = widgetProps(now, images);
  const b = widgetProps(next.snapshot, images);
  const at = new Date();
  send("lock", () =>
    LockWidget.updateTimeline([
      { date: at, props: a.lock },
      { date: next.at, props: b.lock },
    ]),
  );
  send("today", () =>
    TodayWidget.updateTimeline([
      { date: at, props: a.today },
      { date: next.at, props: b.today },
    ]),
  );
  send("week", () =>
    WeekWidget.updateTimeline([
      { date: at, props: a.week },
      { date: next.at, props: b.week },
    ]),
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
    {
      due: 0,
      streak: 0,
      reviewed: 0,
      goal: 0,
      left: 0,
      out: true,
      signedIn: false,
      week: [0, 0, 0, 0, 0, 0, 0],
    },
    sharedImages(),
  );
}

/** Pushes today's numbers to the widgets whenever they change. The real app does this after each sync. */
export function WidgetSync() {
  const { streak, reviewsToday, goal, week, dayDone, out, left, summary } = useDay();
  const decks = useDecks();
  const due = dueToday(decks.data ?? [], left, !!useKeptSince(decks));
  // The draw knows when the learner's day ends.
  const end = useDraw().data?.day.end;
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
    const now = {
      due,
      streak,
      reviewed: reviewsToday,
      goal,
      left,
      out,
      signedIn: true,
      week: steps,
    };
    // A review grades every few seconds; the widget only needs where the day settled.
    const timer = setTimeout(() => {
      const next = summary && end ? nextDay(now, summary, days, new Date(end)) : undefined;
      if (next) sendTimeline(now, next, images);
      else sendSnapshot(now, images);
    }, 1500);
    return () => clearTimeout(timer);
  }, [images, due, streak, reviewsToday, goal, weekKey, dayDone, out, summary, end]);

  return null;
}
