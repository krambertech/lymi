import type { ComponentType } from "react";
import { Brand } from "./brand";
import { Colour } from "./colour";
import { FlamePage } from "./flame";
import { LanternPage } from "./lantern";
import { Layout } from "./layout";
import { Motion } from "./motion";
import { actions } from "./parts/actions";
import { charts, streak } from "./parts/charts";
import { empty } from "./parts/empty";
import { feedback } from "./parts/feedback";
import { combobox, forms, select } from "./parts/forms";
import { labels } from "./parts/labels";
import { layout } from "./parts/layout";
import { lists, table } from "./parts/lists";
import { navigation } from "./parts/navigation";
import { menu, overlays } from "./parts/overlays";
import { review } from "./parts/review";
import type { Group } from "./parts/types";
import { Space } from "./space";
import { StreakPage } from "./streak";
import { Surfaces } from "./surfaces";
import { Typography } from "./typography";
import { Voice } from "./voice";

/** How a page shows in search, the overview and the rail. */
export interface Listing {
  /** One line on what the page holds. */
  summary: string;
  /** The written guide that owns the page's rules, relative to `docs/design/system`. */
  guide: string;
}

export interface Foundation extends Listing {
  slug: string;
  title: string;
  /** The page's own file under `apps/web/src/client`, for its source link. */
  source: string;
  Page: ComponentType;
}

export const FOUNDATIONS: Foundation[] = [
  {
    slug: "brand",
    title: "Brand",
    summary: "The name, the lantern mark, the wordmark and the app icon.",
    guide: "brand.md",
    source: "design/brand.tsx",
    Page: Brand,
  },
  {
    slug: "lantern",
    title: "Lantern",
    summary: "How the lantern's flame follows a learner's day and streak.",
    guide: "brand.md",
    source: "design/lantern.tsx",
    Page: LanternPage,
  },
  {
    slug: "flame",
    title: "Flame",
    summary: "The small streak flame: its sizes and how it lights.",
    guide: "brand.md",
    source: "design/flame.tsx",
    Page: FlamePage,
  },
  {
    slug: "streak",
    title: "Streak",
    summary: "How a day counts, and how the streak shows it.",
    guide: "../streak.md",
    source: "design/streak.tsx",
    Page: StreakPage,
  },
  {
    slug: "colour",
    title: "Colour",
    summary: "Every colour token, its job and its contrast, in both themes.",
    guide: "colour.md",
    source: "design/colour.tsx",
    Page: Colour,
  },
  {
    slug: "surfaces",
    title: "Surfaces",
    summary: "Backgrounds, edges, elevation, hover and glass.",
    guide: "surfaces.md",
    source: "design/surfaces.tsx",
    Page: Surfaces,
  },
  {
    slug: "typography",
    title: "Typography",
    summary: "One family, one scale, and how learner text is set.",
    guide: "type.md",
    source: "design/typography.tsx",
    Page: Typography,
  },
  {
    slug: "space",
    title: "Space and shape",
    summary: "The 4 px grid, gaps and the radius scale.",
    guide: "surfaces.md",
    source: "design/space.tsx",
    Page: Space,
  },
  {
    slug: "layout",
    title: "Layout",
    summary: "Tabs, pages, places and moments, and how each arrives.",
    guide: "layout.md",
    source: "design/layout.tsx",
    Page: Layout,
  },
  {
    slug: "motion",
    title: "Motion",
    summary: "What moves, for how long, and what reduced motion does.",
    guide: "motion.md",
    source: "design/motion.tsx",
    Page: Motion,
  },
  {
    slug: "voice",
    title: "Voice",
    summary: "How Lymi talks: plain words, no nagging, no fanfare.",
    guide: "voice.md",
    source: "design/voice.tsx",
    Page: Voice,
  },
];

export const GROUPS: Group[] = [
  actions,
  forms,
  select,
  combobox,
  labels,
  feedback,
  empty,
  menu,
  overlays,
  lists,
  table,
  navigation,
  layout,
  review,
  streak,
  charts,
];

/** Each component group's listing, keyed by its slug. */
const GROUP_LISTINGS: Record<string, Listing> = {
  actions: {
    summary: "Buttons, icon buttons and the capture button.",
    guide: "buttons.md",
  },
  forms: {
    summary: "Fields, labels, errors, checkboxes, radios and switches.",
    guide: "forms.md",
  },
  select: { summary: "Pick one from a short list.", guide: "forms.md" },
  combobox: { summary: "Search a long list, or add to it.", guide: "forms.md" },
  labels: {
    summary: "State chips, the AI badge, due counts and keys.",
    guide: "chips-and-marks.md",
  },
  feedback: {
    summary: "Progress, toasts, notices and tips.",
    guide: "overlays.md",
  },
  "empty-states": {
    summary: "First run, nothing yet, loading, no results and load errors.",
    guide: "empty-states.md",
  },
  menu: { summary: "Actions on a thing, behind ⋯.", guide: "overlays.md" },
  overlays: {
    summary: "Tooltips, popovers, dialogs, drawers and sheets.",
    guide: "overlays.md",
  },
  lists: { summary: "Deck rows, settings groups and separators.", guide: "components.md" },
  table: { summary: "Cards in columns, with sorting.", guide: "components.md" },
  navigation: { summary: "The rail, the pill and the bars.", guide: "rail.md" },
  layout: {
    summary: "Screen and PlaceBar, which build every screen.",
    guide: "layout.md",
  },
  review: {
    summary: "The card, the grades and the end of a session.",
    guide: "layout.md",
  },
  streak: {
    summary: "The streak pill, its modal and the week.",
    guide: "../streak.md",
  },
  charts: {
    summary: "Stat plates, trend lines and the day grid.",
    guide: "../insights.md",
  },
};

export function groupListing(slug: string): Listing {
  const listing = GROUP_LISTINGS[slug];
  if (!listing) throw new Error(`No listing for the ${slug} group`);
  return listing;
}

export type DocRef =
  | { kind: "home" }
  | { kind: "page"; page: string }
  | { kind: "group"; group: string };

export interface DocItem {
  key: string;
  title: string;
  ref: DocRef;
}

/** Reading order, for previous and next. */
export const ORDER: DocItem[] = [
  { key: "home", title: "Overview", ref: { kind: "home" } },
  ...FOUNDATIONS.map((f) => ({
    key: `page:${f.slug}`,
    title: f.title,
    ref: { kind: "page", page: f.slug } as const,
  })),
  ...GROUPS.map((g) => ({
    key: `group:${g.slug}`,
    title: g.title,
    ref: { kind: "group", group: g.slug } as const,
  })),
];
