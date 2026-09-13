import type { ComponentType } from "react";
import { Brand } from "./Brand";
import { Colour } from "./Colour";
import { FlamePage } from "./Flame";
import { LanternPage } from "./Lantern";
import { Motion } from "./Motion";
import { actions } from "./parts/Actions";
import { charts, streak } from "./parts/Charts";
import { feedback } from "./parts/Feedback";
import { combobox, forms, select } from "./parts/Forms";
import { labels } from "./parts/Labels";
import { lists, table } from "./parts/Lists";
import { navigation } from "./parts/Navigation";
import { menu, overlays } from "./parts/Overlays";
import type { Group } from "./parts/types";
import { SCREENS } from "./Screens";
import { Space } from "./Space";
import { StreakPage } from "./Streak";
import { Typography } from "./Typography";
import { Voice } from "./Voice";

export { SCREENS };

export interface Foundation {
  slug: string;
  title: string;
  /** The page's own file under `apps/web/src/client`, for its edit link. */
  source: string;
  Page: ComponentType;
}

export const FOUNDATIONS: Foundation[] = [
  { slug: "brand", title: "Brand", source: "design/Brand.tsx", Page: Brand },
  { slug: "lantern", title: "Lantern", source: "design/Lantern.tsx", Page: LanternPage },
  { slug: "flame", title: "Flame", source: "design/Flame.tsx", Page: FlamePage },
  { slug: "streak", title: "Streak", source: "design/Streak.tsx", Page: StreakPage },
  { slug: "colour", title: "Colour", source: "design/Colour.tsx", Page: Colour },
  { slug: "typography", title: "Typography", source: "design/Typography.tsx", Page: Typography },
  { slug: "space", title: "Space and shape", source: "design/Space.tsx", Page: Space },
  { slug: "motion", title: "Motion", source: "design/Motion.tsx", Page: Motion },
  { slug: "voice", title: "Voice", source: "design/Voice.tsx", Page: Voice },
];

export const GROUPS: Group[] = [
  actions,
  forms,
  select,
  combobox,
  labels,
  feedback,
  menu,
  overlays,
  lists,
  table,
  navigation,
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
