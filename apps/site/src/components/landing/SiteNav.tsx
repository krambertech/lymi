import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type Transition,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { explorePath } from "../../lib/explore";
import type { MenuShelf, MenuShelves } from "../../lib/menu-shelves";
import { signUpUrl } from "../../lib/origins";
import { type LocalizedPage, localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { shelfLabel } from "../explore/explore-labels";
import { Lockup } from "../Logo";
import {
  isUseCasePage,
  linksIn,
  POPULAR_LINKS,
  USE_CASE_GROUPS,
  type UseCaseLink,
} from "./site-links";

interface Props {
  openAppUrl: string;
  current?: LocalizedPage | undefined;
  /** Where Get started goes. A page that admits anyone, such as a published deck, passes
   * null to leave the control out. */
  signUpHref?: string | null | undefined;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function UseCaseMark({ link, size = "md" }: { link: UseCaseLink; size?: "sm" | "md" }) {
  const Icon = link.icon;
  return (
    <span
      aria-hidden="true"
      data-hue={link.hue}
      className={clsx(
        "use-case-mark grid shrink-0 place-items-center",
        size === "sm" ? "size-8 rounded-sm" : "size-9 rounded-md",
      )}
    >
      <Icon
        className={clsx("text-text-2", size === "sm" ? "size-4" : "size-[1.125rem]")}
        strokeWidth={1.75}
      />
    </span>
  );
}

let shelvesRequest: { locale: string; promise: Promise<MenuShelves | null> } | null = null;

/** The live catalogue's shelves, fetched once per page when a menu first needs them. */
function loadShelves(locale: string): Promise<MenuShelves | null> {
  if (shelvesRequest?.locale !== locale) {
    const promise = fetch(`/explore/shelves.json?locale=${locale}`)
      .then((response) => (response.ok ? (response.json() as Promise<MenuShelves>) : null))
      .catch(() => null);
    shelvesRequest = { locale, promise };
  }
  return shelvesRequest.promise;
}

/** Undefined while loading, null when the catalogue could not be read. */
function useShelves(wanted: boolean): MenuShelves | null | undefined {
  const { i18n } = useLingui();
  const [shelves, setShelves] = useState<MenuShelves | null | undefined>(undefined);
  useEffect(() => {
    if (!wanted) return;
    let live = true;
    void loadShelves(i18n.locale).then((loaded) => {
      if (live) setShelves(loaded);
    });
    return () => {
      live = false;
    };
  }, [wanted, i18n.locale]);
  return shelves;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where an element sits in its offset parent, as a translation from the start edge. */
function rectIn(el: HTMLElement): Rect {
  const parent = el.offsetParent as HTMLElement | null;
  const rtl = getComputedStyle(el).direction === "rtl";
  return {
    x: rtl && parent ? el.offsetLeft + el.offsetWidth - parent.clientWidth : el.offsetLeft,
    y: el.offsetTop,
    width: el.offsetWidth,
    height: el.offsetHeight,
  };
}

interface FillProps {
  rect: Rect | null;
  transition: Transition;
  className: string;
}

/** One highlight that travels to whatever it is given and fades out when given nothing. */
function Fill({ rect, transition, className }: FillProps) {
  return (
    <AnimatePresence>
      {rect && (
        <motion.span
          aria-hidden="true"
          className={clsx("pointer-events-none absolute start-0 top-0", className)}
          initial={{ opacity: 0, ...rect }}
          animate={{ opacity: 1, ...rect }}
          exit={{ opacity: 0, transition: { duration: 0.1, ease: EASE_OUT } }}
          transition={{ ...transition, opacity: { duration: 0.15, ease: EASE_OUT } }}
        />
      )}
    </AnimatePresence>
  );
}

const ROW_GLIDE: Transition = { duration: 0.15, ease: EASE_OUT };

/** Rows that share one hover fill, sliding between them; each group has its own, so it fades
 * rather than slides across a heading. */
function HoverRows({
  className,
  fillClass = "rounded-md",
  children,
}: {
  className?: string;
  fillClass?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [row, setRow] = useState<{ el: HTMLElement; rect: Rect } | null>(null);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: it only follows the pointer for the fill; the rows are the links.
    <div
      className={clsx("relative", className)}
      onPointerOver={(e) => {
        if (e.pointerType !== "mouse") return;
        const el = (e.target as Element).closest<HTMLElement>("[data-row]");
        if (el && el !== row?.el && e.currentTarget.contains(el)) setRow({ el, rect: rectIn(el) });
      }}
      onPointerLeave={() => setRow(null)}
      // Keyboard focus draws its own ring, so the pointer's fill steps aside.
      onKeyDown={() => setRow(null)}
    >
      <Fill
        rect={row?.rect ?? null}
        transition={reduce ? { duration: 0 } : ROW_GLIDE}
        className={clsx("bg-plate-2", fillClass)}
      />
      {children}
    </div>
  );
}

const chipClass =
  "rounded-full bg-plate-2 px-2.5 py-1 text-sm text-text-2 transition-colors duration-150 hoverable:hover:bg-hover hoverable:hover:text-text";

// As tall as a chip: its padding round one line of its text.
const chipPlaceholderClass = "h-[calc(1lh+0.5rem)] w-24 rounded-full bg-plate-2 text-sm";

function PopularLinks({ className }: { className?: string }) {
  const { i18n } = useLingui();
  return (
    <div className={clsx("flex flex-wrap items-center gap-1.5", className)}>
      {linksIn(POPULAR_LINKS, i18n.locale).map((link) => (
        <a key={link.href("en")} href={link.href(i18n.locale)} className={chipClass}>
          {i18n._(link.label)}
        </a>
      ))}
    </div>
  );
}

/** Hides the names that would start a second line, so Popular stays one line in every language. */
function useOneLine() {
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const hideOverflow = () => {
      const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-row]"));
      for (const row of rows) row.hidden = false;
      const top = rows[0]?.offsetTop;
      for (const row of rows) row.hidden = row.offsetTop !== top;
    };
    hideOverflow();
    const observer = new ResizeObserver(hideOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return list;
}

function MenuPopular() {
  const { i18n } = useLingui();
  const list = useOneLine();
  return (
    <div className="mx-1 mt-1.5 flex items-center gap-2 border-t border-edge px-1.5 pt-2.5 pb-1">
      <p className="shrink-0 text-sm text-muted">
        <Trans>Popular</Trans>
      </p>
      <div ref={list} className="min-w-0 flex-1">
        <HoverRows fillClass="rounded-full" className="flex flex-wrap items-center">
          {linksIn(POPULAR_LINKS, i18n.locale).map((link) => (
            <a
              key={link.href("en")}
              data-row
              href={link.href(i18n.locale)}
              className="relative rounded-full px-2 py-1 text-sm whitespace-nowrap text-text-2 transition-colors duration-150 hoverable:hover:text-text"
            >
              {i18n._(link.label)}
            </a>
          ))}
        </HoverRows>
      </div>
    </div>
  );
}

function UseCasesPanel({ current }: { current: LocalizedPage | undefined }) {
  const { i18n } = useLingui();
  return (
    <>
      <div className="grid grid-cols-2 gap-1">
        {USE_CASE_GROUPS.map((group) => (
          <HoverRows key={group.title.id}>
            <p className="px-2.5 pt-2 pb-1.5 text-sm text-muted">{i18n._(group.title)}</p>
            <ul className="grid gap-0.5">
              {group.links.map((link) => (
                <li key={link.page}>
                  <a
                    data-row
                    href={localizedPath(link.page, i18n.locale)}
                    aria-current={current === link.page ? "page" : undefined}
                    className="relative flex items-center gap-3 rounded-md px-2.5 py-1.5 text-base font-medium text-text aria-[current=page]:bg-plate-2"
                  >
                    <UseCaseMark link={link} size="sm" />
                    {i18n._(link.label)}
                  </a>
                </li>
              ))}
            </ul>
          </HoverRows>
        ))}
      </div>
      <MenuPopular />
    </>
  );
}

function ShelfRow({ shelf }: { shelf: MenuShelf }) {
  const { i18n } = useLingui();
  return (
    <a
      data-row
      href={shelf.path}
      className="relative flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-base text-text"
    >
      <span aria-hidden="true" data-hue={shelf.hue} className="shelf-swatch size-3 rounded-[4px]" />
      <span className="truncate">{shelfLabel(i18n, shelf)}</span>
      <span className="text-sm text-muted">{shelf.decks}</span>
    </a>
  );
}

function ShelfPlaceholder({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, at) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows have nothing else to key on
        <span key={at} className="flex h-8 items-center px-2.5" aria-hidden="true">
          <span className="h-3 w-20 rounded-xs bg-plate-2" />
        </span>
      ))}
    </>
  );
}

