import { Trans, useLingui } from "@lingui/react/macro";
import { Table2, X } from "lucide-react";
import { type CSSProperties, useEffect, useId, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { meaningOf, type UseId, type WordId } from "../../lib/learn/form-map";
import { mapReducer, startMap } from "../../lib/learn/form-map-state";
import { stopSound } from "../../lib/learn/player";
import { buttonClass } from "../Button";
import { FormTable } from "./FormTable";
import { useHoldInPlace } from "./hold";

interface SheetProps {
  word: WordId;
  use?: UseId | undefined;
  known?: readonly UseId[] | undefined;
  hue?: string | undefined;
  onClose: () => void;
}

export function FormSheet({ word, use, known, hue, onClose }: SheetProps) {
  const { t, i18n } = useLingui();
  const [state, dispatch] = useReducer(mapReducer, { word, use, view: "table" }, startMap);
  const dialog = useRef<HTMLDialogElement>(null);
  const hold = useHoldInPlace();
  const title = useId();

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const opener = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    const onScrim = (event: MouseEvent) => {
      if (event.target === node) node.close();
    };
    node.addEventListener("click", onScrim);
    node.showModal();
    const row = node.querySelector<HTMLElement>("[aria-expanded='true']");
    row?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: "center", behavior: "instant" });
    return () => {
      node.removeEventListener("click", onScrim);
      stopSound();
      root.style.overflow = overflow;
      if (node.open) node.close();
      opener?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={title}
      onClose={onClose}
      style={{ "--h": hue } as CSSProperties}
      className="learn learn-sheet"
    >
      <div className="learn-sheet-panel">
        <header className="flex items-center gap-3 border-b border-(--form-faint) py-3 ps-5 pe-3">
          <h2 id={title} className="me-auto min-w-0">
            <span lang="et" className="text-2xl font-semibold tracking-tight">
              {word}
            </span>{" "}
            <span className="text-md text-ink-secondary">{i18n._(meaningOf(word))}</span>
          </h2>
          <button
            type="button"
            aria-label={t`Close`}
            onClick={() => dialog.current?.close()}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink-secondary transition-colors duration-150 hoverable:hover:bg-(--form-soft) hoverable:hover:text-ink"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pt-4 pb-8">
          <FormTable
            word={state.word}
            open={state.status === "use" ? state.use : null}
            onPress={(next, node) => {
              hold(node);
              dispatch({ type: "use", use: next });
            }}
            taught={(each) => !known || known.includes(each)}
          />
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

type Sheet = { status: "closed" } | { status: "open"; hue: string };

interface LinkProps {
  word: WordId;
  use?: UseId | undefined;
  known?: readonly UseId[] | undefined;
}

export function FormSheetButton({ word, use, known }: LinkProps) {
  const [sheet, setSheet] = useState<Sheet>({ status: "closed" });
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={(event) => {
          event.currentTarget.focus();
          const hue = getComputedStyle(event.currentTarget).getPropertyValue("--h").trim();
          setSheet({ status: "open", hue });
        }}
        className={buttonClass("secondary", "md")}
      >
        <Table2 aria-hidden="true" />
        <span>
          <Trans>
            Forms of <span lang="et">{word}</span>
          </Trans>
        </span>
      </button>
      {sheet.status === "open" && (
        <FormSheet
          word={word}
          use={use}
          known={known}
          hue={sheet.hue || undefined}
          onClose={() => setSheet({ status: "closed" })}
        />
      )}
    </>
  );
}
