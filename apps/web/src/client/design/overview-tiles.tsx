import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import {
  Archive,
  BookMarked,
  Check,
  ChevronDown,
  FolderInput,
  type LucideIcon,
  Pencil,
  Plus,
  Search,
  Star,
  Sun,
  Volume2,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../components/button";
import { SourceChip, StateChip } from "../components/chip";
import { DayGrid } from "../components/day-grid";
import { DueCount } from "../components/due-count";
import { EmptySection } from "../components/empty-state";
import { Flame } from "../components/flame";
import { GRADES, GradeMark } from "../components/grade";
import { Lantern } from "../components/lantern";
import { AppTile, Wordmark } from "../components/logo";
import { StaticNavProvider } from "../components/nav-link";
import { PillNav } from "../components/pill-nav";
import { SevenLights } from "../components/seven-lights";
import { Input } from "../components/ui/input";
import { DocLink } from "./doc-link";
import { history, insights } from "./mock";
import type { DocRef } from "./registry";

interface Tile {
  title: string;
  to: DocRef;
  picture: ReactNode;
  span?: "wide" | "hero" | undefined;
  /** A picture on its own night ground, whichever theme the page is in. */
  night?: boolean | undefined;
}

type TileOptions = Pick<Tile, "span" | "night">;

const page = (slug: string, title: string, picture: ReactNode, options?: TileOptions): Tile => ({
  title,
  to: { kind: "page", page: slug },
  picture,
  ...options,
});

const group = (slug: string, title: string, picture: ReactNode, options?: TileOptions): Tile => ({
  title,
  to: { kind: "group", group: slug },
  picture,
  ...options,
});

/** A picture's object comes up out of the crop while its tile is under the pointer. */
const rise =
  "transition-transform duration-300 ease-out motion-safe:hoverable:group-hover/tile:-translate-y-1.5";

/** A fragment that dissolves into the tile instead of being cut by its foot. */
const fadeFoot = "[mask-image:linear-gradient(to_bottom,black_58%,transparent)]";

function bar(className: string) {
  return <span className={clsx("block h-1.5 rounded-full bg-edge-strong", className)} />;
}

function Control({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "edge flex h-10 min-w-0 items-center justify-between gap-2 overflow-hidden rounded-md bg-plate px-3 text-base text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}

function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon aria-hidden="true" className="text-ink-muted" />;
}

function Row({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={clsx(
        "flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-sm whitespace-nowrap text-ink [&_svg]:size-4",
        active && "bg-plate-hover",
      )}
    >
      {children}
    </span>
  );
}

function PhoneFragment() {
  return (
    <span className="absolute inset-x-0 top-5 -bottom-4 flex justify-center">
      <span
        className={clsx(
          "edge grid w-34 content-start gap-2.5 rounded-t-2xl bg-canvas p-3 shadow-sm",
          rise,
        )}
      >
        <span className="text-lg font-medium text-ink">Today</span>
        <span className="edge grid gap-2 rounded-md bg-plate p-2.5">
          <span className="text-xs text-ink-muted">Italian</span>
          <span className="flex h-7 items-center justify-center rounded-sm bg-amber text-xs font-medium text-amber-ink">
            Start
          </span>
        </span>
        {bar("w-2/3")}
        {bar("w-1/2")}
      </span>
    </span>
  );
}

/** The grades under the Review picture; a message's source text is gone from a production build. */
function GradeRow() {
  const { t } = useLingui();
  return (
    <span className="hidden grid-cols-4 gap-1.5 @xs/pic:grid">
      {GRADES.map((grade) => (
        <span
          key={grade.rating}
          className="edge grid justify-items-center gap-1 rounded-md bg-plate py-2 text-xs text-ink-secondary"
        >
          <GradeMark rating={grade.rating} size="sm" />
          {t(grade.label)}
        </span>
      ))}
    </span>
  );
}

/** The day grid is a year wide, so the tile shows its latest months, as Insights opens on. */
function ChartPicture() {
  const { activity } = insights;
  return (
    <span className="absolute inset-x-5 -top-3 block">
      <span className="block w-[200%] origin-top-left scale-50 rtl:origin-top-right">
        <DayGrid
          days={activity.days}
          today={activity.today}
          firstDay={activity.firstDay ?? activity.today}
          goal={activity.goal}
        />
      </span>
    </span>
  );
}

export const SECTIONS: { title: string; tiles: Tile[] }[] = [
  {
    title: "Brand",
    tiles: [
      page(
        "lantern",
        "Lantern",
        <span key="lantern" className="absolute inset-0 grid place-items-center">
          <Lantern className="size-[min(66cqh,66cqw)]" glow flicker />
        </span>,
        { span: "hero", night: true },
      ),
      page(
        "brand",
        "Brand",
        <span key="brand" className="absolute inset-0 grid place-items-center">
          <span className={rise}>
            <AppTile size={72} />
          </span>
        </span>,
      ),
      page(
        "flame",
        "Flame",
        <span key="flame" className="absolute inset-0 grid place-items-center">
          <Flame className="h-20 w-16" flicker />
        </span>,
      ),
      page(
        "streak",
        "Streak",
        <span key="streak" className="absolute inset-0 flex items-center justify-center gap-5 px-5">
          <span className="flex items-center gap-1.5">
            <Flame className="h-8 w-7" />
            <span className="text-4xl font-medium tracking-[-0.02em] text-ink tabular-nums">
              12
            </span>
          </span>
          <span className="hidden @xs/pic:block">
            <SevenLights days={history} size="lg" />
          </span>
        </span>,
        { span: "wide" },
      ),
    ],
  },
  {
    title: "Foundations",
    tiles: [
      page(
        "colour",
        "Colour",
        <span key="colour" className="absolute inset-0 flex">
          <span className="flex-[3] bg-canvas" />
          <span className="flex-[3] bg-plate" />
          <span className="flex-[2] bg-amber-tint" />
          <span className="flex-[2] bg-amber" />
          <span className="flex-[1] bg-ai-soft" />
          <span className="flex-[3] bg-ink" />
        </span>,
        { span: "wide" },
      ),
      page(
        "typography",
        "Typography",
        <span
          key="typography"
          className="absolute -bottom-[0.14em] start-4 text-[min(30cqw,4.5rem)] leading-none font-medium tracking-[-0.03em] whitespace-nowrap text-ink"
        >
          Aa Яя
        </span>,
      ),
      page(
        "space",
        "Space and shape",
        <span key="space" className="absolute inset-0">
          <span className="absolute -end-10 -bottom-10 size-44 rounded-2xl border border-edge-strong" />
          <span className="absolute -end-4 -bottom-4 size-32 rounded-xl border border-edge-strong" />
          <span className="absolute end-2 bottom-2 size-20 rounded-lg bg-plate edge" />
          <span className="absolute end-8 bottom-8 size-8 rounded-sm bg-edge-strong" />
        </span>,
      ),
      page(
        "layout",
        "Layout",
        <span
          key="layout"
          className={clsx(
            "edge absolute start-6 -end-6 top-6 -bottom-6 flex overflow-hidden rounded-lg bg-canvas shadow-sm",
            rise,
          )}
        >
          <span className="hidden w-36 shrink-0 content-start gap-0.5 border-e border-edge bg-rail p-2.5 pt-4 @xs/pic:grid">
            <span className="mb-3 px-2">
              <Wordmark size={15} />
            </span>
            <Row>
              <RowIcon icon={Sun} /> Today
            </Row>
            <Row active>
              <RowIcon icon={BookMarked} /> Library
            </Row>
          </span>
          <span className="grid flex-1 content-start gap-3 p-5">
            <span className="hidden text-xl font-medium text-ink @xs/pic:block">Library</span>
            {["w-2/5", "w-3/5", "w-1/3", "w-1/2"].map((width) => (
              <span key={width} className="edge grid gap-2.5 rounded-md bg-plate p-3.5">
                {bar(width)}
                {bar("w-1/4")}
              </span>
            ))}
          </span>
        </span>,
        { span: "hero" },
      ),
      page(
        "surfaces",
        "Surfaces",
        <span key="surfaces" className="absolute inset-0">
          <span className="edge absolute start-4 top-4 h-30 w-36 rounded-lg bg-canvas" />
          <span
            className={clsx(
              "edge absolute start-11 top-11 h-30 w-36 rounded-lg bg-plate shadow-sm",
              rise,
            )}
          />
        </span>,
      ),
      page(
        "motion",
        "Motion",
        <span key="motion" className="absolute inset-0 grid place-items-center">
          <svg viewBox="0 0 150 90" fill="none" className="w-40 overflow-visible">
            <path
              d="M4 86C62 86 70 6 146 6"
              strokeWidth="2"
              strokeLinecap="round"
              className="stroke-edge-strong"
            />
            <circle
              r="6"
              className="fill-amber transition-[offset-distance] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [offset-path:path('M4_86C62_86_70_6_146_6')] [offset-distance:18%] motion-safe:hoverable:group-hover/tile:[offset-distance:100%]"
            />
          </svg>
        </span>,
      ),
      page(
        "voice",
        "Voice",
        <span
          key="voice"
          className="absolute inset-0 flex items-center px-5 text-2xl leading-tight font-medium tracking-[-0.01em] text-balance text-ink"
        >
          Card, not flashcard. Archive, not delete.
        </span>,
        { span: "wide" },
      ),
    ],
  },
  {
    title: "Components",
    tiles: [
      group(
        "review",
        "Review",
        <span key="review" className="absolute inset-0 grid place-items-center p-4 @xs/pic:p-6">
          <span className="grid w-full max-w-84 gap-3">
            <span
              className={clsx(
                "edge grid gap-2 rounded-xl bg-plate px-4 py-5 shadow-sm @xs/pic:px-6 @xs/pic:pb-7",
                rise,
              )}
            >
              <span className="hidden items-center justify-between @xs/pic:flex">
                <StateChip state={2} />
                <Volume2 aria-hidden="true" className="size-4 text-ink-muted" />
              </span>
              <span className="text-center text-3xl font-medium @xs/pic:mt-3 @xs/pic:text-4xl tracking-[-0.02em] text-ink">
                sbrigarsi
              </span>
              <span className="text-center text-md text-ink-secondary">to hurry up</span>
            </span>
            <GradeRow />
          </span>
        </span>,
        { span: "hero" },
      ),
      group(
        "actions",
        "Actions",
        <span key="actions" className="absolute inset-0 grid place-items-center">
          <span className="transition-transform duration-150 ease-out motion-safe:hoverable:group-hover/tile:scale-[0.97]">
            <Button variant="primary" size="lg">
              Review
            </Button>
          </span>
        </span>,
      ),
      group(
        "forms",
        "Forms",
        <span key="forms" className={clsx("absolute inset-x-4 top-4 grid gap-1.5", fadeFoot)}>
          <span className="text-sm font-medium text-ink">Meaning</span>
          <Input value="patience" readOnly />
          <span className="mt-2 text-sm font-medium text-ink">Example</span>
          <Input placeholder="Optional" readOnly />
        </span>,
      ),
      group(
        "select",
        "Select",
        <span
          key="select"
          className={clsx("absolute inset-x-4 top-5 grid grid-cols-1 gap-1", fadeFoot)}
        >
          <Control>
            Portuguese
            <ChevronDown aria-hidden="true" className="size-4 text-ink-muted" />
          </Control>
          <span className="edge grid min-w-0 grid-cols-1 overflow-hidden rounded-md bg-plate p-1 shadow-sm">
            <Row active>
              Portuguese
              <Check aria-hidden="true" className="ms-auto text-ink" />
            </Row>
            <Row>Polish</Row>
            <Row>Punjabi</Row>
          </span>
        </span>,
      ),
      group(
        "combobox",
        "Combobox",
        <span
          key="combobox"
          className={clsx("absolute inset-x-4 top-5 grid grid-cols-1 gap-1", fadeFoot)}
        >
          <Control className="justify-start">
            <Search aria-hidden="true" className="size-4 text-ink-muted" />
            <span>
              Jap
              <span className="ms-px inline-block h-5 w-px bg-ink align-middle" />
            </span>
          </Control>
          <span className="edge grid min-w-0 grid-cols-1 overflow-hidden rounded-md bg-plate p-1 shadow-sm">
            <Row active>
              <span>
                <span className="font-semibold">Jap</span>anese
              </span>
            </Row>
            <Row>
              <span>
                <span className="font-semibold">Jap</span>anese, kana
              </span>
            </Row>
          </span>
        </span>,
      ),
      group(
        "labels",
        "Labels",
        <span
          key="labels"
          className="absolute inset-0 grid content-center justify-items-center gap-2.5 p-4"
        >
          <span className="flex items-center gap-2">
            <StateChip state={0} />
            <DueCount count={11} />
          </span>
          <SourceChip source="ai" />
        </span>,
      ),
      group(
        "feedback",
        "Feedback",
        <span key="feedback" className="absolute inset-x-3 bottom-4">
          <span
            className={clsx(
              "flex items-center justify-between gap-1 rounded-md bg-ink py-2 ps-3 pe-1 text-xs text-canvas shadow-md @[10rem]/pic:gap-2 @[10rem]/pic:ps-3.5 @[10rem]/pic:pe-2 @[10rem]/pic:text-sm",
              rise,
            )}
          >
            Archived
            <span className="px-2 py-1 font-semibold text-toast-action">Undo</span>
          </span>
        </span>,
      ),
      group("charts", "Charts", <ChartPicture key="charts" />, { span: "wide" }),
      group(
        "lists",
        "Lists",
        <span
          key="lists"
          className={clsx("edge absolute inset-x-4 top-5 grid rounded-md bg-plate", fadeFoot)}
        >
          {[
            ["la pazienza", 1],
            ["il tramonto", 3],
            ["magari", 0],
          ].map(([term, state]) => (
            <span
              key={term}
              className="flex h-11 items-center justify-between gap-2 border-b border-edge px-3 text-sm whitespace-nowrap text-ink last:border-b-0"
            >
              {term}
              <span className="hidden @[12rem]/pic:inline-flex">
                <StateChip state={state as number} size="sm" />
              </span>
            </span>
          ))}
        </span>,
      ),
      group(
        "overlays",
        "Overlays",
        <span key="overlays" className="absolute inset-0 bg-scrim">
          <span className="absolute inset-0 grid gap-1 opacity-60 p-3 content-start">
            {bar("w-2/3 bg-plate/50")}
            {bar("w-1/2 bg-plate/50")}
          </span>
          <span
            className={clsx(
              "absolute inset-x-3 top-9 -bottom-3 grid content-start gap-1 rounded-t-xl bg-plate p-3.5",
              rise,
            )}
          >
            <span className="mx-auto mb-1.5 h-1 w-7 rounded-full bg-edge-strong" />
            <span className="text-sm font-medium text-ink">Add a card</span>
            <span className="text-xs text-ink-muted">Term and meaning</span>
          </span>
        </span>,
      ),
      group(
        "table",
        "Table",
        <span
          key="table"
          className={clsx(
            "edge absolute inset-x-4 top-5 grid grid-cols-[1fr_auto] rounded-md bg-plate text-sm",
            fadeFoot,
          )}
        >
          {["Deck", "Cards"].map((heading) => (
            <span key={heading} className="border-b border-edge px-2.5 py-2 text-xs text-ink-muted">
              {heading}
            </span>
          ))}
          {[
            ["Physiology", "214"],
            ["Kanji N4", "96"],
            ["Tax law", "58"],
          ].flatMap((row) =>
            row.map((cell, i) => (
              <span
                key={cell}
                className={clsx(
                  "border-b border-edge px-2.5 py-2 tabular-nums",
                  i === 0 ? "text-ink" : "text-ink-secondary",
                )}
              >
                {cell}
              </span>
            )),
          )}
        </span>,
      ),
      group(
        "empty-states",
        "Empty states",
        <span key="empty" className="absolute inset-x-4 inset-y-0 grid content-center">
          <EmptySection icon={<Plus />} title="No cards yet" />
        </span>,
      ),
      group(
        "menu",
        "Menu",
        <span key="menu" className={clsx("absolute inset-x-4 top-4", fadeFoot)}>
          <span className="edge grid min-w-0 grid-cols-1 overflow-hidden rounded-md bg-plate p-1 shadow-sm">
            <span className="relative grid">
              <span className="absolute inset-x-0 top-0 h-9 rounded-sm bg-plate-hover transition-transform duration-200 ease-out motion-safe:hoverable:group-hover/tile:translate-y-9" />
              <span className="relative">
                <Row>
                  <RowIcon icon={Pencil} /> Edit card
                </Row>
                <Row>
                  <RowIcon icon={Star} /> Mark important
                </Row>
                <Row>
                  <RowIcon icon={FolderInput} /> Move to section
                </Row>
                <Row>
                  <RowIcon icon={Archive} /> Archive
                </Row>
              </span>
            </span>
          </span>
        </span>,
      ),
      group("layout", "Screens and places", <PhoneFragment key="screens" />),
      group(
        "navigation",
        "Navigation",
        <span key="navigation" className="absolute inset-0 grid place-items-center">
          <StaticNavProvider path="/today">
            <PillNav />
          </StaticNavProvider>
        </span>,
        { span: "wide" },
      ),
    ],
  },
];

const SPANS = { wide: "col-span-2", hero: "col-span-2 row-span-2" };

/** A way into one page: a piece of what it holds, then its name. The name is the link. */
export function TileLink({ tile }: { tile: Tile }) {
  return (
    <li className={clsx("min-w-0", tile.span && SPANS[tile.span])}>
      <div className="group/tile edge relative flex h-full flex-col overflow-hidden rounded-lg bg-plate outline-offset-2 outline-ring transition-[background-color,box-shadow] duration-150 has-focus-visible:outline-2 hoverable:hover:edge-strong hoverable:hover:veil">
        <div
          inert
          data-theme={tile.night ? "dark" : undefined}
          className={clsx(
            "relative min-h-0 flex-1 overflow-hidden [container-name:pic] [container-type:size]",
            tile.night ? "bg-canvas" : "bg-plate-nested",
          )}
        >
          {tile.picture}
        </div>
        <DocLink
          to={tile.to}
          className="px-3.5 py-2.5 text-sm font-medium text-ink outline-none after:absolute after:inset-0 after:content-['']"
        >
          {tile.title}
        </DocLink>
      </div>
    </li>
  );
}