function ExplorePanel({ shelves }: { shelves: MenuShelves | null | undefined }) {
  const { i18n } = useLingui();
  // Without shelves to list, the menu is the one link to the whole catalogue.
  const listed = shelves === undefined || (shelves && shelves.languages.length > 0);
  const subjects = shelves === undefined || (shelves && shelves.subjects.length > 0);

  return (
    <>
      {listed && (
        <div
          className={clsx("grid gap-2", subjects && "grid-cols-[3fr_2fr]")}
          aria-busy={shelves === undefined}
        >
          <div>
            <p className="px-2.5 pt-2 pb-1.5 text-sm text-muted">
              <Trans>Languages</Trans>
            </p>
            <HoverRows className="grid grid-cols-2">
              {shelves ? (
                shelves.languages.map((shelf) => <ShelfRow key={shelf.key} shelf={shelf} />)
              ) : (
                <ShelfPlaceholder rows={8} />
              )}
            </HoverRows>
          </div>
          {subjects && (
            <div>
              <p className="px-2.5 pt-2 pb-1.5 text-sm text-muted">
                <Trans>Subjects</Trans>
              </p>
              <HoverRows>
                {shelves ? (
                  shelves.subjects.map((shelf) => <ShelfRow key={shelf.key} shelf={shelf} />)
                ) : (
                  <ShelfPlaceholder rows={5} />
                )}
              </HoverRows>
            </div>
          )}
        </div>
      )}
      <a
        href={explorePath(i18n.locale)}
        className={clsx(
          "group flex items-center gap-1.5 rounded-sm px-2.5 py-2 text-base font-medium text-text transition-colors duration-150 hoverable:hover:bg-plate-2",
          listed && "mt-1.5",
        )}
      >
        <Trans>Browse all decks</Trans>
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition-transform duration-200 ease-out hoverable:group-hover:translate-x-0.5"
        />
      </a>
    </>
  );
}

