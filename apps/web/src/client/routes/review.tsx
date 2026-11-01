import { Trans, useLingui } from "@lingui/react/macro";
import { readingsFadedField, useKnownReadings } from "@lymi/client/known-readings";
import { useRecallClock } from "@lymi/client/recall-clock";
import { type Offer, streakAsOf, streakWith } from "@lymi/client/review-end";
import { type ReviewPlatform, useReviewFlow } from "@lymi/client/review-flow";
import { writes } from "@lymi/client/writes";
import {
  CHOSEN_LIMIT,
  canPlayPronunciation,
  gradeAllowed,
  isolate,
  modeKey,
  pronunciationInputKey,
  type Rating,
  ROUNDS,
  type Round,
} from "@lymi/core";
import { lanternFor } from "@lymi/design";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "../components/button";
import { CardMenu } from "../components/card-menu";
import { CardPlace } from "../components/card-place";
import { EditCardSheet } from "../components/edit-card-sheet";
import { GRADES } from "../components/grade";
import { HintEditor } from "../components/hint-editor";
import { AID_KEY, aidSteps, aidTaken } from "../components/recall-aid";
import { ReportDialog } from "../components/report-dialog";
import { toast } from "../components/ui/toast";
import { useAddCard } from "../lib/add-card";
import { api, type Card, errorMessage, scopeKey } from "../lib/api";
import { usePrefetchPictures } from "../lib/card-images";
import { refreshAfterCardWrite } from "../lib/card-writes";
import { useMouse, useWide } from "../lib/device";
import { useDocumentTitle } from "../lib/document-title";
import { lastInputWasKey } from "../lib/last-input";
import { playAlone } from "../lib/now-playing";
import { sectionsQuery, streakQuery } from "../lib/queries";
import { recordReveal, useRevealNudge } from "../lib/reveal-nudge";
import { itemKey } from "../lib/review-modes";
import { shortQuote } from "../lib/short-quote";
import { captureAnalytics } from "../lib/telemetry";
import { useReduceMotion } from "../lib/use-reduce-motion";
import { useWordHistory } from "../lib/use-word-history";
import {
  GradeBar,
  REVEAL_TAP_GUARD_MS,
  ReviewCard,
  ReviewComplete,
  ReviewError,
  ReviewHeader,
  ReviewSkeleton,
} from "../views/review-view";
import { WordView } from "../views/word-view";

export const Route = createFileRoute("/review")({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    deck?: string;
    series?: string;
    section?: string;
    round?: Round;
    cards?: string[];
    card?: string;
  } => {
    const round = ROUNDS.find((r) => r === s.round);
    // Trimmed rather than dropped, so a long list never widens into the whole deck's review.
    const cards =
      Array.isArray(s.cards) && s.cards.length > 0 && s.cards.every((id) => typeof id === "string")
        ? (s.cards as string[]).slice(0, CHOSEN_LIMIT)
        : undefined;
    return {
      ...(typeof s.deck === "string" ? { deck: s.deck } : {}),
      // A section belongs to its deck, whose sections name it.
      ...(typeof s.section === "string" && typeof s.deck === "string"
        ? { section: s.section }
        : {}),
      // One scope at a time: a deck wins over a series.
      ...(typeof s.series === "string" && typeof s.deck !== "string" ? { series: s.series } : {}),
      ...(round ? { round } : {}),
      // Cards chosen on a deck page, reviewed as a list of their own.
      ...(cards && typeof s.deck === "string" && !round && typeof s.section !== "string"
        ? { cards }
        : {}),
      // The card open as a place, so the phone's back gesture closes it, as on the deck page.
      ...(typeof s.card === "string" ? { card: s.card } : {}),
    };
  },
  component: ReviewPage,
});

