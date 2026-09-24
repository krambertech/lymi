import { clsx } from "clsx";
import { type ReactNode, useId } from "react";

/**
 * A drawn face for each seeded persona, each carrying one clue to what the account holds. Colours
 * come from `.dev-skin`, so an avatar only renders inside the developer tools.
 */

interface Look {
  bg: string;
  skin: string;
  shirt: string;
  /** Hair that falls behind the shoulders. */
  back?: ReactNode;
  /** Hair and anything worn on the head. */
  front?: ReactNode;
  /** Replaces the eyes, e.g. sunglasses. */
  eyes?: ReactNode;
  /** Drawn over the shirt. */
  collar?: ReactNode;
}

const LONG_HAIR = "M11.5 19.8C11.5 12.2 15.1 8.4 20 8.4s8.5 3.8 8.5 11.4V32h-17z";
const CENTRE_PART =
  "M12.1 19c0-6.4 3.5-10 7.9-10s7.9 3.6 7.9 10c-1.5-3.7-4.4-6.4-7.9-7.2-3.5.8-6.4 3.5-7.9 7.2z";

const LOOKS: Record<string, Look> = {
  // Just signed up: a sprout.
  fresh: {
    bg: "var(--av-bg-mint)",
    skin: "var(--av-skin-3)",
    shirt: "var(--av-shirt-light)",
    front: (
      <>
        <path
          d="M12.4 17.2C12.4 11.8 15.8 9.2 20 9.2s7.6 2.6 7.6 8c-1.6-2-4.4-3.4-7.6-3.4s-6 1.4-7.6 3.4z"
          fill="var(--av-hair-dark)"
        />
        <path
          d="M20 9.6V5.4"
          stroke="var(--av-leaf)"
          strokeWidth={1.2}
          strokeLinecap="round"
          fill="none"
        />
        <path d="M20 6.8c-.4-2-2-3-4.1-2.8.3 2 1.9 3 4.1 2.8z" fill="var(--av-leaf)" />
        <path d="M20 5.9c.5-1.8 2-2.7 3.9-2.4-.3 1.8-1.9 2.7-3.9 2.4z" fill="var(--av-leaf)" />
      </>
    ),
  },
  // Three weeks in, the everyday learner.
  learner: {
    bg: "var(--av-bg-amber)",
    skin: "var(--av-skin-1)",
    shirt: "var(--av-ink)",
    back: <path d={LONG_HAIR} fill="var(--av-hair-brown)" />,
    front: (
      <path
        d="M12.2 18.2C12.6 12.2 15.9 9.3 20 9.3c4.3 0 7.5 3 7.8 8.7-3.9-.6-7.4-2.6-9.2-5.6-1.3 2.6-3.5 4.6-6.4 5.8z"
        fill="var(--av-hair-brown)"
      />
    ),
  },
  // Fourteen days running: a flame in the braid.
  streak: {
    bg: "var(--av-bg-coral)",
    skin: "var(--av-skin-1)",
    shirt: "var(--av-shirt-light)",
    front: (
      <>
        <path
          d="M12.3 17.6C12.3 11.8 15.7 9 20 9s7.7 2.8 7.7 8.4c-2.9-.3-7-2.2-8.8-4.9-1.3 2.3-3.6 4.1-6.6 5.1z"
          fill="var(--av-hair-blonde)"
        />
        <circle cx={27.9} cy={21.6} r={2.1} fill="var(--av-hair-blonde)" />
        <circle cx={28.7} cy={25.3} r={1.9} fill="var(--av-hair-blonde)" />
        <circle cx={29.2} cy={28.8} r={1.7} fill="var(--av-hair-blonde)" />
        <path
          d="M14.8 9.8c1.2 1.1 1.8 2 1.8 3a1.8 1.8 0 0 1-3.6 0c0-1 .6-1.9 1.8-3z"
          fill="var(--av-red)"
        />
      </>
    ),
  },
  // Back after a month away: holiday sunglasses.
  backlog: {
    bg: "var(--av-bg-slate)",
    skin: "var(--av-skin-2)",
    shirt: "var(--av-shirt-orange)",
    front: (
      <g fill="var(--av-hair-dark)">
        <circle cx={13.8} cy={14} r={3.1} />
        <circle cx={16.4} cy={10.6} r={3.1} />
        <circle cx={20.2} cy={9.4} r={3.1} />
        <circle cx={23.9} cy={10.6} r={3.1} />
        <circle cx={26.4} cy={14} r={3.1} />
        <circle cx={20} cy={12.2} r={3.4} />
      </g>
    ),
    eyes: (
      <g fill="var(--av-ink)">
        <rect x={14.1} y={17.8} width={5} height={3.3} rx={1.4} />
        <rect x={20.9} y={17.8} width={5} height={3.3} rx={1.4} />
        <path d="M19 18.8h2" stroke="var(--av-ink)" strokeWidth={0.9} />
      </g>
    ),
  },
  // Long German cards: reading glasses.
  long: {
    bg: "var(--av-bg-teal)",
    skin: "var(--av-skin-1)",
    shirt: "var(--av-ink)",
    back: <path d={LONG_HAIR} fill="var(--av-hair-red)" />,
    front: <path d={CENTRE_PART} fill="var(--av-hair-red)" />,
    eyes: (
      <>
        <circle cx={17.1} cy={19.6} r={0.95} fill="var(--av-ink)" />
        <circle cx={22.9} cy={19.6} r={0.95} fill="var(--av-ink)" />
        <g stroke="var(--av-ink)" strokeWidth={0.8} fill="none">
          <circle cx={17.1} cy={19.6} r={2.4} />
          <circle cx={22.9} cy={19.6} r={2.4} />
          <path d="M19.5 19.4h1" />
        </g>
      </>
    ),
  },
  // Ukrainian interface: a flower wreath and an embroidered collar.
  polyglot: {
    bg: "var(--av-bg-violet)",
    skin: "var(--av-skin-2)",
    shirt: "var(--av-shirt-light)",
    back: <path d={LONG_HAIR} fill="var(--av-hair-dark)" />,
    front: (
      <>
        <path d={CENTRE_PART} fill="var(--av-hair-dark)" />
        <g fill="var(--av-leaf)">
          <ellipse cx={14.7} cy={10.5} rx={1.5} ry={0.8} transform="rotate(-45 14.7 10.5)" />
          <ellipse cx={18.2} cy={8.6} rx={1.5} ry={0.8} transform="rotate(-15 18.2 8.6)" />
          <ellipse cx={21.8} cy={8.6} rx={1.5} ry={0.8} transform="rotate(15 21.8 8.6)" />
          <ellipse cx={25.3} cy={10.5} rx={1.5} ry={0.8} transform="rotate(45 25.3 10.5)" />
        </g>
        <circle cx={13.2} cy={12.6} r={1.9} fill="var(--av-red)" />
        <circle cx={16.4} cy={9.6} r={1.8} fill="var(--av-yellow)" />
        <circle cx={20} cy={8.5} r={2} fill="var(--av-red)" />
        <circle cx={23.6} cy={9.6} r={1.8} fill="var(--av-blue)" />
        <circle cx={26.8} cy={12.6} r={1.9} fill="var(--av-yellow)" />
      </>
    ),
    collar: (
      <g fill="var(--av-red)">
        <path d="M17.4 31.2l.9.9-.9.9-.9-.9z" />
        <path d="M20 31.6l.9.9-.9.9-.9-.9z" />
        <path d="M22.6 31.2l.9.9-.9.9-.9-.9z" />
      </g>
    ),
  },
};