const MENUS = ["use_cases_menu", "explore_menu"] as const;
type MenuPlace = (typeof MENUS)[number];

/** A pointer must rest this long on a closed menu's button to open it, so passing over does not. */
const OPEN_DELAY_MS = 80;
/** How long the pointer may stray before a menu it opened closes: enough to cross the gap or cut a corner. */
const CLOSE_DELAY_MS = 220;
/** A click this soon after hover opened the menu confirms it instead of closing it again. */
const CLICK_GRACE_MS = 450;
/** How far a menu's contents travel when the panel turns to its neighbour. */
const TURN_PX = 24;

const TRIGGER_GLIDE: Transition = { type: "spring", duration: 0.34, bounce: 0.12 };
const SURFACE_GLIDE: Transition = { duration: 0.28, ease: EASE_OUT };
const STILL: Transition = { duration: 0 };

interface Turn {
  /** -1 toward the start, 1 toward the end, 0 when the panel first opens. */
  direction: number;
  still: boolean;
}

const panelVariants: Variants = {
  shown: (still: boolean) => ({
    opacity: 1,
    scale: 1,
    transition: still ? STILL : { duration: 0.14, ease: EASE_OUT },
  }),
  hidden: (still: boolean) => ({
    opacity: 0,
    scale: 0.96,
    transition: still ? STILL : { duration: 0.1, ease: EASE_OUT },
  }),
};

const contentVariants: Variants = {
  enter: ({ direction }: Turn) => ({ opacity: 0, x: direction * TURN_PX }),
  center: ({ still }: Turn) => ({
    opacity: 1,
    x: 0,
    transition: still ? STILL : { duration: 0.24, ease: EASE_OUT },
  }),
  exit: ({ direction, still }: Turn) => ({
    opacity: 0,
    x: -direction * TURN_PX,
    transition: still ? STILL : { duration: 0.14, ease: EASE_OUT },
  }),
};

type Opener = "pointer" | "press" | "key";

function linksOf(surface: HTMLElement | null, place: MenuPlace) {
  return Array.from(surface?.querySelectorAll<HTMLElement>(`[data-menu="${place}"] a[href]`) ?? []);
}

