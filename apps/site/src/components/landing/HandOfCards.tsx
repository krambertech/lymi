import type { MessageDescriptor } from "@lingui/core";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Volume2 } from "lucide-react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { buttonClass } from "../Button";
import { HAND_CARDS, type HandCard } from "./hand-cards";

const HAND_SIZE = 5;
const DEAL_STAGGER_MS = 90;
const DEAL_MS = 720;
const TOSS_MS = 620;
/** How long the first card waits, untouched, before it shows how it turns. */
const HINT_AFTER_MS = 2400;
const DEALT_KEY = "lymi-hand-dealt";

interface Dealt {
  key: number;
  card: HandCard;
}

const isLanguage = (card: HandCard) => typeof card.source === "string";
const fieldOf = (card: HandCard) =>
  typeof card.source === "string" ? card.source : (card.source.id ?? "");

function shuffle<T>(list: readonly T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/**
 * Takes the next card from a shuffled pile: never one already held, never the field just dealt,
 * and never a third language or a third idea in a row, so the hand keeps showing its range.
 */
function draw(pile: HandCard[], held: Dealt[], cards: readonly HandCard[]): HandCard {
  const inHand = new Set(held.map((d) => d.card.id));
  const last = held.at(-1)?.card;
  const beforeLast = held.at(-2)?.card;
  const sameRun =
    last && beforeLast && isLanguage(last) === isLanguage(beforeLast) ? isLanguage(last) : null;
  const fits = (c: HandCard) =>
    !inHand.has(c.id) &&
    (!last || fieldOf(c) !== fieldOf(last)) &&
    (sameRun === null || isLanguage(c) !== sameRun);

  for (const strict of [true, false]) {
    if (pile.length === 0) pile.push(...shuffle(cards));
    const i = pile.findIndex(strict ? fits : (c) => !inHand.has(c.id));
    if (i >= 0) return pile.splice(i, 1)[0] as HandCard;
    pile.length = 0;
  }
  return cards.find((c) => !inHand.has(c.id)) ?? (cards[0] as HandCard);
}

interface CardProps {
  card: HandCard;
  /** Where it sits: the deck it was dealt from, the front of the fan, behind it, or tossed. */
  place: "front" | "fan" | "gone";
  slot: number;
  angle: number;
  revealed: boolean;
  /** Arrive from the deck rather than appearing in place. */
  enter: boolean;
  delay: number;
  playing: boolean;
  onPlay: (card: HandCard) => void;
  onPress: () => void;
  /** Shown on the front face once a visitor has waited without turning anything. */
  hint?: string | null | undefined;
  flipRef?: ((el: HTMLDivElement | null) => void) | undefined;
}

function FanCard({
  card,
  place,
  slot,
  angle,
  revealed,
  enter,
  delay,
  playing,
  onPlay,
  onPress,
  hint,
  flipRef,
}: CardProps) {
  const { t, i18n } = useLingui();
  const [landed, setLanded] = useState(!enter);
  const self = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (landed) return;
    // Reading layout commits the deck position, so the change to the real place transitions
    // from there. No animation frame is involved, so a background tab still ends up dealt.
    self.current?.getBoundingClientRect();
    setLanded(true);
  }, [landed]);

  const say = (d: MessageDescriptor) => i18n._(d);
  const source = typeof card.source === "string" ? card.source : say(card.source);
  const front = place === "front";
  const longest = Math.max(...card.term.split(/\s+/).map((w) => w.length));
  // A long single word would otherwise break mid-letter at the card's width.
  const termSize = longest >= 13 ? 0.115 : longest >= 11 ? 0.13 : 0.155;

  const top = (
    <>
      <p className="text-xs font-medium tracking-[0.06em] text-muted uppercase">
        {source} · {say(card.kind)}
      </p>
      <p
        lang={card.language}
        className="mt-3.5 text-[min(46px,calc(var(--cw)*var(--term)))] leading-[1.02] font-medium tracking-[-0.03em] text-balance text-text [overflow-wrap:anywhere]"
        style={{ "--term": termSize } as CSSProperties}
      >
        {card.term}
      </p>
      {card.reading && (
        <p lang={card.language} className="mt-1.5 text-md text-text-2">
          {card.reading}
        </p>
      )}
      <p className="mt-2.5 flex min-h-8 items-center gap-2.5 text-md text-muted">
        {card.pronunciation && <span className="hand-ipa truncate">{card.pronunciation}</span>}
        <button
          type="button"
          aria-label={playing ? t`Replay pronunciation` : t`Play pronunciation`}
          tabIndex={front ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation();
            onPlay(card);
          }}
          className={clsx(
            "relative inline-flex size-8 shrink-0 items-center justify-center rounded-full edge bg-plate transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97] hoverable:hover:bg-hover",
            "before:absolute before:-inset-1.5 before:content-[''] [&_svg]:size-4",
            playing ? "text-text" : "text-text-2",
            !front && "invisible",
          )}
        >
          <Volume2 aria-hidden="true" />
        </button>
      </p>
    </>
  );

  return (
    // The whole card turns over on a tap; the Turn it over button below is the keyboard way in.
    <div
      ref={self}
      className="hand-card"
      data-place={landed ? place : "deck"}
      data-revealed={revealed || undefined}
      inert={!front}
      aria-hidden={!front || undefined}
      onClick={front ? onPress : undefined}
      style={
        {
          "--slot": slot,
          "--angle": angle,
          "--delay": `${delay}ms`,
          zIndex: place === "gone" ? 60 : 50 - slot,
        } as CSSProperties
      }
    >
      <div ref={flipRef} className="hand-flip">
        <div className="hand-face" aria-hidden={revealed || undefined}>
          {top}
          <p
            className="hand-hint mt-auto text-base text-muted"
            data-shown={hint ? true : undefined}
          >
            {hint}
          </p>
        </div>
        <div className="hand-face hand-back" aria-hidden={!revealed || undefined}>
          {top}
          <p className="mt-auto border-t border-edge-2 pt-3.5 text-[min(20px,calc(var(--cw)*0.066))] leading-[1.35] text-pretty text-text">
            {say(card.meaning)}
          </p>
          <p className="mt-2 text-[13.5px] leading-[1.45] text-muted">{say(card.note)}</p>
        </div>
      </div>
    </div>
  );
}

