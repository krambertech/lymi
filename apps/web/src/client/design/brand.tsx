import { Lantern } from "../components/lantern";
import { AppTile, Lockup, Wordmark } from "../components/logo";
import { Rule, Rules } from "./do-dont";
import { DocLink } from "./doc-link";
import { Doc, Pair, Specimen, Sub } from "./frame";

export function Brand() {
  return (
    <Doc
      title="Brand"
      lede="Lymi is cut from lyhty, the Finnish word for lantern. The symbol is a storm lantern, the kind you carry, and its flame is the continuity of remembering: repetition keeps it alive. Three words for the whole thing: warm, calm, quick."
    >
      <Sub
        title="The lantern"
        note="Bail, hood, rods, glass, flame, fount, foot. The metal is the text colour of the room it is in: ink by day, white at night. The glass is one opaque colour, so the mark can sit on any surface without painting a hole in it. The flame is the only pure accent, and its glow is the only glow in the interface — it wraps the flame, never the metal."
      >
        <Pair>
          {() => (
            <div className="flex items-end justify-around gap-4 py-4">
              <figure className="grid justify-items-center gap-3 text-center">
                <Lantern className="size-24 @2xl:size-28" flicker glow />
                <figcaption className="text-xs text-ink-muted">
                  The brand flame. Login, the app icon, public pages.
                </figcaption>
              </figure>
            </div>
          )}
        </Pair>
        <p className="text-base text-ink-secondary">
          Inside the product the flame follows the learner’s day and streak.{" "}
          <DocLink
            to={{ kind: "page", page: "lantern" }}
            className="font-medium text-ink underline decoration-edge-strong underline-offset-4 hoverable:hover:decoration-current"
          >
            Lantern
          </DocLink>{" "}
          has every state and movement.
        </p>
      </Sub>

      <Sub
        title="Sizes"
        note="One drawing at every size. There is no simplified small cut, because the rods and the flame are exactly what keep the mark legible when it is tiny — drop them and it collapses into a mushroom by 24 px. The browser tab uses the same drawing, cropped to its own bounds so it fills the icon."
      >
        <Pair>
          {() => (
            <div className="flex flex-wrap items-end gap-6 py-2">
              {[16, 20, 24, 28, 40, 56, 80].map((s) => (
                <figure key={s} className="grid justify-items-center gap-2">
                  <Lantern style={{ width: s, height: s }} glow={s >= 40} />
                  <figcaption className="text-2xs text-ink-muted tabular-nums">{s}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="Wordmark"
        note="lymi, lowercase, Onest 600, tracked to −0.025em, drawn as paths so it renders before fonts load. The lit version replaces the dot of the i with a flame. One flame to a composition: use it only where the wordmark stands alone and the lantern is nowhere on the screen — the app store listing, a share image. Anywhere the lantern is present, the wordmark is plain."
      >
        <Pair>
          {() => (
            <div className="grid gap-8 py-2">
              <Wordmark size={56} title="lymi" />
              <Wordmark size={56} flame title="lymi, lit" />
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="Lockup"
        note="One drawing, so the two parts can never drift. The lantern is 1.38em tall, its base sits on the baseline, its cap reaches just above the l, and the gap is 0.17em. Use it at 17 px in a header and at 40 px and up on its own. The app sidebar uses the square tile and the wordmark instead. There is no stacked version."
      >
        <Pair>
          {() => (
            <div className="flex flex-col items-start gap-8 py-2">
              <Lockup size={48} />
              <Lockup size={28} glow />
              <Lockup size={17} flicker glow />
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="App icon and favicon"
        note="The tile is always the dark room: ivory lantern, lit, on the dark canvas with a warm centre behind the flame. That warmth is the one gradient in Lymi, because an icon is a picture of the lantern, not a surface. The same tile sits at the top of the sidebar. The favicon is the same drawing, cropped to its own bounds and following the browser’s theme."
      >
        <Specimen className="justify-around py-8">
          {[
            [<AppTile key="a" size={120} title="Lymi app icon" />, "iOS, 180 px"],
            [<AppTile key="b" size={64} />, "64 px"],
            [<AppTile key="c" size={28} />, "Sidebar, 28 px"],
            [
              <div key="d" className="flex items-center gap-2 rounded-sm bg-plate-nested px-3 py-2">
                <Lantern className="size-4" />
                <span className="text-sm">Lymi · Lesson 14</span>
              </div>,
              "Browser tab",
            ],
          ].map(([node, label]) => (
            <figure key={String(label)} className="grid justify-items-center gap-3">
              <div className="flex h-[120px] items-end">{node}</div>
              <figcaption className="text-xs text-ink-muted">{label}</figcaption>
            </figure>
          ))}
        </Specimen>
      </Sub>

      <Sub title="Do and don’t" note="brand.md has the full rules.">
        <Rules>
          <Rule kind="do" title="Use the plain wordmark next to the lantern.">
            <Lockup size={36} />
          </Rule>
          <Rule
            kind="dont"
            title="Show two flames at once."
            note="Use the lit wordmark only when the lantern isn’t on screen, like a share image."
          >
            <Lantern className="size-12" />
            <Wordmark size={36} flame title="lymi, lit" />
          </Rule>
          <Rule kind="do" title="Put the glow around the flame.">
            <Lantern className="size-16" glow />
          </Rule>
          <Rule
            kind="dont"
            title="Put the glow around the whole lantern."
            note="Only the flame glows."
          >
            <Lantern
              className="size-16"
              style={{ filter: "drop-shadow(0 0 14px var(--lantern-glow))" }}
            />
          </Rule>
          <Rule kind="do" title="Use the lantern as it is drawn.">
            <Lantern className="size-16" />
          </Rule>
          <Rule
            kind="dont"
            title="Outline, tilt or frame the lantern."
            note="It only tilts in the shared launch and pull-to-refresh animation."
          >
            <span className="grid size-24 rotate-12 place-items-center rounded-full bg-amber-soft ring-2 ring-edge-strong">
              <Lantern className="size-14" />
            </span>
          </Rule>
        </Rules>
      </Sub>
    </Doc>
  );
}
