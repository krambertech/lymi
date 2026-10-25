import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
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
  MENU_FEATURE,
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

/** Closes an open menu on Escape, or on a press or focus anywhere outside it. */
function useDismiss(
  open: boolean,
  close: () => void,
  root: RefObject<HTMLElement | null>,
  trigger: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: Event) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
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
  }, [open, close, root, trigger]);
}

interface NavMenuProps {
  label: ReactNode;
  active?: boolean | undefined;
  /** Where the menu's clicks are counted from, as `site_link_followed` names it. */
  place: string;
  panelClass: string;
  onIntent?: (() => void) | undefined;
  children: ReactNode;
}

/** A top bar button that opens a panel under the bar, aligned with the bar's end. */
function NavMenu({ label, active, place, panelClass, onIntent, children }: NavMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, root, trigger);

  return (
    <div ref={root}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onPointerEnter={onIntent}
        onFocus={onIntent}
        onClick={() => {
          onIntent?.();
          setOpen((o) => !o);
        }}
        className={buttonClass(
          "ghost",
          "sm",
          clsx("gap-1", (open || active) && "text-text", open && "bg-plate-2"),
        )}
      >
        {label}
        <ChevronDown
          data-icon="inline-end"
          aria-hidden="true"
          className={clsx("text-muted transition-transform duration-150", open && "rotate-180")}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            data-site-menu-panel
            data-nav={place}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.14, ease: EASE_OUT } }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1, ease: EASE_OUT } }}
            className={clsx(
              "absolute end-0 top-full z-(--z-dropdown) mt-1.5 max-w-[calc(100cqw-2.5rem)] origin-top-right rounded-lg bg-plate p-1.5 edge rtl:origin-top-left",
              panelClass,
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
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

function MenuFeature() {
  const { i18n } = useLingui();
  const { sample } = MENU_FEATURE;
  return (
    <a
      href={MENU_FEATURE.href(i18n.locale)}
      data-hue={MENU_FEATURE.hue}
      className="menu-feature group hidden flex-col overflow-hidden rounded-md px-4 pt-4 @4xl:flex"
    >
      <span className="text-base font-medium text-text">{i18n._(MENU_FEATURE.title)}</span>
      <span className="mt-1 text-sm text-pretty text-text-2">{i18n._(MENU_FEATURE.blurb)}</span>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-text">
        <Trans>See the decks</Trans>
        <ArrowRight
          aria-hidden="true"
          className="size-3.5 transition-transform duration-200 ease-out hoverable:group-hover:translate-x-0.5"
        />
      </span>
      <span className="mt-4 -mb-3 flex flex-1 flex-col rounded-md bg-plate px-4 pt-3.5 pb-6 edge">
        <span lang={sample.language} className="text-lg leading-snug font-medium text-text">
          {sample.question}
        </span>
        {sample.translation?.question && (
          <span className="mt-2 border-t border-edge-2 pt-2 text-sm text-muted">
            {i18n._(sample.translation.question)}
          </span>
        )}
      </span>
    </a>
  );
}

function UseCasesMenu({ current }: { current: LocalizedPage | undefined }) {
  const { i18n } = useLingui();
  return (
    <NavMenu
      label={<Trans>Use cases</Trans>}
      active={isUseCasePage(current)}
      place="use_cases_menu"
      panelClass="w-[36rem] @4xl:w-[45rem]"
    >
      <div className="grid grid-cols-2 gap-1 @4xl:grid-cols-[1fr_1fr_14.5rem]">
        {USE_CASE_GROUPS.map((group) => (
          <div key={group.title.id}>
            <p className="px-2.5 pt-2 pb-1.5 text-sm text-muted">{i18n._(group.title)}</p>
            <ul className="grid gap-0.5">
              {group.links.map((link) => (
                <li key={link.page}>
                  <a
                    href={localizedPath(link.page, i18n.locale)}
                    aria-current={current === link.page ? "page" : undefined}
                    className="flex items-center gap-3 rounded-md px-2.5 py-1.5 text-base font-medium text-text transition-colors duration-150 hoverable:hover:bg-plate-2 aria-[current=page]:bg-plate-2"
                  >
                    <UseCaseMark link={link} size="sm" />
                    {i18n._(link.label)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <MenuFeature />
      </div>
      <div className="mx-1 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-edge px-1.5 pt-3 pb-1.5">
        <p className="text-sm text-muted">
          <Trans>Popular</Trans>
        </p>
        <PopularLinks />
      </div>
    </NavMenu>
  );
}

function ShelfRow({ shelf }: { shelf: MenuShelf }) {
  const { i18n } = useLingui();
  return (
    <a
      href={shelf.path}
      className="flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-base text-text transition-colors duration-150 hoverable:hover:bg-plate-2"
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

function ExploreMenu() {
  const { i18n } = useLingui();
  const [wanted, setWanted] = useState(false);
  const shelves = useShelves(wanted);
  // Without shelves to list, the menu is the one link to the whole catalogue.
  const listed = shelves === undefined || (shelves && shelves.languages.length > 0);
  const subjects = shelves === undefined || (shelves && shelves.subjects.length > 0);

  return (
    <NavMenu
      label={<Trans>Explore</Trans>}
      place="explore_menu"
      panelClass="w-[33rem]"
      onIntent={() => setWanted(true)}
    >
      {listed && (
        <div
          className={clsx("grid gap-2", subjects && "grid-cols-[3fr_2fr]")}
          aria-busy={shelves === undefined}
        >
          <div>
            <p className="px-2.5 pt-2 pb-1.5 text-sm text-muted">
              <Trans>Languages</Trans>
            </p>
            <div className="grid grid-cols-2">
              {shelves ? (
                shelves.languages.map((shelf) => <ShelfRow key={shelf.key} shelf={shelf} />)
              ) : (
                <ShelfPlaceholder rows={8} />
              )}
            </div>
          </div>
          {subjects && (
            <div>
              <p className="px-2.5 pt-2 pb-1.5 text-sm text-muted">
                <Trans>Subjects</Trans>
              </p>
              {shelves ? (
                shelves.subjects.map((shelf) => <ShelfRow key={shelf.key} shelf={shelf} />)
              ) : (
                <ShelfPlaceholder rows={5} />
              )}
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
    </NavMenu>
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
          <UseCasesMenu current={current} />
          <ExploreMenu />
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
