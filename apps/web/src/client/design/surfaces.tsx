import { clsx } from "clsx";
import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Button, IconButton } from "../components/button";
import { DeckCard } from "../components/deck-card";
import { DeckTray } from "../components/deck-tray";
import { DueCount } from "../components/due-count";
import { Lantern } from "../components/lantern";
import { Progress } from "../components/progress";
import { RunStrip } from "../components/run-strip";
import { Segmented } from "../components/segmented";
import { SevenLights } from "../components/seven-lights";
import { Doc, Pair, Sub } from "./frame";

const WEEK = [12, 0, 30, 50, 44, 51, 31];
const MONTH = "000000001111101110111110111110"
  .split("")
  .map((c, i) => ({ date: String(i), lit: c === "1" }));

/** A name under a specimen, in the room's own muted ink. */
function Caption({ children }: { children: ReactNode }) {
  return <span className="text-xs text-muted">{children}</span>;
}

function Labelled({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-2">
      {children}
      <Caption>{label}</Caption>
    </div>
  );
}

/** A series as it sits in Library: the reference tray. */
function SeriesTray({ over, empty }: { over?: boolean; empty?: boolean }) {
  return (
    <section className="tray grid gap-2 rounded-xl p-2">
      <div className="flex min-h-12 items-center gap-2 ps-3 pe-1 pt-1">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="truncate text-lg font-medium tracking-[-0.01em]">Italiano A2</h3>
          <p className="truncate text-sm text-muted tabular-nums">
            {empty ? "0 decks · 0 cards" : "2 decks · 30 cards"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!empty && (
            <Button size="sm">
              Review
              <DueCount className="-me-1.5">30</DueCount>
            </Button>
          )}
          <IconButton label="Options for Italiano A2" size="sm">
            <MoreHorizontal />
          </IconButton>
        </div>
      </div>
      <ul
        className={clsx(
          "grid gap-2 rounded-md transition-[box-shadow]",
          over && "shadow-[0_0_0_2px_var(--ring)]",
        )}
      >
        {empty ? (
          <li className="flex min-h-[72px] items-center rounded-md border border-dashed border-edge-2 px-4 py-3 text-sm text-text-2">
            Drag decks here to add them to this series.
          </li>
        ) : (
          <>
            <li className="flex min-w-0">
              <DeckCard tile id="a" name="Lezione 12" language="it" due={18} total={18} />
            </li>
            <li className="flex min-w-0">
              <DeckCard tile id="b" name="Verbi" language="it" due={12} total={12} />
            </li>
          </>
        )}
      </ul>
    </section>
  );
}

const NOT_A_TRAY: [string, string][] = [
  ["A screen's main list", "Library's loose decks: the page is already the set."],
  ["A single control or setting", "Language, theme, a switch: nothing in Settings sits in a tray."],
  [
    "A group with a heading above it",
    "The heading already groups it; a tray would be a second, untitled box.",
  ],
  [
    "A lone tray among plates",
    "One tray in Insights' grid of figures reads as a different kind of thing.",
  ],
  ["Anything on the review screen", "The card and the grades stay plain and fast."],
  ["Inside another tray, or a plate", "A tray holds tiles; it never nests."],
];

