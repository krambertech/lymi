import { useLingui } from "@lingui/react";
import { Trans, useLingui as useMacro } from "@lingui/react/macro";
import type { FlipOut, Rating } from "@lymi/core";
import { EASE_OUT } from "@lymi/design";
import { useMutation, useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { AuthFrame } from "../components/auth-frame";
import { Button } from "../components/button";
import { GRADES } from "../components/grade";
import { InlineError } from "../components/inline-error";
import { ExampleText, TermText } from "../components/term-text";
import { ApiError, api } from "../lib/api";
import { activate, isAppLanguage, readStoredLanguage } from "../lib/i18n";
import { publicSiteUrl } from "../lib/origins";
import { flipQuery } from "../lib/queries";
import { useReduceMotion } from "../lib/use-reduce-motion";

type Shown = Extract<FlipOut, { status: "ok" }>;

/** The learner tried to remember in the email, so a beat later the card turns on its own. */
const TURN_DELAY_MS = 420;
const TURN = { duration: 0.64, ease: EASE_OUT };

export function FlipView({ token }: { token: string }) {
  const view = useQuery(flipQuery(token));
  const data = view.data;
  const language = data && data.status !== "invalid" ? data.language : null;

  // A reader with no session has no language of their own here; the email's is the right one.
  useEffect(() => {
    if (language && !readStoredLanguage() && isAppLanguage(language)) activate(language);
  }, [language]);

  if (view.isPending) return <Frame />;
  if (data?.status === "ok") return <TurningCard view={data} />;
  // A forged link answers 404, which reads as expired; anything else may work on a second try.
  const unreachable =
    view.isError && !(view.error instanceof ApiError && view.error.status === 404);
  if (unreachable) {
    return (
      <Frame>
        <section className="edge min-w-0 rounded-xl bg-plate p-6 text-center @xl:p-10">
          <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink">
            <Trans>Couldn’t load this card</Trans>
          </h1>
          <p className="mx-auto mt-2 max-w-[38ch] text-md text-ink-secondary">
            <Trans>Check your connection and try again.</Trans>
          </p>
          <Button
            className="mt-6 w-full"
            variant="primary"
            loading={view.isFetching}
            onClick={() => void view.refetch()}
          >
            <Trans>Try again</Trans>
          </Button>
        </section>
      </Frame>
    );
  }
  return (
    <Frame>
      <section className="edge min-w-0 rounded-xl bg-plate p-6 text-center @xl:p-10">
        <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink">
          <Trans>This card has expired</Trans>
        </h1>
        <p className="mx-auto mt-2 max-w-[38ch] text-md text-ink-secondary">
          <Trans>Your cards are still in Lymi.</Trans>
        </p>
        <Button className="mt-6 w-full" variant="primary" render={<a href="/today" />}>
          <Trans>Open Lymi</Trans>
        </Button>
      </section>
    </Frame>
  );
}

function Frame({ children }: { children?: React.ReactNode }) {
  return <AuthFrame homeHref={publicSiteUrl()}>{children}</AuthFrame>;
}

function TurningCard({ view }: { view: Shown }) {
  const { i18n } = useLingui();
  const { t } = useMacro();
  const reduce = useReduceMotion();
  const [flipped, setFlipped] = useState(false);
  const { card, mode, deckName } = view;
  const from = `from=email-${view.kind}`;
  const signIn = new URLSearchParams({ returnTo: `/review?${from}` });

  useEffect(() => {
    const timer = setTimeout(() => setFlipped(true), TURN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const grade = useMutation({
    mutationFn: (rating: Rating) => api.grade({ cardId: card.id, mode, rating }),
    onSuccess: () => window.location.assign(`/review?${from}`),
  });

  const meaning = <span>{card.meaning}</span>;
  const term = <TermText card={card} />;
  const front = mode.cue === "meaning" ? meaning : term;
  const back = mode.cue === "meaning" ? term : meaning;
  const face =
    "edge col-start-1 row-start-1 flex min-h-[22rem] min-w-0 flex-col items-center justify-center rounded-xl bg-plate p-6 text-center [backface-visibility:hidden]";
  const label = deckName ? (
    <span className="absolute inset-x-6 top-5 truncate text-sm text-ink-muted">{deckName}</span>
  ) : null;

  return (
    <Frame>
      <div className="grid gap-3">
        <div className="grid [perspective:1400px]">
          <motion.button
            type="button"
            onClick={() => setFlipped((on) => !on)}
            initial={false}
            animate={reduce ? {} : { rotateY: flipped ? 180 : 0 }}
            transition={TURN}
            className="relative grid min-w-0 cursor-pointer [transform-style:preserve-3d]"
          >
            <span aria-hidden={flipped} className={clsx(face, reduce && flipped && "invisible")}>
              {label}
              <span className="block text-3xl font-medium text-ink">{front}</span>
            </span>
            <span
              aria-hidden={!flipped}
              className={clsx(
                face,
                !reduce && "[transform:rotateY(180deg)]",
                reduce && !flipped && "invisible",
              )}
            >
              {label}
              <span className="block text-lg text-ink-secondary">{front}</span>
              <i className="my-5 block h-px w-full bg-edge-strong" />
              <span className="block text-3xl font-medium text-ink">{back}</span>
              {card.example && (
                <span className="mt-5 block text-md text-ink-secondary">
                  <ExampleText text={card.example} lang={card.language ?? undefined} />
                  {card.exampleTranslation && (
                    <span className="mt-0.5 block text-sm text-ink-muted">
                      {card.exampleTranslation}
                    </span>
                  )}
                </span>
              )}
            </span>
          </motion.button>
        </div>
        <div
          className={clsx(
            "grid gap-2 transition-opacity delay-300 duration-200",
            flipped ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          {view.canGrade && !view.graded ? (
            <fieldset className="grid grid-cols-4 gap-2" aria-label={t`How did it go?`}>
              {GRADES.map((g) => {
                const Icon = g.icon;
                return (
                  <button
                    key={g.rating}
                    type="button"
                    disabled={grade.isPending}
                    onClick={() => grade.mutate(g.rating as Rating)}
                    className="edge grid h-[72px] min-w-0 content-center justify-items-center gap-1 rounded-lg bg-plate px-1 text-sm font-medium text-ink-secondary transition-[scale,background-color] duration-150 ease-out hoverable:hover:veil hoverable:hover:text-ink active:scale-[0.96] motion-reduce:active:scale-100"
                  >
                    <Icon
                      className={clsx("size-[18px]", g.iconClass)}
                      aria-hidden="true"
                      strokeWidth={1.75}
                    />
                    {i18n._(g.label)}
                  </button>
                );
              })}
            </fieldset>
          ) : (
            <Button
              className="w-full"
              variant="primary"
              render={<a href={view.canGrade ? `/review?${from}` : `/login?${signIn}`} />}
            >
              <Trans>Continue</Trans>
            </Button>
          )}
          {grade.isError && (
            <InlineError>
              <Trans>Couldn’t save the grade. Check your connection and try again.</Trans>
            </InlineError>
          )}
        </div>
      </div>
    </Frame>
  );
}
