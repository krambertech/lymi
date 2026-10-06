import type { ReactNode } from "react";
import { Button } from "../components/button";
import { DeckTray } from "../components/deck-tray";
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

export function Surfaces() {
  return (
    <Doc
      title="Surfaces"
      lede="By day nothing casts a shadow: depth is tone and one hairline. At night the lamp lights the room from above, so plates catch it on their top edge and lift a little. Texture goes only where something is lit or holds a level."
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
        note="Something with a fill and a hairline strengthens to edge-2 and lays veil over its own fill, so it darkens from whatever fill it has. Something with no fill at rest fills with bg-hover."
      >
        <Pair>
          {() => (
            <div className="grid gap-4 @xl:grid-cols-2">
              <Labelled label="Plate · rest, then hovered">
                <div className="grid gap-2">
                  <div className="edge h-12 rounded-lg bg-plate" />
                  <div className="edge-2 veil h-12 rounded-lg bg-plate" />
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
    </Doc>
  );
}
