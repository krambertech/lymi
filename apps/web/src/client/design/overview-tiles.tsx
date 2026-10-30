import { clsx } from "clsx";
import { ChevronDown, Plus, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Flame } from "../components/flame";
import { Lantern } from "../components/lantern";
import { Wordmark } from "../components/logo";
import { DocLink } from "./doc-link";
import type { DocRef } from "./registry";

interface Tile {
  title: string;
  to: DocRef;
  picture: ReactNode;
}

function line(className: string) {
  return <span className={clsx("block h-1.5 rounded-full bg-edge-strong", className)} />;
}

const page = (slug: string, title: string, picture: ReactNode): Tile => ({
  title,
  to: { kind: "page", page: slug },
  picture,
});

const group = (slug: string, title: string, picture: ReactNode): Tile => ({
  title,
  to: { kind: "group", group: slug },
  picture,
});

function Field({ children }: { children: ReactNode }) {
  return (
    <span className="edge flex h-8 w-32 items-center justify-between gap-2 rounded-md bg-plate px-2.5 text-xs text-ink">
      {children}
    </span>
  );
}

export const SECTIONS: { title: string; tiles: Tile[] }[] = [
  {
    title: "Brand",
    tiles: [
      page("brand", "Brand", <Wordmark key="brand" size={22} />),
      page("lantern", "Lantern", <Lantern key="lantern" className="size-14" glow />),
      page("flame", "Flame", <Flame key="flame" className="h-11 w-9" />),
      page(
        "streak",
        "Streak",
        <span key="streak" className="flex items-center gap-1.5">
          <Flame className="h-6 w-5" />
          <span className="text-2xl font-medium text-ink tabular-nums">12</span>
        </span>,
      ),
    ],
  },
  {
    title: "Foundations",
    tiles: [
      page(
        "colour",
        "Colour",
        <span key="colour" className="flex -space-x-2">
          <span className="edge size-9 rounded-full bg-canvas" />
          <span className="edge size-9 rounded-full bg-plate" />
          <span className="size-9 rounded-full bg-ink" />
          <span className="size-9 rounded-full bg-amber" />
        </span>,
      ),
      page(
        "surfaces",
        "Surfaces",
        <span key="surfaces" className="relative block h-14 w-24">
          <span className="edge absolute start-0 top-0 h-10 w-18 rounded-md bg-canvas" />
          <span className="edge absolute end-0 bottom-0 h-10 w-18 rounded-md bg-plate" />
        </span>,
      ),
      page(
        "typography",
        "Typography",
        <span key="typography" className="text-4xl font-medium tracking-[-0.02em] text-ink">
          Aa
        </span>,
      ),
      page(
        "space",
        "Space and shape",
        <span key="space" className="flex items-end gap-1.5">
          <span className="size-2 rounded-xs bg-edge-strong" />
          <span className="size-3 rounded-xs bg-edge-strong" />
          <span className="size-5 rounded-sm bg-edge-strong" />
          <span className="size-8 rounded-md bg-edge-strong" />
        </span>,
      ),
      page(
        "layout",
        "Layout",
        <span key="layout" className="edge flex h-14 w-24 overflow-hidden rounded-md bg-plate">
          <span className="w-6 bg-rail" />
          <span className="grid flex-1 content-start gap-1.5 p-2">
            {line("w-3/4")}
            {line("w-full")}
            {line("w-1/2")}
          </span>
        </span>,
      ),
      page(
        "motion",
        "Motion",
        <svg key="motion" viewBox="0 0 96 48" fill="none" className="h-12 w-24">
          <path
            d="M2 46C34 46 40 4 92 4"
            strokeWidth="2"
            strokeLinecap="round"
            className="stroke-edge-strong"
          />
          <circle cx="90" cy="4" r="4" className="fill-amber" />
        </svg>,
      ),
      page(
        "voice",
        "Voice",
        <span
          key="voice"
          className="edge rounded-lg rounded-es-xs bg-plate px-3 py-1.5 text-xs text-ink"
        >
          Review 11 due
        </span>,
      ),
    ],
  },
  {
    title: "Components",
    tiles: [
      group(
        "actions",
        "Actions",
        <span
          key="actions"
          className="flex h-8 items-center rounded-md bg-amber px-3 text-xs font-medium text-amber-ink"
        >
          Review
        </span>,
      ),
      group(
        "forms",
        "Forms",
        <span key="forms" className="grid gap-1.5">
          {line("w-10")}
          <Field>
            <span className="h-4 w-px bg-ink" />
          </Field>
        </span>,
      ),
      group(
        "select",
        "Select",
        <Field key="select">
          Italian
          <ChevronDown aria-hidden="true" className="size-3.5 text-ink-muted" />
        </Field>,
      ),
      group(
        "combobox",
        "Combobox",
        <Field key="combobox">
          <span className="flex items-center gap-1.5">
            <Search aria-hidden="true" className="size-3.5 text-ink-muted" />
            Ital
          </span>
        </Field>,
      ),
      group(
        "labels",
        "Labels",
        <span key="labels" className="flex gap-1.5">
          <span className="rounded-full bg-plate px-2.5 py-1 text-xs text-ink">New</span>
          <span className="rounded-full bg-amber-tint px-2.5 py-1 text-xs text-amber-tint-ink">
            11 due
          </span>
        </span>,
      ),
      group(
        "feedback",
        "Feedback",
        <span
          key="feedback"
          className="flex items-center gap-3 rounded-md bg-ink px-3 py-2 text-xs text-canvas"
        >
          Archived
          <span className="font-medium">Undo</span>
        </span>,
      ),
      group(
        "empty-states",
        "Empty states",
        <span
          key="empty"
          className="grid h-14 w-24 place-items-center rounded-md border border-dashed border-edge-strong"
        >
          <Plus aria-hidden="true" className="size-4 text-ink-muted" />
        </span>,
      ),
      group(
        "menu",
        "Menu",
        <span key="menu" className="edge grid w-24 gap-0.5 rounded-md bg-plate p-1">
          <span className="rounded-xs bg-plate-hover px-1.5 py-1.5">{line("w-3/4")}</span>
          <span className="px-1.5 py-1.5">{line("w-1/2")}</span>
          <span className="px-1.5 py-1.5">{line("w-2/3")}</span>
        </span>,
      ),
      group(
        "overlays",
        "Overlays",
        <span key="overlays" className="grid h-16 w-26 place-items-center rounded-md bg-scrim">
          <span className="grid w-16 gap-1.5 rounded-sm bg-plate p-2">
            {line("w-3/4")}
            {line("w-full")}
          </span>
        </span>,
      ),
      group(
        "lists",
        "Lists",
        <span key="lists" className="edge grid w-26 rounded-md bg-plate">
          {["w-3/4", "w-1/2", "w-2/3"].map((width) => (
            <span
              key={width}
              className="flex items-center gap-2 border-b border-edge px-2 py-1.5 last:border-b-0"
            >
              <span className="size-2 shrink-0 rounded-full bg-edge-strong" />
              {line(width)}
            </span>
          ))}
        </span>,
      ),
      group(
        "table",
        "Table",
        <span key="table" className="edge grid w-26 grid-cols-3 gap-2 rounded-md bg-plate p-2">
          {[..."abcdefghi"].map((cell) => (
            <span key={cell} className="h-1 rounded-full bg-edge-strong" />
          ))}
        </span>,
      ),
      group(
        "navigation",
        "Navigation",
        <span key="navigation" className="flex gap-1">
          <span className="rounded-full bg-ink px-2.5 py-1 text-xs text-canvas">Today</span>
          <span className="rounded-full px-2.5 py-1 text-xs text-ink-muted">Decks</span>
        </span>,
      ),
      group(
        "layout",
        "Screens and places",
        <span
          key="screens"
          className="edge grid h-16 w-11 content-start gap-1.5 rounded-md bg-plate p-1.5"
        >
          {line("w-full")}
          {line("w-2/3")}
        </span>,
      ),
      group(
        "review",
        "Review",
        <span key="review" className="grid w-24 gap-1">
          <span className="edge grid h-9 place-items-center rounded-sm bg-plate text-xs text-ink">
            sbrigarsi
          </span>
          <span className="grid grid-cols-4 gap-1">
            {[0, 1, 2, 3].map((grade) => (
              <span key={grade} className="h-2.5 rounded-xs bg-edge-strong" />
            ))}
          </span>
        </span>,
      ),
      group(
        "charts",
        "Charts",
        <span key="charts" className="flex h-12 items-end gap-1">
          {["h-4", "h-7", "h-5", "h-10", "h-8", "h-12"].map((height) => (
            <span key={height} className={clsx("w-2.5 rounded-xs bg-edge-strong", height)} />
          ))}
        </span>,
      ),
    ],
  },
];

/** A way into one page: a picture of what it holds, then its name. */
export function TileLink({ tile }: { tile: Tile }) {
  return (
    <DocLink
      to={tile.to}
      className="edge grid overflow-hidden rounded-lg bg-plate transition-[background-color,box-shadow] duration-150 hoverable:hover:edge-strong hoverable:hover:veil"
    >
      <span aria-hidden="true" className="grid h-28 place-items-center bg-plate-nested">
        {tile.picture}
      </span>
      <span className="px-3.5 py-2.5 text-sm font-medium text-ink">{tile.title}</span>
    </DocLink>
  );
}
