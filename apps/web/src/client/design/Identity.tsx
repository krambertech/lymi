import { Lantern } from "../components/Lantern";
import { AppTile, Lockup, Wordmark } from "../components/Logo";
import { Pair, Section, Specimen, Sub } from "./Frame";

export function Identity() {
  return (
    <Section
      id="identity"
      title="Identity"
      lede="Lymi is cut from lyhty, the Finnish word for lantern. The symbol is a storm lantern, the kind you carry: lit while you review, brighter when you finish, dark when nothing is due. Three words for the whole thing: warm, calm, quick."
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
                <figcaption className="text-xs text-muted">
                  Lit, glowing. Something is due.
                </figcaption>
              </figure>
              <figure className="grid justify-items-center gap-3 text-center">
                <Lantern className="size-24 @2xl:size-28" variant="unlit" />
                <figcaption className="text-xs text-muted">Unlit. Nothing due.</figcaption>
              </figure>
              <figure className="grid justify-items-center gap-3 text-center">
                <Lantern className="size-24 @2xl:size-28" litUp />
                <figcaption className="text-xs text-muted">Lit up. Session done.</figcaption>
              </figure>
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="Sizes"
        note="Below 28 px the rods, the bail\u2019s pivots and the foot drop away and the glass goes solid amber. Same silhouette, fewer parts — not a different mark. The full lantern starts at 28 px."
      >
        <Pair>
          {() => (
            <div className="flex flex-wrap items-end gap-6 py-2">
              {[12, 16, 20, 24].map((s) => (
                <figure key={s} className="grid justify-items-center gap-2">
                  <Lantern variant="glyph" style={{ width: s, height: s }} />
                  <figcaption className="text-2xs text-muted tabular-nums">{s}</figcaption>
                </figure>
              ))}
              {[28, 40, 56, 80].map((s) => (
                <figure key={s} className="grid justify-items-center gap-2">
                  <Lantern style={{ width: s, height: s }} glow={s >= 40} />
                  <figcaption className="text-2xs text-muted tabular-nums">{s}</figcaption>
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
        note="The tile is always the dark room: ivory lantern, lit, on the dark canvas with a warm centre behind the flame. That warmth is the one gradient in Lymi, because an icon is a picture of the lantern, not a surface. The same tile sits at the top of the sidebar. The favicon is the glyph in the current theme’s ink."
      >
        <Specimen className="justify-around py-8">
          {[
            [<AppTile key="a" size={120} title="Lymi app icon" />, "iOS, 180 px"],
            [<AppTile key="b" size={64} />, "64 px"],
            [<AppTile key="c" size={28} />, "Sidebar, 28 px"],
            [
              <div key="d" className="flex items-center gap-2 rounded-sm bg-plate-2 px-3 py-2">
                <Lantern variant="glyph" className="size-4" />
                <span className="text-sm">Lymi · Lesson 14</span>
              </div>,
              "Browser tab",
            ],
          ].map(([node, label]) => (
            <figure key={String(label)} className="grid justify-items-center gap-3">
              <div className="flex h-[120px] items-end">{node}</div>
              <figcaption className="text-xs text-muted">{label}</figcaption>
            </figure>
          ))}
        </Specimen>
      </Sub>

      <Sub title="Don’t">
        <ul className="grid gap-2 text-base text-text-2 @3xl:grid-cols-2">
          {[
            "Don’t put a gradient on any surface. The app icon is the one exception; the lantern is the only thing that glows.",
            "Don’t colour the metal grey. It is ink in the light room and ivory in the dark one.",
            "Don’t add a second illustration. The lantern is the one drawing; everything else is a standard control.",
            "Don’t outline, rotate or bevel the mark. Don’t put it in a circle unless the platform demands one.",
            "Don’t show the full lantern below 28 px. Use the glyph.",
            "Don’t show two flames at once. If the lantern is on the screen, the wordmark is plain.",
            "Don’t let amber appear more than twice on a screen: the flame, and the one thing to press.",
          ].map((t) => (
            <li key={t} className="edge rounded-md bg-plate px-4 py-3">
              {t}
            </li>
          ))}
        </ul>
      </Sub>
    </Section>
  );
}
