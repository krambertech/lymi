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
import type { Group, Screen } from "./parts/types";
import { Space } from "./space";
import { StreakPage } from "./streak";
import { Typography } from "./typography";
import { Voice } from "./voice";

/** Every screen, one file each under `screens/`, in the order their `order` fields give. */
export const SCREENS: Screen[] = Object.values(
  import.meta.glob<Screen>("./screens/*.tsx", { eager: true, import: "screen" }),
).sort((a, b) => a.order - b.order);

for (const [i, s] of SCREENS.entries()) {
  const clash = SCREENS.slice(0, i).find((t) => t.order === s.order || t.slug === s.slug);
  if (clash)
    throw new Error(`Design screens "${clash.slug}" and "${s.slug}" share an order or slug`);
}

export interface Foundation {
  slug: string;
  title: string;
  /** The page's own file under `apps/web/src/client`, for its edit link. */
  source: string;
  Page: ComponentType;
}

export const FOUNDATIONS: Foundation[] = [
  { slug: "brand", title: "Brand", source: "design/brand.tsx", Page: Brand },
  { slug: "lantern", title: "Lantern", source: "design/lantern.tsx", Page: LanternPage },
  { slug: "flame", title: "Flame", source: "design/flame.tsx", Page: FlamePage },
  { slug: "streak", title: "Streak", source: "design/streak.tsx", Page: StreakPage },
  { slug: "colour", title: "Colour", source: "design/colour.tsx", Page: Colour },
  { slug: "typography", title: "Typography", source: "design/typography.tsx", Page: Typography },
  { slug: "space", title: "Space and shape", source: "design/space.tsx", Page: Space },
  { slug: "layout", title: "Layout", source: "design/layout.tsx", Page: Layout },
  { slug: "motion", title: "Motion", source: "design/motion.tsx", Page: Motion },
  { slug: "voice", title: "Voice", source: "design/voice.tsx", Page: Voice },
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
  streak,
  charts,
];

export type DocRef =
  | { kind: "page"; page: string }
  | { kind: "group"; group: string }
  | { kind: "screen"; screen: string };

export interface DocItem {
  key: string;
  title: string;
  ref: DocRef;
}

/** Reading order, for previous and next. */
export const ORDER: DocItem[] = [
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
  ...SCREENS.map((s) => ({
    key: `screen:${s.slug}`,
    title: s.name,
    ref: { kind: "screen", screen: s.slug } as const,
  })),
];
