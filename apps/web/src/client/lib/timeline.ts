const DAY = 86_400_000;

/** Circle diameter, the distance between neighbouring circles, and the room kept for "+N". */
export const TIMELINE = { mark: 16, gap: 18, clearToday: 11, more: 28 } as const;

/**
 * Time on a power curve around now, so the last few days get room and a word from months ago
 * still fits. Linear time piles this week's reviews into one spot.
 */
function warp(t: number, now: number): number {
  const days = (t - now) / DAY;
  return Math.sign(days) * Math.abs(days) ** 0.7;
}

/**
 * Spread ascending targets so neighbours sit at least `gap` apart inside [lo, hi]. A crowd
 * becomes one group centred on the mean of its real positions, and groups that then touch
 * merge and recentre, so order never changes and nothing moves further than it has to.
 */
export function spread(targets: readonly number[], gap: number, lo: number, hi: number): number[] {
  const groups: { sum: number; n: number }[] = [];
  const first = (g: { sum: number; n: number }) =>
    Math.min(Math.max(g.sum / g.n - ((g.n - 1) * gap) / 2, lo), hi - (g.n - 1) * gap);
  for (const target of targets) {
    let group = { sum: target, n: 1 };
    let prev = groups.at(-1);
    while (prev && first(prev) + prev.n * gap > first(group)) {
      groups.pop();
      group = { sum: prev.sum + group.sum, n: prev.n + group.n };
      prev = groups.at(-1);
    }
    groups.push(group);
  }
  return groups.flatMap((g) => Array.from({ length: g.n }, (_, i) => first(g) + i * gap));
}

export interface TimelineLayout {
  /** Where now is, in px from the start edge. */
  today: number;
  /** The reviews drawn, by index into the input, oldest first. */
  marks: { index: number; x: number }[];
  /** How many of the oldest reviews fold into "+N" because the line is too short for them. */
  hidden: number;
  /** One per due date, in the order given. */
  rings: number[];
  /** The line's last date. It is a due date when `endIsDue`. */
  end: Date;
  endIsDue: boolean;
  /** Where any date sits on the line, for the axis labels. */
  at: (date: Date) => number;
}

/**
 * Past reviews stay before the today line and upcoming due dates after it. Circles never
 * overlap: when they cannot all fit, the oldest fold into a count at the start.
 */
export function layoutTimeline({
  start,
  now,
  reviews,
  dues,
  width,
}: {
  start: Date;
  now: Date;
  /** Oldest first. */
  reviews: readonly Date[];
  dues: readonly Date[];
  width: number;
}): TimelineLayout {
  const { mark, gap, clearToday, more } = TIMELINE;
  const nowMs = now.getTime();
  const endMs = Math.max(nowMs + DAY, ...dues.map((d) => d.getTime()));
  const from = warp(Math.min(start.getTime(), nowMs), nowMs);
  const to = warp(endMs, nowMs);
  const at = (date: Date) => {
    const p = (warp(date.getTime(), nowMs) - from) / (to - from);
    return Math.min(1, Math.max(0, p)) * width;
  };
  const half = mark / 2;
  const today = at(now);
  const hi = Math.max(half, today - clearToday);
  const fits = (lo: number) => Math.max(1, Math.floor((hi - lo) / gap) + 1);

  let lo = half;
  let hidden = 0;
  if (reviews.length > fits(lo)) {
    lo = half + more;
    hidden = reviews.length - fits(lo);
  }
  const shown = reviews.slice(hidden);
  const xs = spread(
    shown.map((d) => Math.min(Math.max(at(d), lo), hi)),
    gap,
    lo,
    hi,
  );

  const order = dues.map((d, i) => ({ i, x: at(d) })).sort((a, b) => a.x - b.x);
  const ringEnd = width - half;
  const ringXs = spread(
    order.map((o) => o.x),
    gap,
    Math.min(today + clearToday, ringEnd),
    ringEnd,
  );
  const rings: number[] = [];
  order.forEach((o, k) => {
    rings[o.i] = ringXs[k] ?? o.x;
  });

  return {
    today,
    marks: xs.map((x, i) => ({ index: i + hidden, x })),
    hidden,
    rings,
    end: new Date(endMs),
    endIsDue: dues.some((d) => d.getTime() === endMs),
    at,
  };
}