/** The publisher is the product itself, so it is the lantern rather than a person. */
function Lantern() {
  return (
    <>
      <path
        d="M16.6 12.4a3.4 3.4 0 0 1 6.8 0"
        stroke="var(--av-shirt-light)"
        strokeWidth={1.4}
        fill="none"
      />
      <rect x={15} y={12.2} width={10} height={2.4} rx={1} fill="var(--av-shirt-light)" />
      <rect x={15.8} y={14.6} width={8.4} height={11.8} rx={1.4} fill="var(--av-bg-amber)" />
      <path
        d="M20 17.4c1.6 1.6 2.4 2.9 2.4 4.3a2.4 2.4 0 0 1-4.8 0c0-1.4.8-2.7 2.4-4.3z"
        fill="var(--av-yellow)"
      />
      <rect x={14.6} y={26.4} width={10.8} height={2.6} rx={1} fill="var(--av-shirt-light)" />
    </>
  );
}

export function PersonaAvatar({
  id,
  name,
  className,
}: {
  id: string | undefined;
  name: string | undefined;
  className?: string | undefined;
}) {
  const clip = useId();
  const look = id ? LOOKS[id] : undefined;

  if (!look && id !== "publisher") {
    return (
      <span
        aria-hidden="true"
        className={clsx(
          "grid place-items-center rounded-full bg-plate-2 font-semibold leading-none text-text-2",
          className,
        )}
      >
        {(name?.trim()[0] ?? "·").toUpperCase()}
      </span>
    );
  }

  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={clsx("rounded-full", className)}>
      <clipPath id={clip}>
        <circle cx={20} cy={20} r={20} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        {look ? (
          <>
            <rect width={40} height={40} fill={look.bg} />
            {look.back}
            <rect x={17.2} y={24} width={5.6} height={6} rx={1} fill={look.skin} />
            <path d="M5 41c0-8.5 6.7-12.5 15-12.5S35 32.5 35 41z" fill={look.shirt} />
            {look.collar}
            <ellipse cx={20} cy={19} rx={7.4} ry={8.4} fill={look.skin} />
            {look.front}
            {look.eyes ?? (
              <g fill="var(--av-ink)">
                <circle cx={17.1} cy={19.6} r={0.95} />
                <circle cx={22.9} cy={19.6} r={0.95} />
              </g>
            )}
            <path
              d="M18.2 23.1q1.8 1.3 3.6 0"
              stroke="var(--av-ink)"
              strokeWidth={0.9}
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <>
            <rect width={40} height={40} fill="var(--av-bg-night)" />
            <Lantern />
          </>
        )}
      </g>
    </svg>
  );
}
