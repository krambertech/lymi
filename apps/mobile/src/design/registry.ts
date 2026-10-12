import type { ComponentType } from "react";
import { Actions, Choices, Feedback, Forms, Labels } from "./pages/components";
import { EmptyStates } from "./pages/empty";
import { Colour, HapticsPage, Icons, Motion, Surfaces, Type } from "./pages/foundations";
import { Pages, Sheets } from "./pages/patterns";

export interface DesignPage {
  slug: string;
  title: string;
  /** One line on the index. */
  summary: string;
  /** What the page is about, under its title. */
  lede: string;
  /** The rule this page shows, under `docs/design/system`. */
  doc: string;
  Page: ComponentType;
}

export const FOUNDATIONS: DesignPage[] = [
  {
    slug: "colour",
    title: "Colour",
    summary: "Two rooms, one flame, and what amber is for",
    lede: "Warm neutrals, nearly grey, with amber as the only saturated accent. Amber means act; every other hue describes. The tokens come from packages/design, the same as the web.",
    doc: "colour.md",
    Page: Colour,
  },
  {
    slug: "type",
    title: "Type",
    summary: "Onest on the phone’s own ramp",
    lede: "One family, Onest. The word on the card is the largest thing on any screen. The phone keeps the web’s step names at sizes that read on iOS.",
    doc: "type.md",
    Page: Type,
  },
  {
    slug: "icons",
    title: "Icons",
    summary: "Lucide, one stroke, sized to the text beside it",
    lede: "The web’s icons, so a screen reads the same on both. Each icon is named for what it means here, never for what it draws.",
    doc: "components.md",
    Page: Icons,
  },
  {
    slug: "surfaces",
    title: "Surfaces and glass",
    summary: "Flat by day, lifted at night, glass for chrome",
    lede: "By day every surface is flat, with one hairline. At night plates lift a little off the room. Liquid Glass is for chrome that floats over content.",
    doc: "surfaces.md",
    Page: Surfaces,
  },
  {
    slug: "pages",
    title: "Pages",
    summary: "How a screen is laid out and how it arrives",
    lede: "Every screen is one of three: a tab, a page pushed from the side, or a sheet or cover from below. How it arrives says how to leave.",
    doc: "phone.md",
    Page: Pages,
  },
  {
    slug: "motion",
    title: "Motion",
    summary: "Presses and springs",
    lede: "Motion says what changed and nothing else. Every animation has its Reduce Motion version, chosen while the app runs.",
    doc: "motion.md",
    Page: Motion,
  },
  {
    slug: "haptics",
    title: "Haptics",
    summary: "Every haptic, to feel on the phone",
    lede: "A haptic answers a touch that changes something, or marks the daily goal. Nothing else buzzes.",
    doc: "phone.md",
    Page: HapticsPage,
  },
];

export const COMPONENTS: DesignPage[] = [
  {
    slug: "actions",
    title: "Actions",
    summary: "Button and icon button",
    lede: "Standard controls that look like what they are. One primary per view. A press gives 3%; nothing lifts.",
    doc: "buttons.md",
    Page: Actions,
  },
  {
    slug: "forms",
    title: "Forms",
    summary: "Field, input, password, textarea",
    lede: "A form reads as one row repeated, so every control is the same 44 pt box with 17 pt text.",
    doc: "forms.md",
    Page: Forms,
  },
  {
    slug: "choices",
    title: "Choices",
    summary: "Switch, segmented, select, field chip",
    lede: "On or off, one of a few, or one of a list. Lymi draws every control, the list a select opens included.",
    doc: "forms.md",
    Page: Choices,
  },
  {
    slug: "sheets",
    title: "Sheets and menus",
    summary: "Glass sheets, menus, choices, drag up for more",
    lede: "What comes and goes rises from the bottom edge, where the thumb is. iOS draws the glass sheet; Lymi draws everything on it.",
    doc: "phone.md",
    Page: Sheets,
  },
  {
    slug: "labels",
    title: "Labels",
    summary: "Chips, state and source marks, due counts, grades",
    lede: "Small labels that describe: a card’s state, where a field came from, how many cards are due. None is a button, and none is amber except the due count.",
    doc: "chips-and-marks.md",
    Page: Labels,
  },
  {
    slug: "feedback",
    title: "Feedback",
    summary: "Progress, skeleton, loading",
    lede: "What is happening while the learner waits, said as quietly as it can be.",
    doc: "motion.md",
    Page: Feedback,
  },
  {
    slug: "empty-states",
    title: "Empty states",
    summary: "Nothing yet, no match, couldn’t load, offline",
    lede: "A place with nothing to show says why and how to fill it, and looks temporary, so it is never mistaken for content.",
    doc: "empty-states.md",
    Page: EmptyStates,
  },
];

export const PAGES = [...FOUNDATIONS, ...COMPONENTS];