/** The grade strip, where focus goes when a sheet over the card closes. */
const GRADES_ID = "review-grades";
const gradesFocus = () => {
  // The group itself, not its first grade, so Space and 1 to 4 still reach the review's shortcuts.
  const grades = document.getElementById(GRADES_ID);
  if (!grades) return true;
  requestAnimationFrame(() => grades.focus({ preventScroll: true }));
  return false;
};

const WEB: ReviewPlatform = {
  track(event) {
    if (event.name === "review_session_finished") captureAnalytics(event.name, event);
    if (event.name === "review_session_abandoned") captureAnalytics(event.name, event);
  },
  newId: () => crypto.randomUUID(),
  onForeground(back) {
    const onVisible = () => {
      if (document.visibilityState === "visible") back();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  },
  onExit(gone) {
    window.addEventListener("pagehide", gone);
    return () => window.removeEventListener("pagehide", gone);
  },
};

/** A review of another deck or series starts over, so nothing from this one carries into it. */
function ReviewPage() {
  const { deck, series, section, cards } = Route.useSearch();
  const key = scopeKey({ deck, series, section }) + (cards ? cards.join(",") : "");
  return <Review key={key} />;
}

function Review() {
  const { t } = useLingui();
  useDocumentTitle(t`Review`);
  const { deck, series, section, round, cards, card: placeCardId } = Route.useSearch();
  const scope = useMemo(() => ({ deck, series, section }), [deck, series, section]);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const add = useAddCard();
  const reduce = useReduceMotion();
  const flow = useReviewFlow(scope, round, cards, WEB);
  const { data, state, left, mark, current, until, stopped, position: done, decks } = flow;
  const listed = !!round || !!cards;
  const streak = useQuery(streakQuery);
  const [revealed, setRevealed] = useState(false);
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing">("idle");
  // Tied to the queue item, so a failure never carries onto the next card's button.
  const [audioError, setAudioError] = useState<{ item: string; message: string } | null>(null);
  const playingAudio = useRef<HTMLAudioElement | null>(null);
  const loadedAudio = useRef<{ source: string; audio: HTMLAudioElement } | null>(null);
  const [animateNextCard, setAnimateNextCard] = useState(true);
  const [animateReveal, setAnimateReveal] = useState(true);
  // Where focus goes when the button holding it unmounts: the grades after a reveal, the next card after a grade.
  const [focusGrades, setFocusGrades] = useState(false);
  const [focusReveal, setFocusReveal] = useState(false);
  // Whether the card on screen offers a hint, decided as it arrives and held until its grade.
  const [cardOffer, setCardOffer] = useState({ key: "", offer: false, parked: false });
  // How far into the card's aids the learner went before the reveal, and whether they asked to see
  // them after it, held for the card on screen.
  const [aidState, setAidState] = useState({ key: "", taken: 0, shown: false, animate: true });
  // Presses of a locked grade's key, counted per card so an earlier card's never show its tip.
  const [lockedNudge, setLockedNudge] = useState({ key: "", presses: 0 });
  // The card whose hint is being written, so the editor never outlives its card.
  const [hintFor, setHintFor] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // Marks set in this review, shown at once rather than when the draw is fetched again.
  const [marks, setMarks] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const [editing, setEditing] = useState<Card | null>(null);
  // A mouse gets a visible ⋯, beside the card where there is room and in its head where there is not.
  const mouse = useMouse();
  const wide = useWide();

  const currentItemKey = current ? itemKey(current) : undefined;
  const { scopeName } = flow;
  const currentDeck = current ? decks?.find((d) => d.id === current.card.deckId) : undefined;
  // The draw carries the section's id alone; its name comes from the deck's own list, cached per deck.
  const sectionId = current?.card.sectionId ?? null;
  const sections = useQuery({
    ...sectionsQuery(current?.card.deckId ?? ""),
    enabled: !!sectionId,
  });
  const sectionName = sectionId
    ? sections.data?.sections.find((s) => s.id === sectionId)?.name
    : undefined;
  const nudge = useRevealNudge(
    current ? `${current.stateId}-${done}` : undefined,
    revealed,
    streak.data?.reviewedDays,
  );
  usePrefetchPictures(flow.upcoming, 0);

  const exhausted = !!data && !state?.next;
  const unconfirmed = flow.end === "unchecked";
  const end = flow.end === "unchecked" ? null : flow.end;
  const { failed } = flow;

  const counts = !!end?.satisfied;
  const attempts = state?.attempts;
  // Today as this screen's grades leave it, so the header's flame lights with the grade, not the refetch.
  const streakNow = useMemo(
    () =>
      streak.data && attempts !== undefined
        ? streakWith(streak.data, attempts, counts)
        : streak.data,
    [streak.data, attempts, counts],
  );
  // The week as the last end screen left it, which the streak refetch after each grade has already moved on.
  const markFrom = mark?.attempts;
  const markSatisfied = !!mark?.satisfied;
  const before = useMemo(
    () => ({
      week:
        streak.data && markFrom !== undefined
          ? streakAsOf(streak.data, markFrom, markSatisfied)
          : streak.data,
      lantern: lanternFor(streak.data),
    }),
    [streak.data, markFrom, markSatisfied],
  );
  const [held, setHeld] = useState(before);
  const frozen = stopped || (exhausted && !!held.week);
  useEffect(() => {
    if (!frozen) setHeld(before);
  }, [frozen, before]);

  const onOffer = (offer: Offer) => {
    const taken = flow.offer(offer);
    if (!taken) return;
    if (taken.to === "day") {
      void navigate({ to: "/review" });
      return;
    }
    // The pressed button fades out for a moment, and while it holds focus Space would not reach the card.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setHeld({
      week: streak.data && streakAsOf(streak.data, taken.mark.attempts, taken.mark.satisfied),
      lantern: lanternFor(streak.data),
    });
    setRevealed(false);
    setAnimateNextCard(true);
    setAnimateReveal(true);
    // The round is over, so a reload continues the day rather than walking it again. Chosen cards
    // stay in the URL, because they key the page and dropping them would remount the next leg.
    if (round && !(offer.kind === "continue" && offer.to === "resume")) {
      void navigate({
        to: "/review",
        search: {
          ...(deck ? { deck } : {}),
          ...(series ? { series } : {}),
          ...(section ? { section } : {}),
        },
        replace: true,
      });
    }
  };

  const stopAudio = useCallback(() => {
    playingAudio.current?.pause();
    playingAudio.current = null;
    setAudioState("idle");
  }, []);

  const watchAudio = useCallback(
    (audio: HTMLAudioElement) => {
      // The example's clip pauses this one when it starts, which ends it the same way.
      for (const done of ["ended", "pause"]) {
        audio.addEventListener(done, () => {
          if (playingAudio.current === audio) stopAudio();
        });
      }
      return audio;
    },
    [stopAudio],
  );

  // A clip voiced before is loaded with the card, so a tap plays it at once; a missing one is never voiced ahead.
  const preloadCard = current?.card;
  const currentCardId = preloadCard?.id;
  const currentAudioInput = preloadCard ? pronunciationInputKey(preloadCard) : null;
  const preloadSource =
    preloadCard?.audioKey && canPlayPronunciation(preloadCard)
      ? pronunciationInputKey(preloadCard)
      : null;
  useEffect(() => {
    setAudioError(null);
    if (!currentAudioInput) stopAudio();
    let live = true;
    if (preloadSource && currentCardId) {
      const audio = watchAudio(new Audio());
      audio.preload = "auto";
      audio.addEventListener(
        "canplaythrough",
        () => {
          if (live && !loadedAudio.current) loadedAudio.current = { source: preloadSource, audio };
        },
        { once: true },
      );
      audio.src = api.storedAudioUrl(currentCardId, preloadCard?.updatedAt);
    }
    return () => {
      live = false;
      stopAudio();
      loadedAudio.current = null;
    };
  }, [
    currentCardId,
    currentAudioInput,
    preloadSource,
    preloadCard?.updatedAt,
    stopAudio,
    watchAudio,
  ]);

  const playAudio = useCallback(async () => {
    if (!current || !canPlayPronunciation(current.card) || audioState === "loading") return;
    stopAudio();
    setAudioError(null);
    // The response is no-store, so a replay rewinds the element that already holds it, until an edit changes what it says.
    const source = pronunciationInputKey(current.card);
    const loaded = loadedAudio.current?.source === source ? loadedAudio.current.audio : null;
    const pressed = performance.now();
    const timing = () => ({
      preloaded: !!loaded,
      wait_ms: Math.min(60_000, Math.round(performance.now() - pressed)),
    });
    const audio =
      loaded ?? watchAudio(new Audio(api.audioUrl(current.card.id, current.card.updatedAt)));
    if (loaded) audio.currentTime = 0;
    else setAudioState("loading");
    playingAudio.current = audio;
    try {
      await playAlone(audio);
      if (playingAudio.current === audio) {
        loadedAudio.current = { source, audio };
        setAudioState("playing");
        captureAnalytics("pronunciation_played", { outcome: "played", revealed, ...timing() });
      }
    } catch {
      if (loadedAudio.current?.audio === audio) loadedAudio.current = null;
      if (playingAudio.current === audio) {
        playingAudio.current = null;
        setAudioState("idle");
        setAudioError({
          item: itemKey(current),
          message: t`Couldn’t play the pronunciation. Try again in a moment.`,
        });
        captureAnalytics("pronunciation_played", { outcome: "failed", revealed, ...timing() });
      }
    }
  }, [audioState, current, revealed, stopAudio, t, watchAudio]);

  const showing = current ? `${itemKey(current)}-${done}` : "";
  const recallTimes = useRecallClock(showing || null, revealed);
  const knownReadings = useKnownReadings();
  const writingHint = !!showing && hintFor === showing;
  const revealedAt = useRef(0);
  useEffect(() => {
    if (revealed) revealedAt.current = performance.now();
  }, [revealed]);
  // Only the card on screen opens as a place; a link to another one is left closed.
  const placeOpen = !!current && placeCardId === current.card.id;
  const placeTitleId = useId();
  const placeHistory = useWordHistory(placeOpen ? placeCardId : null);
  const openPlace = () => {
    if (current) void navigate({ to: ".", search: (prev) => ({ ...prev, card: current.card.id }) });
  };
  const closePlace = () =>
    void navigate({ to: ".", search: ({ card: _closed, ...rest }) => rest, replace: true });
  // A card that leaves without a grade, such as one archived from its menu, takes its reveal with it.
  const [revealedFor, setRevealedFor] = useState(showing);
  if (revealedFor !== showing) {
    setRevealedFor(showing);
    if (revealed) setRevealed(false);
  }
  const hint = current?.card.hint ?? null;
  const steps = useMemo(() => aidSteps({ hint }), [hint]);
  const taken = aidState.key === showing ? aidState.taken : 0;
  const shownAfter = aidState.key === showing && aidState.shown;
  // Only a step taken before the reveal is help with recall; seeing the hint after it is not.
  const aid = aidTaken(steps, taken);
  // This mode's grades earlier today: on a second try Easy counts as Good, ADR 0031.
  const gradedToday = useMemo(() => {
    if (!current || !state) return [];
    const key = modeKey(current.mode);
    return state.log.filter((e) => e.cardId === current.card.id && e.mode === key);
  }, [current, state]);
  const takeAid = useCallback(
    (input: "keyboard" | "pointer") => {
      if (revealed || taken >= steps.length) return;
      setAidState({ key: showing, taken: taken + 1, shown: false, animate: input !== "keyboard" });
    },
    [revealed, taken, steps.length, showing],
  );
  const showAid = useCallback(
    (input: "keyboard" | "pointer", focused = false) => {
      if (!revealed || taken > 0 || shownAfter || steps.length === 0) return;
      setAidState({ key: showing, taken, shown: true, animate: input !== "keyboard" });
      // The button holding focus goes, so focus moves on to what comes next: the grades.
      if (focused) gradesFocus();
    },
    [revealed, taken, shownAfter, steps.length, showing],
  );

  const onGrade = useCallback(
    (rating: Rating, input: "keyboard" | "pointer" = "pointer") => {
      if (!revealed || !current) return;
      // Easy means recall without help, so after a peek its key only says why, and grades nothing.
      if (!gradeAllowed(rating, aid)) {
        setLockedNudge((n) => ({
          key: showing,
          presses: n.key === showing ? n.presses + 1 : 1,
        }));
        return;
      }
      const graded = flow.grade(current, rating, {
        ...(aid ? { aid } : {}),
        ...recallTimes(),
        ...readingsFadedField(qc, current.card),
      });
      if (!graded) return;
      // Grading from the strip or the speaker keeps focus on the next card, so keyboard and screen
      // reader users don't drop to the page body.
      setFocusReveal(!!document.activeElement?.closest("[data-grade-strip], [data-audio]"));
      setAnimateNextCard(input !== "keyboard");
      setRevealed(false);
      const term = shortQuote(current.card.term);
      void graded.answered.then((refused) => {
        if (!refused) return;
        toast.add({
          type: "error",
          title:
            refused === "gone"
              ? t`Couldn’t save your grade for “${{ term: isolate(term) }}”. The card is no longer in your decks.`
              : t`Couldn’t save your grade for “${{ term: isolate(term) }}”. You’ll see it again.`,
        });
      });
    },
    [revealed, current, aid, showing, recallTimes, flow.grade, qc, t],
  );

  // Leaving mid-leg ends on the success screen, unless nothing was added since the last one.
  const leave = useCallback(() => {
    if (!flow.pause()) void navigate({ to: "/today" });
  }, [flow.pause, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A sheet over the review handles its own keys, Escape included.
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (add.open || writingHint || menuOpen || editing || placeOpen) return;
      if (e.key === "Escape") {
        leave();
        return;
      }
      const target = e.target as HTMLElement | null;
      const control = target?.closest(
        "button, a, input, textarea, select, [contenteditable='true']",
      );
      // The aid's key also reaches the card's reveal button, where grading from the strip leaves
      // focus, and the aid's own buttons; matched by its place, so every keyboard layout has it.
      if (current && e.code === AID_KEY.code) {
        if (control && !control.matches("[data-reveal], [data-aid]")) return;
        e.preventDefault();
        const onAid = control?.matches("[data-aid]") ?? false;
        if (revealed) showAid("keyboard", onAid);
        else {
          takeAid("keyboard");
          // The spent pill turns inert, so focus moves on to the card, as a press on the pill does.
          if (onAid)
            document.querySelector<HTMLElement>("[data-reveal]")?.focus({ preventScroll: true });
        }
        return;
      }
      const g = GRADES.find((x) => x.key === e.key);
      // A click leaves focus on the speaker, which keeps Space and Enter to replay and lets the
      // grade keys through.
      if (control && !(g && control.matches("[data-audio]"))) return;
      if (!current) return;
      if (e.key === " ") {
        e.preventDefault();
        if (!revealed) {
          recordReveal();
          setAnimateReveal(false);
          setFocusGrades(false);
          setRevealed(true);
        } else onGrade(3, "keyboard");
      }
      if (g) {
        e.preventDefault();
        onGrade(g.rating, "keyboard");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    revealed,
    onGrade,
    takeAid,
    showAid,
    leave,
    add.open,
    writingHint,
    menuOpen,
    editing,
    placeOpen,
    current,
  ]);

  // A card often forgotten, or forgotten twice today, with no hint offers one, in a deck the learner
  // owns, since only the owner changes its cards. It waits for the card's deck, which a deck list
  // cached before the deck existed lacks, and once decided it holds, so a refetch never moves it mid-card.
  if (cardOffer.key !== showing && (!current || currentDeck)) {
    const stuck = !!current?.slipping || gradedToday.filter((e) => e.rating === 1).length >= 2;
    setCardOffer({
      key: showing,
      offer: stuck && !current?.card.hint && currentDeck?.role === "owner",
      parked: false,
    });
  }
  const offer = cardOffer.key === showing && cardOffer.offer;
  const owned = currentDeck?.role === "owner";
  const [reporting, setReporting] = useState(false);
  // Writing a hint parks the offer, and the panel fades, so it never stands beside the editor.
  // Where focus goes as the menu closes: the grades, unless the chosen row opened something that
  // takes focus itself, such as the hint editor, the card editor or the card's place.
  const menuHandsFocus = useRef(false);
  const menuFinalFocus = () => {
    if (menuHandsFocus.current) {
      menuHandsFocus.current = false;
      return false;
    }
    return gradesFocus();
  };
  const openHint = () => {
    setHintFor(showing);
    setCardOffer((held) => ({ ...held, parked: true }));
  };
  const closeHint = () => {
    setHintFor(null);
    gradesFocus();
  };

  const importantOf = (card: Card) => marks.get(card.id) ?? card.important;
  const markImportant = async (card: Card, important: boolean) => {
    setMarks((m) => new Map(m).set(card.id, important));
    try {
      await writes.setImportant(card, important);
      qc.invalidateQueries({ queryKey: ["cards", card.id, "history"] });
    } catch (e) {
      setMarks((m) => new Map(m).set(card.id, !important));
      toast.add({ type: "error", title: errorMessage(e) });
    }
  };

  const archiveCurrent = async () => {
    if (!current) return;
    const card = current.card;
    const archivedTerm = shortQuote(card.term);
    flow.archive(card.id);
    try {
      await writes.archiveCard(card.id);
    } catch (e) {
      flow.restore(card.id);
      toast.add({ type: "error", title: errorMessage(e) });
      return;
    }
    toast.add({
      id: `archived-${card.id}`,
      title: t`Archived “${{ archivedTerm: isolate(archivedTerm) }}”`,
      actionProps: {
        children: t`Undo`,
        onClick: async () => {
          toast.close(`archived-${card.id}`);
          try {
            await writes.restoreCard(card.id);
            flow.restore(card.id);
          } catch (e) {
            toast.add({ type: "error", title: errorMessage(e) });
          }
          await refreshAfterCardWrite(qc, card.id);
        },
      },
    });
    void refreshAfterCardWrite(qc, card.id);
  };

  // On touch the revealed card is the menu's handle: a tap opens it. A tap this soon after the
  // reveal is the reveal's own tap doubled, not a second one.
  const openFromCard = (e: React.MouseEvent<HTMLElement>) => {
    if (mouse || !revealed || writingHint) return;
    // A tap in a portal, such as the drawer's own backdrop, still bubbles here through React.
    if (!e.currentTarget.contains(e.target as Node)) return;
    if (performance.now() - revealedAt.current < REVEAL_TAP_GUARD_MS) return;
    const target = e.target as HTMLElement;
    if (target.closest(`button, a, input, textarea, [role="menu"], #${GRADES_ID}`)) return;
    // A press that selected text was a selection, not a tap.
    if (window.getSelection()?.toString()) return;
    setMenuOpen(true);
  };

  const cardMenu = current && (
    <CardMenu
      open={menuOpen}
      onOpenChange={setMenuOpen}
      visible={mouse}
      hasHint={!!current.card.hint}
      important={importantOf(current.card)}
      onImportantChange={(important) => void markImportant(current.card, important)}
      canEdit={owned}
      finalFocus={menuFinalFocus}
      onHint={() => {
        menuHandsFocus.current = true;
        openHint();
      }}
      onEdit={() => {
        menuHandsFocus.current = true;
        setEditing(current.card);
      }}
      onView={() => {
        menuHandsFocus.current = true;
        openPlace();
      }}
      onArchive={() => void archiveCurrent()}
      onReport={currentDeck && !owned ? () => setReporting(true) : undefined}
    />
  );

  const doneLink = (variant: "primary" | "secondary") => (
    <Button variant={variant} size="lg" className="w-full" render={<Link to="/today" />}>
      <Trans>Done</Trans>
    </Button>
  );

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-x-clip px-4 @3xl:overflow-x-visible pb-[calc(env(safe-area-inset-bottom)+12px)] @3xl:max-w-2xl @3xl:px-8 @3xl:pb-8 @3xl:pt-4">
      <ReviewHeader
        attempts={state?.attempts ?? 0}
        goal={
          until !== null && data
            ? Math.min(data.goal, (state?.attempts ?? 0) + left)
            : (data?.goal ?? 0)
        }
        animateCount={animateNextCard}
        round={
          flow.progress && until === null
            ? { done: flow.progress.done, size: flow.progress.total }
            : undefined
        }
        streak={streakNow}
        complete={!!end}
        loading={!data && !failed}
        onClose={leave}
      />

      {/* While the end waits for the last grade to land, the room stays empty rather than drawing a card. */}
      {!current && !end && !stopped && !unconfirmed && !failed && <ReviewSkeleton />}

      {failed && (
        <ReviewError
          retry={flow.retry}
          action={
            <Button variant="ghost" render={<Link to="/today" />}>
              <Trans>Back</Trans>
            </Button>
          }
        />
      )}

      {unconfirmed && !failed && (
        <ReviewError
          title={<Trans>Couldn’t check for more cards</Trans>}
          body={<Trans>Your grades are saved. Check your connection and try again.</Trans>}
          retry={flow.refetchDraw}
          action={
            <Button variant="ghost" render={<Link to="/today" />}>
              <Trans>Done</Trans>
            </Button>
          }
        />
      )}

      {/* The card steps back as the end arrives, popped out of the flow so the two overlap. */}
      <AnimatePresence mode="popLayout" initial={false}>
        {end && data && state && (
          <motion.div
            key="end"
            className="flex min-h-0 flex-1 flex-col"
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
          >
            <ReviewComplete
              end={end}
              attempts={state.attempts}
              from={mark?.attempts}
              scopeName={scopeName}
              streak={streakNow}
              streakBefore={held.week}
              lanternFrom={held.lantern.out ? "out" : (held.lantern.progress ?? "brand")}
              focusOnMount
              onOffer={onOffer}
              done={doneLink}
              addCards={
                <Button size="lg" className="w-full" onClick={() => add.openCard(deck)}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  <Trans>Add cards</Trans>
                </Button>
              }
            />
          </motion.div>
        )}
        {current && (
          <motion.div
            key="cards"
            className="relative flex min-h-0 flex-1 flex-col"
            onClick={openFromCard}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.12 } }
                : {
                    opacity: 0,
                    y: 8,
                    scale: 0.98,
                    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
                  }
            }
          >
            <ReviewCard
              key={`${itemKey(current)}-${done}`}
              item={current}
              deck={
                currentDeck && {
                  name: currentDeck.name,
                  language: currentDeck.defaultLanguage ?? null,
                  pronunciationDisplay: currentDeck.pronunciationDisplay,
                }
              }
              section={sectionName}
              knownReadings={knownReadings}
              revealed={revealed}
              animateReveal={animateReveal}
              animateIn={animateNextCard}
              nudge={nudge}
              focusOnMount={focusReveal}
              onReveal={() => {
                recordReveal();
                setAnimateReveal(true);
                setFocusGrades(document.activeElement instanceof HTMLButtonElement);
                setRevealed(true);
              }}
              onPlayAudio={canPlayPronunciation(current.card) ? playAudio : undefined}
              audioState={audioState}
              audioError={
                audioError && audioError.item === currentItemKey ? audioError.message : null
              }
              offer={
                offer
                  ? {
                      // Once the answer has settled: its lines take about half a second to land.
                      delay: animateReveal ? (reduce ? 0.7 : 0.95) : 0.5,
                      animate: animateReveal,
                      parked: cardOffer.parked,
                      onOpen: openHint,
                    }
                  : undefined
              }
              aid={
                steps.length > 0 && !writingHint
                  ? {
                      steps,
                      taken,
                      shown: shownAfter,
                      animate: aidState.key === showing ? aidState.animate : true,
                      onTake: takeAid,
                      onShow: showAid,
                    }
                  : undefined
              }
              headSlot={mouse && !wide}
              headEnd={
                mouse && !wide && revealed ? (
                  <span className="enter-fade">{cardMenu}</span>
                ) : undefined
              }
              hintEditor={
                writingHint ? (
                  <HintEditor
                    card={current.card}
                    onCancel={closeHint}
                    onSaved={() => {
                      closeHint();
                      // Written after the reveal, it shows at once where Show hint would have put it.
                      setAidState({
                        key: showing,
                        taken,
                        shown: true,
                        animate: !lastInputWasKey(),
                      });
                    }}
                  />
                ) : undefined
              }
              className="mt-4 @3xl:max-h-[600px] @3xl:[@media(min-height:40rem)]:min-h-[460px]"
            />
            {/* Only once the answer shows. With a mouse and room, beside the card, so nothing on it
                moves; on touch the card is the handle and this button is for a screen reader. */}
            {revealed && !(mouse && !wide) && (
              <span
                className={mouse ? "absolute -end-10 top-7 enter-fade" : "absolute top-0 start-0"}
              >
                {cardMenu}
              </span>
            )}
            <GradeBar
              id={GRADES_ID}
              revealed={revealed}
              animateIn={animateReveal}
              animateOut={animateNextCard}
              focusOnReveal={focusGrades}
              next={current.next}
              aid={aid}
              lockedNudge={lockedNudge.key === showing ? lockedNudge.presses : 0}
              onGrade={(rating) => onGrade(rating, "pointer")}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {current && currentDeck && (
        <CardPlace open={placeOpen} onClose={closePlace} titleId={placeTitleId}>
          <WordView
            key={current.card.id}
            card={{ ...current.card, important: importantOf(current.card) }}
            onImportantChange={(important) => void markImportant(current.card, important)}
            state={placeHistory?.states[0] ?? null}
            deckName={currentDeck.name}
            modes={current.card.reviewModes ?? currentDeck.reviewModes}
            knownReadings={knownReadings}
            history={placeHistory}
            titleId={placeTitleId}
            onPlayAudio={canPlayPronunciation(current.card) ? playAudio : undefined}
            onClose={closePlace}
            onReport={
              !owned
                ? () => {
                    closePlace();
                    setReporting(true);
                  }
                : undefined
            }
            owner={
              owned
                ? {
                    onEdit: () => setEditing(current.card),
                    enrichFields: currentDeck.enrichFields,
                    onEnrich: () =>
                      void api
                        .enrichCard(current.card.id)
                        .then(() => refreshAfterCardWrite(qc, current.card.id))
                        .catch((e: unknown) =>
                          toast.add({ type: "error", title: errorMessage(e) }),
                        ),
                    onArchive: () => {
                      closePlace();
                      void archiveCurrent();
                    },
                  }
                : undefined
            }
          />
        </CardPlace>
      )}
      {current && currentDeck && !owned && (
        <ReportDialog
          open={reporting}
          onOpenChange={setReporting}
          target={{ kind: "card", cardId: current.card.id }}
          name={current.card.term}
        />
      )}
      <EditCardSheet
        card={editing}
        decks={decks}
        onOpenChange={(open) => !open && setEditing(null)}
        onReopen={(card) => setEditing(card)}
        finalFocus={gradesFocus}
      />
    </div>
  );
}
