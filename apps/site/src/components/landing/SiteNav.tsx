import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ChevronDown, Menu, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { type LocalizedPage, localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { Lockup } from "../Logo";
import { isUseCasePage, MENU_USE_CASE_LINKS } from "./site-links";

interface Props {
  openAppUrl: string;
  current?: LocalizedPage | undefined;
  /** Where Request access goes. A page without its own join section sends it to /join, and a page
   * that admits anyone, such as a published deck, passes null to leave it out. */
  joinHref?: string | null | undefined;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function UseCasesMenu({ current }: { current: LocalizedPage | undefined }) {
  const { i18n } = useLingui();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: Event) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("focusin", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("focusin", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={buttonClass(
          "ghost",
          "sm",
          clsx("gap-1 pe-2", (open || isUseCasePage(current)) && "text-text", open && "bg-plate-2"),
        )}
      >
        <Trans>Use cases</Trans>
        <ChevronDown
          aria-hidden="true"
          className={clsx("text-muted transition-transform duration-150", open && "rotate-180")}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.14, ease: EASE_OUT } }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.1, ease: EASE_OUT } }}
            className="absolute start-0 top-full z-(--z-dropdown) mt-1.5 w-76 origin-top-left rounded-lg bg-plate p-1.5 edge rtl:origin-top-right"
          >
            <ul className="grid gap-0.5">
              {MENU_USE_CASE_LINKS.map((link) => (
                <li key={link.page}>
                  <a
                    href={localizedPath(link.page, i18n.locale)}
                    aria-current={current === link.page ? "page" : undefined}
                    className="grid gap-0.5 rounded-md px-3 py-2 transition-colors duration-150 hoverable:hover:bg-plate-2 aria-[current=page]:bg-plate-2"
                  >
                    <span className="text-sm font-medium text-text">{i18n._(link.label)}</span>
                    {link.blurb && (
                      <span className="text-sm text-pretty text-muted">{i18n._(link.blurb)}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// The page behind a full-screen menu should not scroll under the finger.
const lockScroll = () => {
  document.documentElement.style.overflow = "hidden";
};
const unlockScroll = () => {
  document.documentElement.style.removeProperty("overflow");
};

interface PhoneMenuProps {
  openAppUrl: string;
  current: LocalizedPage | undefined;
  joinHref: string | null;
}

function PhoneMenu({ openAppUrl, current, joinHref }: PhoneMenuProps) {
  const { t, i18n } = useLingui();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => unlockScroll, []);

  const close = () => {
    dialog.current?.close();
    unlockScroll();
  };

  const rowClass =
    "flex min-h-12 items-center rounded-md px-3 transition-colors duration-150 hoverable:hover:bg-plate-2 aria-[current=page]:bg-plate-2";

  return (
    <>
      <button
        type="button"
        aria-label={t`Open menu`}
        aria-haspopup="dialog"
        onClick={() => {
          lockScroll();
          dialog.current?.showModal();
        }}
        className="relative grid size-10 place-items-center rounded-sm text-text-2 transition-[background-color,color,scale] duration-150 before:absolute before:-inset-1 active:scale-[0.97] hoverable:hover:bg-plate-2 hoverable:hover:text-text"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        aria-label={t`Menu`}
        onClose={unlockScroll}
        className="enter-fade m-0 h-dvh max-h-none w-full max-w-none bg-canvas text-text backdrop:bg-transparent"
      >
        <div className="flex min-h-full flex-col px-5 pt-5 pb-8">
          <div className="flex items-center justify-between">
            <a
              onClick={close}
              href={localizedPath("landing", i18n.locale)}
              aria-label={t`Lymi home`}
              className="rounded-xs py-1.5"
            >
              <Lockup size={30} flicker glow />
            </a>
            <button
              type="button"
              aria-label={t`Close menu`}
              onClick={close}
              className="relative grid size-10 place-items-center rounded-sm text-text-2 transition-[background-color,color,scale] duration-150 before:absolute before:-inset-1 active:scale-[0.97] hoverable:hover:bg-plate-2 hoverable:hover:text-text"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-8 grid gap-6">
            <div>
              <p className="px-3 text-sm text-muted">
                <Trans>Use cases</Trans>
              </p>
              <ul className="mt-2 grid gap-0.5">
                {MENU_USE_CASE_LINKS.map((link) => (
                  <li key={link.page}>
                    <a
                      onClick={close}
                      href={localizedPath(link.page, i18n.locale)}
                      aria-current={current === link.page ? "page" : undefined}
                      className={clsx(rowClass, "text-xl font-medium")}
                    >
                      {i18n._(link.label)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-edge pt-6">
              <a onClick={close} href="/docs" className={clsx(rowClass, "text-xl font-medium")}>
                <Trans>Docs</Trans>
              </a>
            </div>
          </div>

          <div className="mt-auto grid gap-3 pt-10">
            <a onClick={close} href={openAppUrl} className={buttonClass("primary", "lg", "w-full")}>
              <Trans>Open Lymi</Trans>
            </a>
            {joinHref !== null && (
              <a
                onClick={close}
                href={joinHref}
                className={buttonClass("secondary", "lg", "w-full")}
              >
                <Trans>Request access</Trans>
              </a>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

/** The marketing pages' top bar. On a phone its links move into a full-screen menu. */
export function SiteNav({ openAppUrl, current, joinHref = "#join" }: Props) {
  const { t, i18n } = useLingui();

  return (
    <MotionConfig reducedMotion="user">
      <nav
        aria-label={t`Main navigation`}
        className="mx-auto flex max-w-[1120px] items-center justify-between px-5 pt-5 @2xl:px-10 @2xl:pt-7"
      >
        <a
          href={localizedPath("landing", i18n.locale)}
          aria-label={t`Lymi home`}
          className="rounded-xs py-1.5"
        >
          <Lockup size={30} flicker glow />
        </a>
        <div className="hidden items-center gap-1 @2xl:flex">
          <UseCasesMenu current={current} />
          <a href="/docs" className={buttonClass("ghost", "sm")}>
            <Trans>Docs</Trans>
          </a>
          {joinHref !== null && (
            <a href={joinHref} className={buttonClass("ghost", "sm")}>
              <Trans>Request access</Trans>
            </a>
          )}
          <a href={openAppUrl} className={buttonClass("secondary", "sm", "ms-1")}>
            <Trans>Open Lymi</Trans>
          </a>
        </div>
        <div className="flex items-center gap-2 @2xl:hidden">
          <a href={openAppUrl} className={buttonClass("secondary", "md")}>
            <Trans>Open Lymi</Trans>
          </a>
          <PhoneMenu openAppUrl={openAppUrl} current={current} joinHref={joinHref} />
        </div>
      </nav>
    </MotionConfig>
  );
}
