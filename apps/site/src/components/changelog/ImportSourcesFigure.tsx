import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ChevronRight } from "lucide-react";

/** Settings' list of apps to import from, with Noji and Quizlet lit beside the older two. */
export function ImportSourcesFigure() {
  const { t } = useLingui();
  const sources = [
    { name: "Anki", detail: t`An .apkg or .colpkg file from Anki, AnkiDroid or AnkiMobile` },
    { name: "Mochi", detail: t`A .mochi file from Mochi` },
    { name: "Noji", detail: t`An .ofc file from Noji`, added: true },
    { name: "Quizlet", detail: t`Text you copy from a Quizlet set`, added: true },
  ];
  return (
    <ul aria-hidden="true" className="mx-auto max-w-[400px] rounded-xl bg-plate edge">
      {sources.map((source) => (
        <li
          key={source.name}
          className={clsx(
            "flex min-h-16 items-center gap-4 px-4 py-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-edge",
            !source.added && "opacity-45",
          )}
        >
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="text-md font-medium text-ink">{source.name}</span>
            <span className="text-sm text-ink-muted">{source.detail}</span>
          </span>
          <span className="grid size-8 place-items-center rounded-full bg-plate-nested text-ink edge-inset">
            <ChevronRight className="size-4 rtl:-scale-x-100" />
          </span>
        </li>
      ))}
    </ul>
  );
}
