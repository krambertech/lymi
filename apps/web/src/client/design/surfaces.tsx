import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Button } from "../components/button";
import { DeckTray } from "../components/deck-tray";
import { Lantern } from "../components/lantern";
import { Progress } from "../components/progress";
import { RunStrip } from "../components/run-strip";
import { Segmented } from "../components/segmented";
import { SevenLights } from "../components/seven-lights";
import { Rule, Rules } from "./do-dont";
import { Doc, Pair, Sub } from "./frame";

const WEEK = [12, 0, 30, 50, 44, 51, 31];
const MONTH = "000000001111101110111110111110"
  .split("")
  .map((c, i) => ({ date: String(i), lit: c === "1" }));

/** A name under a specimen, in the room's own muted ink. */
function Caption({ children }: { children: ReactNode }) {
  return <span className="text-xs text-ink-muted">{children}</span>;
}

function Labelled({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-2">
      {children}
      <Caption>{label}</Caption>
    </div>
  );
}

export function Surfaces() {
  return (
    <Doc
      title="Surfaces"
      lede="By day nothing casts a shadow: depth is tone and one hairline. At night plates sit a little off the room on a soft shadow. Texture goes only where something is lit or holds a level."
    >
      <Sub
        title="Elevation"
        note="Every level comes from a utility, never a hand-written shadow. Compare the rooms: by day the plate is white with a hairline; at night it lifts off the room."
      >
        <Pair>
          {() => (
            <div className="grid grid-cols-2 gap-4 @xl:grid-cols-3">
              <Labelled label="Plate · edge bg-plate">
                <div className="edge h-20 rounded-xl bg-plate" />
              </Labelled>
              <Labelled label="Well · a track, set in">
                <div className="edge grid h-20 content-center rounded-xl bg-plate px-4">
                  <Progress value={0.4} label="Progress" animate={false} />
                </div>
              </Labelled>
              <Labelled label="Field · never lifts">
                <div className="edge grid h-11 items-center rounded-md bg-plate px-3.5 text-sm text-ink-muted [--lift:0_0_#0000]">
                  Search
                </div>
              </Labelled>
              <Labelled label="Chosen · bg-plate-chosen in a track">
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
        note="Something with a fill and a hairline strengthens to edge-strong and lays veil over its own fill, so it darkens from whatever fill it has. Something with no fill at rest fills with bg-plate-hover."
      >
        <Pair>
          {() => (
            <div className="grid gap-4 @xl:grid-cols-2">
              <Labelled label="Plate · rest, then hovered">
                <div className="grid gap-2">
                  <div className="edge h-12 rounded-lg bg-plate" />
                  <div className="edge-strong veil h-12 rounded-lg bg-plate" />
                </div>
              </Labelled>
              <Labelled label="Ghost · rest, then hovered">
                <div className="grid gap-2">
                  <div className="grid h-12 items-center rounded-md px-3 text-sm text-ink-secondary">
                    Cancel
                  </div>
                  <div className="grid h-12 items-center rounded-md bg-plate-hover px-3 text-sm text-ink">
                    Cancel
                  </div>
                </div>
              </Labelled>
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="The rail's rows"
        note="The current row is the strongest row in the rail and hover always sits below it. bg-rail-chosen with edge-inset, never lifted; hover fills with bg-rail-hover. At night the current row is a flat step above the rail and hover is a faint wash."
      >
        <Pair>
          {() => (
            <div className="grid w-60 gap-0.5 rounded-xl bg-rail p-3">
              {[
                ["Today", "rest"],
                ["Library", "current"],
                ["Insights", "hovered"],
              ].map(([name, state]) => (
                <Labelled key={name} label={state}>
                  <div
                    className={clsx(
                      "flex h-10 items-center rounded-sm px-2.5 text-base",
                      state === "current" && "edge-inset bg-rail-chosen text-ink",
                      state === "hovered" && "bg-rail-hover text-ink",
                      state === "rest" && "text-ink-secondary",
                    )}
                  >
                    {name}
                  </div>
                </Labelled>
              ))}
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="Lit and set in"
        note="A track or an unlit pane is well, set into its plate. What fills it is lit: light along its top and, at night, the flame's faint glow. The primary button carries key-light. The lantern's plate on Today is lamplit, its light pooling from the lantern's side."
      >
        <Pair>
          {() => (
            <div className="grid gap-4 @3xl:grid-cols-2">
              <div className="edge lamplit grid gap-4 rounded-xl bg-plate p-5">
                <div className="flex items-center gap-4">
                  <Lantern className="-my-3 -ms-3 size-20" progress={0.6} flicker glow />
                  <span className="grid gap-1">
                    <span className="text-4xl font-medium leading-none tabular-nums">9</span>
                    <span className="text-md text-ink-secondary">cards due today</span>
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
        note="On Explore a published deck's card sits in a deck tray: one of eight hues chosen from the slug, never amber, because a deck tray is not a thing to press. It is the one surface that carries a hue."
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
      <Sub title="Do and don’t" note="surfaces.md says which background each thing gets.">
        <Rules>
          <Rule kind="do" title="Put related rows in one panel.">
            <div className="edge w-full max-w-72 divide-y divide-edge rounded-lg bg-plate">
              {["Daily goal", "Reminders", "Theme"].map((r) => (
                <div key={r} className="px-4 py-3 text-base">
                  {r}
                </div>
              ))}
            </div>
          </Rule>
          <Rule
            kind="dont"
            title="Put panels inside a panel."
            note="Group them with a heading and space instead."
          >
            <div className="edge grid w-full max-w-72 gap-2 rounded-xl bg-plate p-3">
              {["Daily goal", "Reminders", "Theme"].map((r) => (
                <div key={r} className="edge rounded-lg bg-plate px-4 py-3 text-base">
                  {r}
                </div>
              ))}
            </div>
          </Rule>
          <Rule kind="do" title="Use the edge utility.">
            <div className="edge grid h-24 w-full max-w-60 place-items-center rounded-xl bg-plate text-base">
              Italian with Giulia
            </div>
          </Rule>
          <Rule
            kind="dont"
            title="Write your own drop shadow."
            note="It looks heavy by day and muddy at night. edge is right in both themes."
          >
            <div
              className="grid h-24 w-full max-w-60 place-items-center rounded-xl bg-plate text-base"
              style={{ boxShadow: "0 14px 32px var(--scrim)" }}
            >
              Italian with Giulia
            </div>
          </Rule>
          <Rule kind="do" title="Make inner corners smaller than outer ones.">
            <div className="edge rounded-xl bg-plate p-2">
              <div className="h-14 w-44 rounded-md bg-plate-nested" />
            </div>
          </Rule>
          <Rule kind="dont" title="Use the same corner size inside and out.">
            <div className="edge rounded-xl bg-plate p-2">
              <div className="h-14 w-44 rounded-xl bg-plate-nested" />
            </div>
          </Rule>
        </Rules>
      </Sub>
    </Doc>
  );
}
