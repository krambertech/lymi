import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import { Lantern } from "../Lantern";
import { EASE } from "../landing/playback";
import { RollingNumber } from "../RollingNumber";
import { useSceneLoop } from "./scene-loop";

const SPRING = { type: "spring", duration: 0.5, bounce: 0.16 } as const;
const PANEL_SHADOW = "shadow-[0_24px_56px_-16px_oklch(0.2_0.03_60/0.5)]";

function Panel({ typed, added }: { typed: boolean; added: boolean }) {
  return (
    <div className={clsx("overflow-hidden rounded-xl bg-plate edge-strong", PANEL_SHADOW)}>
      <div className="flex h-14 items-center gap-2 ps-4.5 pe-3">
        <span lang="es" className="min-w-0 flex-1 truncate text-xl font-medium text-ink">
          {typed ? "ventana" : ""}
          <span className="ms-px inline-block h-5 w-px translate-y-0.5 bg-ink" />
        </span>
        <span className="flex shrink-0 items-center gap-1 px-1.5 py-0.5 text-sm text-ink-muted">
          Spanish
          <ChevronDown className="size-3.5" />
        </span>
      </div>
      <AnimatePresence initial={false}>
        {added && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="flex items-center gap-2 overflow-hidden border-t border-edge text-sm text-ink-secondary"
          >
            <span className="flex items-center gap-2 px-4.5 py-2.5">
              <Check className="size-4 text-state-known" strokeWidth={2.4} />
              <Trans>Added to Spanish</Trans>
            </span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const LAPTOP = {
  lit: 400,
  keys: 1500,
  panel: 2000,
  added: 2900,
  fly: 3400,
  close: 3500,
  count: 3950,
} as const;

/** A MacBook with Lymi's icon on its screen: quick add opens, and the word flies up to the lantern. */
export function MacBookFigure() {
  const root = useRef<HTMLDivElement>(null);
  const { at, still } = useSceneLoop(LAPTOP, 5600, root);
  const open = at("panel") && (still || !at("close"));
  const flying = !still && at("fly") && !at("count");
  return (
    <div ref={root} aria-hidden="true" className="relative h-[412px] w-[660px] overflow-hidden">
      <div className="absolute start-[80px] top-[30px] h-[322px] w-[500px] rounded-t-[20px] bg-[oklch(0.17_0.008_60)] p-2.5 shadow-[0_0_0_1px_oklch(0.32_0.008_60)]">
        <div
          data-theme="dark"
          className="relative h-full overflow-hidden rounded-t-[11px] bg-canvas"
        >
          <div
            className={clsx(
              "absolute inset-0 transition-opacity duration-700",
              at("lit") ? "opacity-100" : "opacity-0",
            )}
            style={{
              background:
                "radial-gradient(300px 240px at 86% 12px, var(--lantern-glow), transparent 75%)",
            }}
          />
          <div className="absolute start-1/2 top-0 z-10 h-3.5 w-[76px] -translate-x-1/2 rounded-b-md bg-[oklch(0.17_0.008_60)]" />
          <div className="absolute inset-x-0 top-0 flex h-[22px] items-center gap-3 px-3 text-xs text-ink">
            <span className="font-semibold">Lymi</span>
            <span>File</span>
            <span>Edit</span>
            <span>View</span>
            <span className="ms-auto flex items-center gap-1 font-medium">
              <Lantern className="size-4" glow={at("lit")} flicker={at("lit")} />
              <RollingNumber value={at("count") ? 13 : 12} className="tabular-nums" />
            </span>
          </div>
          <motion.img
            src="/mac/icon.png"
            alt=""
            width={84}
            height={84}
            className="absolute start-1/2 top-[52px] size-[84px] -translate-x-1/2"
            animate={{ scale: open ? 0.92 : 1 }}
            transition={SPRING}
          />
          <AnimatePresence initial={false}>
            {at("keys") && !at("panel") && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.16 }}
                className="absolute inset-x-0 top-[168px] flex justify-center gap-1.5"
              >
                {["⌃", "⌥", "L"].map((key) => (
                  <kbd
                    key={key}
                    className="grid size-11 place-items-center rounded-lg bg-plate font-sans text-xl font-medium text-ink edge-strong"
                  >
                    {key}
                  </kbd>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={SPRING}
                className="absolute inset-x-[62px] top-[156px]"
              >
                <Panel typed added={at("added")} />
              </motion.div>
            )}
          </AnimatePresence>
          {flying && (
            <motion.span
              lang="es"
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{ x: 296, y: -166, scale: 0.3, opacity: 0.4 }}
              transition={{ duration: 0.5, ease: [0.5, 0, 0.2, 1] }}
              className="absolute start-[72px] top-[166px] rounded-md bg-amber px-2 py-1 text-xl font-medium text-amber-ink"
            >
              ventana
            </motion.span>
          )}
        </div>
      </div>
      <div className="absolute start-[28px] top-[352px] h-[18px] w-[604px] rounded-b-[16px] bg-[linear-gradient(oklch(0.9_0.004_80),oklch(0.72_0.006_80))] shadow-[0_18px_28px_-12px_oklch(0.2_0.03_60/0.45)]">
        <div className="mx-auto h-[7px] w-[96px] rounded-b-lg bg-[oklch(0.62_0.006_80)]" />
      </div>
    </div>
  );
}