interface Props {
  /** A vertical page can deal from its own field. */
  cards?: readonly HandCard[] | undefined;
}

/**
 * A hand of real cards to turn over, one after another, for as long as the visitor likes. It
 * teaches the one move Lymi is built on, looking at a term before its meaning, and shows how
 * much a card can hold. The deal plays once per session; after that the hand is simply there.
 */
export function HandOfCards({ cards = HAND_CARDS }: Props) {
  const { t, i18n } = useLingui();
  const [hand, setHand] = useState<Dealt[]>([]);
  const [gone, setGone] = useState<Dealt[]>([]);
  const [phase, setPhase] = useState<"dealing" | "front" | "back">("dealing");
  const [intro, setIntro] = useState(false);
  const [turned, setTurned] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const pile = useRef<HandCard[]>([]);
  const nextKey = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const frontFlip = useRef<HTMLDivElement | null>(null);
  const [hint, setHint] = useState(false);
  const [finePointer, setFinePointer] = useState(true);
  const taught = useRef(false);

  // The hand is random, so it is dealt after hydration rather than rendered on the server.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(DEALT_KEY) === "1";
      sessionStorage.setItem(DEALT_KEY, "1");
    } catch {}
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFinePointer(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    const first: Dealt[] = [];
    for (let i = 0; i < HAND_SIZE; i++) {
      first.push({ key: nextKey.current++, card: draw(pile.current, first, cards) });
    }
    const play = !seen && !still;
    setIntro(play);
    setHand(first);
    if (!play) {
      setPhase("front");
      return;
    }
    const settle = window.setTimeout(
      () => setPhase("front"),
      DEAL_STAGGER_MS * (HAND_SIZE - 1) + DEAL_MS,
    );
    return () => window.clearTimeout(settle);
  }, [cards]);

  // A visitor who has not turned the first card after a moment is shown how: the card is pressed
  // and lifts at one edge as if turning, and a line says what to do. Anyone who already knows
  // never sees either.
  useEffect(() => {
    if (phase !== "front" || taught.current) return;
    const wait = window.setTimeout(() => {
      setHint(true);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      frontFlip.current?.animate(
        [
          { transform: "scale(1) rotateY(0deg)" },
          { transform: "scale(0.965) rotateY(0deg)", offset: 0.16 },
          { transform: "scale(1) rotateY(-30deg)", offset: 0.55 },
          { transform: "scale(1) rotateY(0deg)" },
        ],
        { duration: 1300, easing: "cubic-bezier(0.37, 0, 0.63, 1)" },
      );
    }, HINT_AFTER_MS);
    return () => window.clearTimeout(wait);
  }, [phase]);

  useEffect(() => () => audio.current?.pause(), []);

  const stopAudio = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    setPlaying(null);
  }, []);

  const play = useCallback((card: HandCard) => {
    audio.current?.pause();
    const clip = new Audio(`/audio/hand/${card.id}.mp3`);
    audio.current = clip;
    setPlaying(card.id);
    const done = () => setPlaying((current) => (current === card.id ? null : current));
    clip.addEventListener("ended", done);
    clip.addEventListener("error", done);
    clip.play().catch(done);
  }, []);

  const reveal = useCallback(() => {
    const front = hand[0];
    if (phase !== "front" || !front) return;
    taught.current = true;
    setHint(false);
    setPhase("back");
    setAnnounce(`${front.card.term}: ${i18n._(front.card.meaning)}`);
  }, [hand, phase, i18n]);

  const next = useCallback(() => {
    const [front, ...rest] = hand;
    if (phase !== "back" || !front) return;
    stopAudio();
    const dealt = { key: nextKey.current++, card: draw(pile.current, rest, cards) };
    setGone((g) => [...g, front]);
    window.setTimeout(() => setGone((g) => g.filter((d) => d.key !== front.key)), TOSS_MS);
    setHand([...rest, dealt]);
    setTurned((n) => n + 1);
    setPhase("front");
    if (rest[0]) setAnnounce(t`Next card: ${rest[0].card.term}`);
  }, [hand, phase, cards, stopAudio, t]);

  const press = phase === "back" ? next : reveal;
  const behind = hand.length - 1;

  return (
    <section
      aria-label={t`Turn a few cards over`}
      className="hand grid w-full justify-items-center"
    >
      <div className="hand-stage">
        {gone.map(({ key, card }) => (
          <FanCard
            key={key}
            card={card}
            place="gone"
            slot={0}
            angle={0}
            revealed
            enter={false}
            delay={0}
            playing={false}
            onPlay={play}
            onPress={press}
          />
        ))}
        {hand.map(({ key, card }, k) => {
          const angle = k === 0 ? 0 : behind === 1 ? 1 : (k - 1 - (behind - 1) / 2) * 1.5;
          const dealing = intro && key < HAND_SIZE;
          return (
            <FanCard
              key={key}
              card={card}
              place={k === 0 ? "front" : "fan"}
              slot={k}
              angle={angle}
              revealed={k === 0 && phase === "back"}
              enter={dealing || key >= HAND_SIZE}
              delay={dealing && phase === "dealing" ? DEAL_STAGGER_MS * (HAND_SIZE - 1 - k) : 0}
              playing={k === 0 && playing === card.id}
              onPlay={play}
              onPress={press}
              hint={
                k === 0 && hint
                  ? finePointer
                    ? t`Click to turn it over`
                    : t`Tap to turn it over`
                  : null
              }
              flipRef={
                k === 0
                  ? (el) => {
                      frontFlip.current = el;
                    }
                  : undefined
              }
            />
          );
        })}
      </div>

      <div className="mt-4 flex min-h-10 items-center gap-3">
        {hand.length > 0 && (
          <button
            type="button"
            onClick={press}
            aria-disabled={phase === "dealing" || undefined}
            className={buttonClass(
              "ghost",
              "sm",
              "font-normal text-muted hoverable:hover:bg-transparent hoverable:hover:text-text-2",
            )}
          >
            {phase === "back" ? <Trans>Next card</Trans> : <Trans>Turn it over</Trans>}
          </button>
        )}
        {turned > 0 && (
          <p className="text-xs text-muted tabular-nums" aria-hidden="true">
            <Plural value={turned} one="# turned" other="# turned" />
          </p>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </section>
  );
}
