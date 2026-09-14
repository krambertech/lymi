import { ArrowRight, CornerDownLeft, Moon, Shuffle, Sunrise } from "lucide-react";
import type { ReactNode } from "react";

interface Step {
  icon: ReactNode;
  ask: ReactNode;
  take: ReactNode;
}

/**
 * The order each attempt checks, as a ladder: a yes stops at that rung, a no falls to the next.
 * On a phone the answer sits under its question instead of beside it.
 */
export function Precedence({ carryOverEvery }: { carryOverEvery: number }) {
  const steps: Step[] = [
    {
      icon: <CornerDownLeft className="size-4" aria-hidden="true" />,
      ask: "Has a missed card waited out its gap?",
      take: "Show that card",
    },
    {
      icon: <Sunrise className="size-4" aria-hidden="true" />,
      ask: (
        <>
          Is a card still learning from an earlier day, and have {carryOverEvery} attempts passed
          since the last one?
        </>
      ),
      take: "Show that card",
    },
    {
      icon: <Shuffle className="size-4" aria-hidden="true" />,
      ask: "Are reviews or new cards left?",
      take: "Ordinary draw",
    },
    {
      icon: <CornerDownLeft className="size-4" aria-hidden="true" />,
      ask: "Is a missed card still waiting?",
      take: "Show the earliest one early",
    },
  ];

  return (
    <ol className="grid list-none gap-0 !ps-0" aria-label="What each attempt checks, in order">
      {steps.map((s, i) => (
        <li key={String(i)} className="!m-0 grid grid-cols-[2rem_1fr] gap-x-3">
          <div className="flex flex-col items-center">
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-plate-2 text-xs font-semibold tabular-nums text-text"
            >
              {i + 1}
            </span>
            <span aria-hidden="true" className="w-px flex-1 bg-edge-2" />
          </div>
          <div className="grid gap-2 pb-5 pt-1 sm:grid-cols-[1fr_auto_14rem] sm:items-start sm:gap-3">
            <p className="!m-0 text-base text-text">{s.ask}</p>
            <span
              className="hidden items-center gap-1.5 pt-0.5 text-xs text-muted sm:flex"
              aria-hidden="true"
            >
              yes
              <ArrowRight className="size-3.5" />
            </span>
            <p className="!m-0 flex items-center gap-2 self-start rounded-sm bg-plate px-2.5 py-1.5 text-sm font-medium text-text edge">
              <span className="text-muted">{s.icon}</span>
              <span>
                <span className="sr-only">If yes: </span>
                {s.take}
              </span>
            </p>
            {i < steps.length - 1 && (
              <p className="!m-0 text-xs text-muted" aria-hidden="true">
                If not, check the next one
              </p>
            )}
          </div>
        </li>
      ))}
      <li className="!m-0 grid grid-cols-[2rem_1fr] gap-x-3">
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-full edge">
          <Moon className="size-4 text-muted" />
        </span>
        <p className="!m-0 pt-1.5 text-base text-text">Nothing is left. The day is done.</p>
      </li>
    </ol>
  );
}
