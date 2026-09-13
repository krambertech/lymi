import { Section, Specimen, Sub } from "./Frame";

const SCALE: {
  name: string;
  cls: string;
  size: string;
  weight: string;
  use: string;
  sample: string;
}[] = [
  {
    name: "5xl",
    cls: "text-5xl font-medium tracking-[-0.03em]",
    size: "46 / 1.0",
    weight: "500",
    use: "The term on the card, desktop.",
    sample: "sbrigarsi",
  },
  {
    name: "4xl",
    cls: "text-4xl font-medium tracking-[-0.03em]",
    size: "38 / 1.05",
    weight: "500",
    use: "The term on the card, phone. The due count on Today, at every width.",
    sample: "la ringhiera",
  },
  {
    name: "3xl",
    cls: "text-3xl font-medium",
    size: "30 / 1.15",
    weight: "500",
    use: "The produce-side answer, and the end of a session.",
    sample: "That\u2019s the lot",
  },
  {
    name: "2xl",
    cls: "text-2xl font-medium",
    size: "24 / 1.2",
    weight: "500",
    use: "Page titles.",
    sample: "Lesson 14",
  },
  {
    name: "xl",
    cls: "text-xl",
    size: "20 / 1.3",
    weight: "400",
    use: "The meaning after reveal.",
    sample: "to hurry up, to get a move on",
  },
  {
    name: "lg",
    cls: "text-lg",
    size: "17 / 1.4",
    weight: "400",
    use: "Large input text.",
    sample: "magari",
  },
  {
    name: "md",
    cls: "text-md",
    size: "15.5 / 1.5",
    weight: "400–500",
    use: "Examples, deck names, lede copy.",
    sample: "Non c’è fretta, ma sbrigati se vuoi prendere il treno.",
  },
  {
    name: "base",
    cls: "text-base",
    size: "14.5 / 1.5",
    weight: "400–500",
    use: "Body, buttons, nav, table cells.",
    sample: "Lesson 14 and Portuguese. Review, then add a card.",
  },
  {
    name: "sm",
    cls: "text-sm",
    size: "13 / 1.45",
    weight: "400–500",
    use: "Field labels, hints, small buttons.",
    sample: "Leave it empty and AI can fill it in later.",
  },
  {
    name: "xs",
    cls: "text-xs",
    size: "12 / 1.4",
    weight: "500",
    use: "Chips, table headers, section eyebrows.",
    sample: "RECOGNISE · IT",
  },
  {
    name: "2xs",
    cls: "text-2xs",
    size: "11 / 1.3",
    weight: "500–600",
    use: "Kbd, compact counts, day letters.",
    sample: "3 · F",
  },
];

export function Type() {
  return (
    <Section
      id="type"
      title="Type"
      lede="One family: Onest, variable, 400 to 600, with Latin extended and Cyrillic so Italian, Portuguese and Ukrainian cards all set in the same voice. The term on the card is the largest thing on any screen and it is set at 500, not bold. Everything else is 400 or 500. 600 is reserved for the wordmark, counts and kbd."
    >
      <Sub
        title="Scale"
        note="Fixed pixel steps, ratio about 1.17. Headings tighten to −0.02em; the term on the card to −0.03em. Body never tracks."
      >
        <div className="edge overflow-hidden rounded-lg bg-plate">
          {SCALE.map((s) => (
            <div
              key={s.name}
              className="grid items-baseline gap-2 border-b border-edge px-5 py-4 last:border-b-0 @3xl:grid-cols-[72px_150px_1fr_220px]"
            >
              <code className="text-xs text-muted">{s.name}</code>
              <span className="text-xs text-muted tabular-nums">
                {s.size} · {s.weight}
              </span>
              <span
                className={s.cls}
                lang={s.name === "5xl" || s.name === "4xl" || s.name === "md" ? "it" : undefined}
              >
                {s.sample}
              </span>
              <span className="text-xs text-muted">{s.use}</span>
            </div>
          ))}
        </div>
      </Sub>

      <Sub
        title="Scripts"
        note="The same face across every language a learner might collect. Set lang on the term so screen readers switch voice."
      >
        <Specimen layout="grid" className="@3xl:grid-cols-2">
          {[
            ["it", "sbrigarsi", "to hurry up, to get a move on"],
            ["pt-BR", "saudade", "a longing for something absent"],
            ["uk", "кав’ярня", "a coffee house"],
            ["fi", "hämärä", "dusk; the soft light before night"],
            ["de", "Fernweh", "an ache for far-off places"],
            ["pl", "źdźbło", "a blade of grass"],
          ].map(([lang, word, meaning]) => (
            <div key={word} className="grid gap-1">
              <span className="text-3xl font-medium tracking-[-0.03em]" lang={lang}>
                {word}
              </span>
              <span className="text-base text-text-2">{meaning}</span>
              <span className="text-2xs uppercase tracking-[0.06em] text-muted">{lang}</span>
            </div>
          ))}
        </Specimen>
      </Sub>

      <Sub
        title="Numbers and details"
        note="Anything that changes gets tabular figures so it does not jiggle. Real quotes and the ellipsis character in copy. Uppercase only at xs, and then tracked +0.06em."
      >
        <Specimen className="gap-8">
          <div className="grid gap-1">
            <span className="text-xs text-muted">tabular-nums</span>
            <span className="text-2xl tabular-nums">1 / 11 · 6 min · 4 d · 12 d</span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-muted">quotes</span>
            <span className="text-md">Archived “sbrigarsi”. It’s in there somewhere…</span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-muted">eyebrow</span>
            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
              Appearance
            </span>
          </div>
        </Specimen>
      </Sub>
    </Section>
  );
}