/**
 * The top bar's two menus share one panel. A mouse opens a menu by resting on its button and
 * closes it by leaving; a click, a tap or a key opens it until a press outside, Escape or
 * another click. Moving between the buttons turns the panel to the other menu.
 */
function DesktopMenus({ current }: { current: LocalizedPage | undefined }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<MenuPlace | null>(null);
  const [turn, setTurn] = useState<Turn>({ direction: 0, still: false });
  const [size, setSize] = useState<{ width: number; height: number; glide: boolean } | null>(null);
  const [triggerRect, setTriggerRect] = useState<Rect | null>(null);
  const [wantShelves, setWantShelves] = useState(false);
  const shelves = useShelves(wantShelves);

  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<MenuPlace, HTMLButtonElement>());
  const activeRef = useRef<MenuPlace | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const byHover = useRef(false);
  const openedAt = useRef(0);
  const pointerType = useRef("mouse");
  // After a click closes a menu under the pointer, hover leaves it shut until the pointer goes.
  const shutUnder = useRef<MenuPlace | null>(null);
  const focusFirst = useRef(false);
  const baseId = useId();
  const panelId = (place: MenuPlace) => `${baseId}${place}`;
  const still = turn.still || reduce === true;

  const show = useCallback((place: MenuPlace | null, opener: Opener) => {
    window.clearTimeout(timer.current);
    const previous = activeRef.current;
    if (place === previous) return;
    activeRef.current = place;
    byHover.current = opener === "pointer";
    let direction = 0;
    if (previous && place) {
      const rtl = document.dir === "rtl" ? -1 : 1;
      direction = Math.sign(MENUS.indexOf(place) - MENUS.indexOf(previous)) * rtl;
    }
    // A keyboard action never animates.
    setTurn({ direction, still: opener === "key" });
    setActive(place);
    if (place) setWantShelves(true);
    else setSize(null);
  }, []);

  const scheduleClose = (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(timer.current);
    if (!activeRef.current || !byHover.current) return;
    timer.current = window.setTimeout(() => show(null, "pointer"), CLOSE_DELAY_MS);
  };
  const cancelClose = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse") window.clearTimeout(timer.current);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!active) return;
    const outside = (opener: Opener) => (e: Event) => {
      if (!root.current?.contains(e.target as Node)) show(null, opener);
    };
    const onPointer = outside("press");
    const onFocus = outside("key");
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const place = activeRef.current;
      show(null, "key");
      if (place) triggers.current.get(place)?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("keydown", onKey);
    };
  }, [active, show]);

  useLayoutEffect(() => {
    const trigger = active ? triggers.current.get(active) : undefined;
    setTriggerRect(trigger ? rectIn(trigger) : null);
    const content = surface.current?.querySelector<HTMLElement>(`[data-menu="${active}"]`);
    if (!content) return;
    const measure = () =>
      setSize((was) =>
        was?.width === content.offsetWidth && was.height === content.offsetHeight
          ? was
          : { width: content.offsetWidth, height: content.offsetHeight, glide: was !== null },
      );
    measure();
    // The shelves arrive after Explore opens, and the panel grows to them.
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    if (focusFirst.current && active) {
      focusFirst.current = false;
      linksOf(surface.current, active)[0]?.focus();
    }
    return () => observer.disconnect();
  }, [active]);

  const onPanelKey = (e: ReactKeyboardEvent) => {
    const place = activeRef.current;
    if (!place || e.key !== "Tab") return;
    const items = linksOf(surface.current, place);
    if (e.shiftKey && document.activeElement === items[0]) {
      e.preventDefault();
      triggers.current.get(place)?.focus();
    } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
      // The panel sits after both buttons, so Tab out of the first menu goes on to the second.
      const next = MENUS[MENUS.indexOf(place) + 1];
      if (!next) return;
      e.preventDefault();
      show(null, "key");
      triggers.current.get(next)?.focus();
    }
  };

  const trigger = (place: MenuPlace, label: ReactNode, current?: boolean) => {
    const open = active === place;
    return (
      <button
        key={place}
        ref={(el) => {
          if (el) triggers.current.set(place, el);
          else triggers.current.delete(place);
        }}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId(place) : undefined}
        onFocus={() => setWantShelves(true)}
        onPointerDown={(e) => {
          pointerType.current = e.pointerType;
        }}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse") return;
          setWantShelves(true);
          if (shutUnder.current === place) return;
          window.clearTimeout(timer.current);
          if (activeRef.current) {
            show(place, "pointer");
            return;
          }
          timer.current = window.setTimeout(() => {
            openedAt.current = performance.now();
            show(place, "pointer");
          }, OPEN_DELAY_MS);
        }}
        onPointerLeave={(e) => {
          if (shutUnder.current === place) shutUnder.current = null;
          scheduleClose(e);
        }}
        onClick={(e) => {
          const opener: Opener =
            e.detail === 0 ? "key" : pointerType.current === "mouse" ? "pointer" : "press";
          if (activeRef.current !== place) {
            if (opener === "pointer") openedAt.current = performance.now();
            show(place, opener);
            return;
          }
          // Hover opened it a moment ago; this click is the same intent, not a second one.
          if (opener === "pointer" && performance.now() - openedAt.current < CLICK_GRACE_MS) return;
          show(null, opener);
          if (opener === "pointer") shutUnder.current = place;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (activeRef.current === place) linksOf(surface.current, place)[0]?.focus();
            else {
              focusFirst.current = true;
              show(place, "key");
            }
          } else if (e.key === "Tab" && !e.shiftKey && open) {
            const first = linksOf(surface.current, place)[0];
            if (!first) return;
            e.preventDefault();
            first.focus();
          }
        }}
        className={buttonClass(
          "ghost",
          "sm",
          clsx(
            "gap-1",
            (open || current) && "text-text",
            // While the panel is open the shared fill marks the button, so the hover's own stays off.
            active && "hoverable:hover:bg-transparent",
          ),
        )}
      >
        {label}
        <ChevronDown
          data-icon="inline-end"
          aria-hidden="true"
          className={clsx(
            "text-muted transition-transform duration-150 ease-out",
            open && "rotate-180",
          )}
        />
      </button>
    );
  };

  return (
    <div ref={root} className="contents">
      <Fill
        rect={triggerRect}
        transition={still ? STILL : TRIGGER_GLIDE}
        className="rounded-sm bg-plate-2"
      />
      {trigger("use_cases_menu", <Trans>Use cases</Trans>, isUseCasePage(current))}
      {trigger("explore_menu", <Trans>Explore</Trans>)}
      <AnimatePresence custom={still}>
        {active && (
          <motion.div
            key="panel"
            data-site-menu-panel
            custom={still}
            variants={panelVariants}
            initial={{ opacity: 0, scale: 0.94 }}
            animate="shown"
            exit="hidden"
            onPointerEnter={cancelClose}
            onPointerLeave={scheduleClose}
            onKeyDown={onPanelKey}
            // The top padding bridges the gap under the buttons, so crossing it keeps the panel.
            className="absolute end-0 top-full z-(--z-dropdown) origin-top-right pt-1.5 rtl:origin-top-left"
          >
            <motion.div
              ref={surface}
              initial={false}
              animate={{ width: size?.width ?? 0, height: size?.height ?? 0 }}
              transition={size?.glide && !still ? SURFACE_GLIDE : STILL}
              className="relative overflow-hidden rounded-lg bg-plate edge"
            >
              <AnimatePresence initial={false} custom={turn}>
                <motion.div
                  key={active}
                  id={panelId(active)}
                  data-menu={active}
                  data-nav={active}
                  custom={turn}
                  variants={contentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className={clsx(
                    "absolute end-0 top-0 max-w-[calc(100cqw-2.5rem)] p-1.5",
                    active === "use_cases_menu" ? "w-[36rem]" : "w-[33rem]",
                  )}
                >
                  {active === "use_cases_menu" ? (
                    <UseCasesPanel current={current} />
                  ) : (
                    <ExplorePanel shelves={shelves} />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
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
  signUpHref: string | null;
}

/** The phone menu's Explore row shows this many language shelves. */
const PHONE_SHELVES = 6;

function PhoneMenu({ openAppUrl, current, signUpHref }: PhoneMenuProps) {
  const { t, i18n } = useLingui();
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const shelves = useShelves(opened);

  useEffect(() => unlockScroll, []);

  const close = () => {
    dialog.current?.close();
    unlockScroll();
  };

  const rowClass =
    "flex min-h-12 items-center rounded-md px-3 transition-colors duration-150 hoverable:hover:bg-plate-2 aria-[current=page]:bg-plate-2";
  const headingClass = "px-3 text-sm text-muted";

  return (
    <>
      <button
        type="button"
        aria-label={t`Open menu`}
        aria-haspopup="dialog"
        onClick={() => {
          lockScroll();
          setOpened(true);
          dialog.current?.showModal();
        }}
        className="relative grid size-10 place-items-center rounded-sm text-text-2 transition-[background-color,color,scale] duration-150 before:absolute before:-inset-1 active:scale-[0.97] hoverable:hover:bg-plate-2 hoverable:hover:text-text"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        aria-label={t`Menu`}
        data-nav="phone_menu"
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

          <div className="mt-6 grid gap-6">
            {USE_CASE_GROUPS.map((group) => (
              <div key={group.title.id}>
                <p className={headingClass}>{i18n._(group.title)}</p>
                <ul className="mt-1.5 grid gap-0.5">
                  {group.links.map((link) => (
                    <li key={link.page}>
                      <a
                        onClick={close}
                        href={localizedPath(link.page, i18n.locale)}
                        aria-current={current === link.page ? "page" : undefined}
                        className={clsx(rowClass, "gap-3 py-1 text-lg font-medium")}
                      >
                        <UseCaseMark link={link} size="sm" />
                        {i18n._(link.label)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <p className={headingClass}>
                <Trans>Popular</Trans>
              </p>
              <PopularLinks className="mt-2.5 px-3" />
            </div>
            <div className="border-t border-edge pt-6">
              <p className={headingClass}>
                <Trans>Explore</Trans>
              </p>
              {/* Placeholders hold the shelves' room while they load, so the links below barely move. */}
              {shelves === undefined && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 px-3" aria-hidden="true">
                  {Array.from({ length: PHONE_SHELVES }, (_, at) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: placeholder chips have nothing else to key on
                    <span key={at} className={chipPlaceholderClass} />
                  ))}
                </div>
              )}
              {shelves && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 px-3">
                  {shelves.languages.slice(0, PHONE_SHELVES).map((shelf) => (
                    <a
                      key={shelf.key}
                      href={shelf.path}
                      onClick={close}
                      className={clsx(chipClass, "inline-flex items-center gap-1.5")}
                    >
                      <span
                        aria-hidden="true"
                        data-hue={shelf.hue}
                        className="shelf-swatch size-2.5 rounded-[3px]"
                      />
                      {shelfLabel(i18n, shelf)}
                    </a>
                  ))}
                </div>
              )}
              <div className="mt-1.5 grid gap-0.5">
                <a
                  onClick={close}
                  href={explorePath(i18n.locale)}
                  className={clsx(rowClass, "text-lg font-medium")}
                >
                  <Trans>Browse all decks</Trans>
                </a>
                <a onClick={close} href="/docs" className={clsx(rowClass, "text-lg font-medium")}>
                  <Trans>Docs</Trans>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-auto grid gap-3 pt-10">
            {signUpHref !== null && (
              <a
                onClick={close}
                href={signUpHref}
                className={buttonClass("primary", "lg", "w-full")}
              >
                <Trans>Get started</Trans>
              </a>
            )}
            <a
              onClick={close}
              href={openAppUrl}
              className={buttonClass(signUpHref === null ? "primary" : "secondary", "lg", "w-full")}
            >
              <Trans>Sign in</Trans>
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** The marketing pages' top bar. On a phone its links move into a full-screen menu. */
export function SiteNav({ openAppUrl, current, signUpHref = signUpUrl() }: Props) {
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
        <div className="relative hidden items-center gap-1 @2xl:flex">
          <DesktopMenus current={current} />
          <a href="/docs" className={buttonClass("ghost", "sm")}>
            <Trans>Docs</Trans>
          </a>
          <a href={openAppUrl} className={buttonClass("ghost", "sm")}>
            <Trans>Sign in</Trans>
          </a>
          {signUpHref !== null && (
            <a href={signUpHref} className={buttonClass("secondary", "sm", "ms-1")}>
              <Trans>Get started</Trans>
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 @2xl:hidden">
          <a href={openAppUrl} className={buttonClass("secondary", "md")}>
            <Trans>Sign in</Trans>
          </a>
          <PhoneMenu openAppUrl={openAppUrl} current={current} signUpHref={signUpHref} />
        </div>
      </nav>
    </MotionConfig>
  );
}