export function Surfaces() {
  return (
    <Doc
      title="Surfaces"
      lede="By day nothing casts a shadow: depth is tone and one hairline. At night the lamp lights the room from above, so plates catch it on their top edge and lift a little. Texture goes only where something is lit or holds a level, and a tray only around a set the learner reads together."
    >
      <Sub
        title="Elevation"
        note="Every level comes from a utility, never a hand-written shadow. Compare the rooms: by day the plate and the tile are the same white; at night the plate lifts, the tray gets a rim and its tile sits a step lighter."
      >
        <Pair>
          {() => (
            <div className="grid grid-cols-2 gap-4 @xl:grid-cols-3">
              <Labelled label="Plate · edge bg-plate">
                <div className="edge h-20 rounded-xl bg-plate" />
              </Labelled>
              <Labelled label="Tray · tray, with a tile">
                <div className="tray grid h-20 rounded-xl p-2">
                  <div className="edge tile rounded-md" />
                </div>
              </Labelled>
              <Labelled label="Well · a track, set in">
                <div className="edge grid h-20 content-center rounded-xl bg-plate px-4">
                  <Progress value={0.4} label="Progress" animate={false} />
                </div>
              </Labelled>
              <Labelled label="Field · never lifts">
                <div className="edge grid h-11 items-center rounded-md bg-plate px-3.5 text-sm text-muted [--lift:0_0_#0000]">
                  Search
                </div>
              </Labelled>
              <Labelled label="Chosen · bg-chosen in a track">
                <Segmented
                  size="sm"
                  label="Theme"
                  value="system"
                  onValueChange={() => {}}
                  options={[
                    { value: "system", label: "System" },
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                  ]}
                />
              </Labelled>
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="Hover"
        note="Something with a fill and a hairline strengthens to edge-2 and lays veil over its own fill, so a plate on the room and a tile in a tray answer alike. Something with no fill at rest fills with bg-hover. Never bg-hover on a tile: by day it is the tray's own tone."
      >
        <Pair>
          {() => (
            <div className="grid gap-4 @xl:grid-cols-3">
              <Labelled label="Plate · rest, then hovered">
                <div className="grid gap-2">
                  <div className="edge h-12 rounded-lg bg-plate" />
                  <div className="edge-2 veil h-12 rounded-lg bg-plate" />
                </div>
              </Labelled>
              <Labelled label="Tile in a tray · rest, then hovered">
                <div className="tray grid gap-2 rounded-xl p-2">
                  <div className="edge tile h-12 rounded-md" />
                  <div className="edge-2 tile veil h-12 rounded-md" />
                </div>
              </Labelled>
              <Labelled label="Ghost · rest, then hovered">
                <div className="grid gap-2">
                  <div className="grid h-12 items-center rounded-md px-3 text-sm text-text-2">
                    Cancel
                  </div>
                  <div className="grid h-12 items-center rounded-md bg-hover px-3 text-sm text-text">
                    Cancel
                  </div>
                </div>
              </Labelled>
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="Trays"
        note="A tray holds a set read together: its title inside, its items tiles. tray grid gap-2 rounded-xl p-2, tiles edge tile rounded-md. Actions for the set sit on the title's end at 32 px, on one line; a long title truncates. A set of one is still a set."
      >
        <Pair>
          {() => (
            <div className="grid gap-4">
              <SeriesTray />
              <div className="grid gap-4 @xl:grid-cols-2">
                <Labelled label="Dragging a deck over it: a ring, not a fill">
                  <SeriesTray over />
                </Labelled>
                <Labelled label="Empty: a dashed placeholder where tiles go">
                  <SeriesTray empty />
                </Labelled>
              </div>
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="Where a tray goes, and where it does not"
        note="Today's rounds and decks to review; the streak's goal and figures; each series and the archived decks in Library; each kind on Archived; each day on Activity."
      >
        <ul className="grid gap-2 @xl:grid-cols-2">
          {NOT_A_TRAY.map(([title, why]) => (
            <li key={title} className="edge grid gap-0.5 rounded-lg bg-plate px-4 py-3">
              <span className="text-md font-medium">Never: {title}</span>
              <span className="text-sm text-muted">{why}</span>
            </li>
          ))}
        </ul>
      </Sub>

      <Sub
        title="Lit and set in"
        note="A track or an unlit pane is well, set into its plate. What fills it is lit: light along its top and, at night, the flame's faint glow. The primary button carries key-light. The lantern's plate on Today is lamplit, its light pooling from the lantern's side with a fine grain."
      >
        <Pair>
          {() => (
            <div className="grid gap-4 @3xl:grid-cols-2">
              <div className="edge lamplit grid gap-4 rounded-xl bg-plate p-5">
                <div className="flex items-center gap-4">
                  <Lantern className="-my-3 -ms-3 size-20" progress={0.6} flicker glow />
                  <span className="grid gap-1">
                    <span className="text-4xl font-medium leading-none tabular-nums">9</span>
                    <span className="text-md text-text-2">cards due today</span>
                  </span>
                </div>
                <Button variant="primary" size="lg" className="w-full">
                  Review
                </Button>
              </div>
              <div className="edge grid content-center gap-5 rounded-xl bg-plate p-5">
                <Labelled label="Seven lights">
                  <SevenLights days={WEEK} size="lg" />
                </Labelled>
                <Labelled label="Thirty days">
                  <RunStrip days={MONTH} />
                </Labelled>
                <Labelled label="Review progress">
                  <Progress value={0.33} label="3 of 9" animate={false} />
                </Labelled>
              </div>
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="The deck tray"
        note="Not a tray. On Explore a published deck's card sits in a deck tray: one of eight hues chosen from the slug, never amber, because a deck tray is not a thing to press. It is the one surface that carries a hue."
      >
        <Pair>
          {() => (
            <div className="flex flex-wrap gap-3">
              {["everyday-estonian", "italian-verbs", "kitchen-finnish"].map((slug) => (
                <DeckTray
                  key={slug}
                  slug={slug}
                  cardCount={3}
                  card={null}
                  language={null}
                  meaningLanguage="en"
                  className="h-24 w-32 rounded-xl"
                />
              ))}
            </div>
          )}
        </Pair>
      </Sub>
    </Doc>
  );
}
