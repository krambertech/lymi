import { clsx } from "clsx";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { SAMPLE_CARDS, type SampleCard } from "./cards";
import { prefersReducedMotion } from "./motion";

/** Every card is the same height, so a two-line meaning can never run into the card below. */
const CARD_H = 96;
const GAP = 12;
const STEP = CARD_H + GAP;
/** Visible positions in the column. The middle one sits in the beam. */
const SLOTS = 3;
const BEAM_SLOT = 1;
const TOP = 6;
const EVERY = 2600;

interface CardFaceProps {
  card: SampleCard;
  /** The newest card in the column wears this, so an arrival reads as an arrival. */
  fresh?: boolean | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

function CardFace({ card, fresh, className, style }: CardFaceProps) {
  return (
    <div
      className={clsx("lit-card overflow-hidden rounded-sm px-3.5 py-3", className)}
      style={style}
    >
      <div className="flex items-baseline gap-2">
        <span className="lit-label shrink-0 text-2xs tracking-[0.06em] uppercase">
          {card.label}
        </span>
        {fresh && (
          <span
            className="ml-auto shrink-0 rounded-xs bg-amber-soft px-1.5 py-px text-[9px] tracking-[0.08em] text-amber-text uppercase"
            style={{ opacity: "clamp(0, calc((var(--lit) - 0.7) * 4), 1)" }}
          >
            New
          </span>
        )}
      </div>
      <p className="lit-term mt-1 truncate text-lg font-medium tracking-[-0.026em]">{card.term}</p>
      <p className="lit-meaning mt-1 line-clamp-2 text-xs">{card.meaning}</p>
    </div>
  );
}

interface Props {
  /** Where to put the lamp. The hero reads it back so the pool sits on the lit card. */
  onLampMove?: ((point: { x: number; y: number }) => void) | undefined;
  className?: string | undefined;
}

/**
 * Cards arriving down one side, brightening as they cross the lamp and dropping away
 * underneath. The lamp does not move, so nothing can look out of line; the parent is told
 * where to put it from the real position of the lit slot rather than a guessed percentage.
 */
export function CardColumn({ onLampMove, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [feed, setFeed] = useState(SLOTS);
  const [held, setHeld] = useState(false);

  // Slot -1 holds the card that has not arrived yet and slot SLOTS the one on its way out.
  // Mounting both means an arrival slides in from above rather than appearing at the top.
  const shown: { key: number; slot: number; card: SampleCard }[] = [];
  for (let slot = -1; slot <= SLOTS; slot++) {
    const n = feed - 1 - slot;
    if (n < 0) continue;
    shown.push({ key: n, slot, card: SAMPLE_CARDS[n % SAMPLE_CARDS.length] as SampleCard });
  }

  useEffect(() => {
    if (held || prefersReducedMotion()) return;
    const t = window.setInterval(() => setFeed((n) => n + 1), EVERY);
    return () => window.clearInterval(t);
  }, [held]);

  // Tell the hero where the lit card actually is, once and on every resize.
  useEffect(() => {
    if (!onLampMove) return;
    const send = () => {
      const el = box.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      onLampMove({
        x: r.left + r.width / 2,
        y: r.top + TOP + BEAM_SLOT * STEP + CARD_H / 2,
      });
    };
    send();
    window.addEventListener("resize", send);
    window.addEventListener("scroll", send, { passive: true });
    return () => {
      window.removeEventListener("resize", send);
      window.removeEventListener("scroll", send);
    };
  }, [onLampMove]);

  return (
    <div
      ref={box}
      className={clsx("relative overflow-hidden", className)}
      style={{
        height: TOP + (SLOTS - 1) * STEP + CARD_H,
        maskImage: "linear-gradient(180deg, transparent, #000 18%, #000 76%, transparent)",
        WebkitMaskImage: "linear-gradient(180deg, transparent, #000 18%, #000 76%, transparent)",
      }}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
    >
      {shown.map(({ key, slot, card }) => {
        // How far this slot is from the beam, eased so the falloff looks like light.
        const raw = Math.max(0, 1 - Math.abs(slot - BEAM_SLOT) / 1.7);
        const lit = raw * raw * (3 - 2 * raw);
        return (
          <div
            key={key}
            className="absolute inset-x-0 top-0 transition-[transform,opacity] duration-[900ms] ease-out motion-reduce:transition-none"
            style={{
              height: CARD_H,
              transform: `translateY(${TOP + slot * STEP}px)`,
              opacity: slot < 0 || slot >= SLOTS ? 0 : 1,
            }}
          >
            <CardFace
              card={card}
              fresh={slot === BEAM_SLOT}
              className="h-full transition-[background-color,box-shadow,translate,opacity,--lit] duration-[900ms] ease-out motion-reduce:transition-none"
              style={{ "--lit": lit.toFixed(3) } as CSSProperties}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * The same idea sideways, for a narrow screen where a column next to the headline has
 * nowhere to go. Cards drift right to left through a beam fixed at the centre.
 */
export function CardBelt({ className }: { className?: string | undefined }) {
  const belt = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = belt.current;
    const box = wrap.current;
    if (!track || !box) return;

    const cards = Array.from(track.children) as HTMLElement[];
    const reduce = prefersReducedMotion();
    let width = 0;
    let offset = 0;
    let raf = 0;
    let last = 0;

    const measure = () => {
      width = 0;
      for (let i = 0; i < cards.length / 2; i++) width += (cards[i]?.offsetWidth ?? 0) + 10;
    };

    // Nothing snaps the belt, so a card can sit up to half a pitch off centre. The beam has
    // to be wider than that gap or the card nearest the middle never gets bright enough to
    // give up its meaning, which is the whole point of the thing moving.
    const REACH = 250;

    const paint = () => {
      const r = box.getBoundingClientRect();
      const beam = r.left + r.width / 2;
      for (const card of cards) {
        const c = card.getBoundingClientRect();
        const raw = Math.max(0, 1 - Math.abs(c.left + c.width / 2 - beam) / REACH);
        card.style.setProperty("--lit", (raw * raw * (3 - 2 * raw)).toFixed(3));
      }
    };

    const frame = (now: number) => {
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      if (!document.hidden) {
        offset -= 24 * dt;
        if (width && offset <= -width) offset += width;
        track.style.transform = `translate3d(${offset.toFixed(2)}px,0,0)`;
        paint();
      }
      raf = window.requestAnimationFrame(frame);
    };

    measure();
    window.addEventListener("resize", measure);
    if (reduce) paint();
    else raf = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div
      ref={wrap}
      className={clsx("overflow-hidden", className)}
      style={{
        maskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
      }}
      aria-hidden="true"
    >
      <div ref={belt} className="flex gap-2.5 will-change-transform">
        {[...SAMPLE_CARDS, ...SAMPLE_CARDS].map((card, i) => (
          <CardFace
            // biome-ignore lint/suspicious/noArrayIndexKey: the list is doubled, so index is the identity
            key={i}
            card={card}
            className="min-h-[112px] w-[156px] shrink-0"
          />
        ))}
      </div>
    </div>
  );
}
