import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { motion, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useRef } from "react";
import { SectionTitle } from "./FeatureSection";
import { EASE, usePlayback } from "./playback";

/** Each source lights its word, then its card slides out from under it, one after another. */
const STEP_MS = 650;
const BEATS = {
  mark0: 200,
  card0: 650,
  mark1: 850,
  card1: 1300,
  mark2: 1500,
  card2: 1950,
  mark3: 2150,
  card3: 2600,
};

/** The word the assistant picked, lit once the source has been read. */
function Pick({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <mark
      data-on={on}
      className="rounded-xs bg-transparent bg-[linear-gradient(var(--color-amber-soft),var(--color-amber-soft))] bg-no-repeat px-0.5 text-inherit transition-[background-size] duration-500 ease-out [background-size:0%_100%] [box-decoration-break:clone] data-[on=true]:[background-size:100%_100%] motion-reduce:transition-none"
    >
      {children}
    </mark>
  );
}

interface Source {
  id: string;
  from: MessageDescriptor;
  lang: string;
  label: MessageDescriptor;
  term: string;
  meaning: MessageDescriptor;
  render: (picked: boolean) => ReactNode;
}

const SOURCES: Source[] = [
  {
    id: "whiteboard",
    from: msg`The whiteboard`,
    lang: "es",
    label: msg`Español · phrase`,
    term: "estar de acuerdo",
    meaning: msg`To agree`,
    render: (picked) => (
      <div className="w-[88%] rotate-[-2deg] rounded-md bg-plate px-4 py-3.5 edge">
        <ul lang="es" className="notes-hand text-xl leading-[1.2] text-text">
          <li>ser → quién</li>
          <li>estar → cómo</li>
          <li>
            <Pick on={picked}>estar de acuerdo</Pick>
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "chat",
    from: msg`Your tutor’s message`,
    lang: "fr",
    label: msg`Français · phrase`,
    term: "ça me manque",
    meaning: msg`I miss it`,
    render: (picked) => (
      <div className="w-[92%] rotate-[1.5deg] rounded-lg bg-plate p-3 edge">
        <p className="text-2xs text-muted">Camille</p>
        <p
          lang="fr"
          className="mt-1.5 bg-plate-2 px-3 py-2 text-sm text-text"
          style={{ borderRadius: 12 }}
        >
          On dit «&nbsp;<Pick on={picked}>ça me manque</Pick>&nbsp;», pas «&nbsp;je manque
          ça&nbsp;».
        </p>
      </div>
    ),
  },
  {
    id: "transcript",
    from: msg`A lesson transcript`,
    lang: "ja",
    label: msg`日本語 · phrase`,
    term: "お疲れ様です",
    meaning: msg`Thanks for your hard work`,
    render: (picked) => (
      <div className="w-[92%] rotate-[-1.5deg] rounded-md bg-plate px-3.5 py-3 text-xs edge">
        <dl className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5">
          <dt className="text-muted tabular-nums">14:02</dt>
          <dd className="text-text">
            <span className="font-medium">Yuki</span>{" "}
            <Trans>
              When colleagues leave, you say{" "}
              <span lang="ja" className="whitespace-nowrap">
                <Pick on={picked}>お疲れ様です</Pick>
              </span>
              .
            </Trans>
          </dd>
          <dt className="text-muted tabular-nums">14:02</dt>
          <dd className="text-text-2">
            <span className="font-medium text-text">
              <Trans>You</Trans>
            </span>{" "}
            <Trans>Even to my boss?</Trans>
          </dd>
          <dt className="text-muted tabular-nums">14:03</dt>
          <dd className="text-text-2">
            <span className="font-medium text-text">Yuki</span> <Trans>Yes, to everyone.</Trans>
          </dd>
        </dl>
      </div>
    ),
  },
  {
    id: "book",
    from: msg`A book`,
    lang: "et",
    label: msg`Eesti · noun`,
    term: "igatsus",
    meaning: msg`Longing`,
    render: (picked) => (
      <div className="w-[90%] rotate-[2deg] rounded-sm bg-plate px-4 pt-3.5 pb-2 edge">
        <p lang="et" className="text-sm leading-[1.6] text-pretty text-text">
          Ta vaatas aknast välja ja tundis <Pick on={picked}>igatsust</Pick> kodu järele.
        </p>
        <p className="mt-1.5 text-center text-2xs text-muted tabular-nums">118</p>
      </div>
    ),
  },
];

/** What a learner already has after a lesson, each with the card worth keeping from it tucked under. */
export function SendAnything() {
  const { i18n } = useLingui();
  const still = useReducedMotion();
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const { at } = usePlayback(BEATS, inView, still);

  return (
    <section aria-labelledby="send-title" className="border-y border-edge py-20 @4xl:py-28">
      <div className="mx-auto max-w-[1120px] px-5 @2xl:px-10">
        <div id="send-title">
          <SectionTitle>
            <Trans>Send it anything.</Trans>
          </SectionTitle>
        </div>
        <p className="mt-5 max-w-[52ch] text-md text-pretty text-text-2">
          <Trans>
            A photo of the board, your tutor’s message, a lesson transcript, the book on your
            nightstand. Your assistant picks out what’s worth keeping and adds it to Lymi.
          </Trans>
        </p>
      </div>

      {/* A row on wide screens; on a phone it scrolls sideways with the next source peeking in. */}
      <ul
        ref={ref}
        className="mx-auto mt-14 flex max-w-[1120px] snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 @2xl:scroll-px-10 [scrollbar-width:none] @2xl:px-10 @4xl:grid @4xl:grid-cols-4 @4xl:gap-6 @4xl:overflow-visible"
      >
        {SOURCES.map((source, i) => {
          const picked = at(`mark${i}` as keyof typeof BEATS);
          const carded = at(`card${i}` as keyof typeof BEATS);
          return (
            <li
              key={source.id}
              className="flex w-[74%] max-w-[280px] shrink-0 snap-start flex-col @xl:w-[46%] @4xl:w-auto @4xl:max-w-none"
            >
              <p className="text-sm text-muted">{i18n._(source.from)}</p>
              <div className="mt-3 grid h-[184px] place-items-center rounded-xl bg-plate-2 pb-5">
                {source.render(picked)}
              </div>
              <motion.div
                className={clsx(
                  "relative mx-3 -mt-5 rounded-xl bg-plate px-4 pt-3 pb-3.5 edge",
                  !carded && "pointer-events-none",
                )}
                initial={false}
                animate={
                  carded
                    ? { opacity: 1, y: 0, filter: "blur(0px)" }
                    : { opacity: 0, y: -18, filter: "blur(6px)" }
                }
                transition={{ duration: still ? 0 : STEP_MS / 1000, ease: EASE }}
              >
                <p className="text-xs tracking-[0.06em] text-muted uppercase">
                  {i18n._(source.label)}
                </p>
                <p
                  lang={source.lang}
                  className="mt-1 truncate text-xl font-medium tracking-[-0.025em] text-text"
                >
                  {source.term}
                </p>
                <p className="mt-0.5 truncate text-sm text-text-2">{i18n._(source.meaning)}</p>
              </motion.div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
