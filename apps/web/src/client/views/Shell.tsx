import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import {
  Activity,
  BookMarked,
  ChartNoAxesColumn,
  ChevronLeft,
  type LucideIcon,
  Search,
  Sun,
} from "lucide-react";
import type { ReactNode } from "react";
import { AddMenu } from "../components/AddMenu";
import { IconButton } from "../components/Button";
import { LearnerMenu } from "../components/LearnerMenu";
import { AppTile, Wordmark } from "../components/Logo";
import { NavLink, type StaticNav } from "../components/NavLink";

export type { StaticNav } from "../components/NavLink";

export interface NavDeck {
  id: string;
  name: string;
  total: number;
  due: number;
}

/**
 * Desktop navigation, in reading order. The list
 * does not reorder when it lands.
 */
export const NAV: {
  to: string;
  label: MessageDescriptor;
  icon: LucideIcon;
  exact?: boolean;
}[] = [
  { to: "/today", label: msg`Today`, icon: Sun, exact: true },
  { to: "/library", label: msg`Library`, icon: BookMarked },
  { to: "/insights", label: msg`Insights`, icon: ChartNoAxesColumn },
  { to: "/activity", label: msg`Activity`, icon: Activity },
];

interface SidebarProps {
  decks: NavDeck[] | undefined;
  name: string | undefined;
  email?: string | undefined;
  onAdd: () => void;
  onCreateDeck?: (() => void) | undefined;
  onSearch?: (() => void) | undefined;
  onSignOut?: (() => void | Promise<void>) | undefined;
  signingOut?: boolean | undefined;
  docsUrl: string;
  /** Something an integration wrote is unseen. A dot, never a count. */
  unseen?: boolean | undefined;
  static?: StaticNav;
  className?: string | undefined;
}

/**
 * Desktop navigation. It sits on the rail, one surface off the room, so chrome and content
 * never read as one wash. The lockup tops it on the same line as the page title beside it,
 * capture and search share that line, and the learner closes it under a rule. It fills the
 * height it is given and scrolls its own overflow, so the frame that holds it decides how
 * tall it is: the viewport in the app, the window in the design gallery.
 */
export function Sidebar({
  decks,
  name,
  email,
  onAdd,
  onCreateDeck,
  onSearch,
  onSignOut,
  signingOut,
  docsUrl,
  unseen,
  static: st,
  className,
}: SidebarProps) {
  const { t, i18n } = useLingui();
  const item =
    "group flex h-10 items-center gap-2.5 rounded-sm px-2.5 text-base text-text-2 transition-[background-color,color,box-shadow] duration-150 hoverable:hover:bg-hover hoverable:hover:text-text [&.active]:bg-plate [&.active]:text-text [&.active]:edge [&_svg]:size-[18px] [&_svg]:text-muted [&.active_svg]:text-text";
  return (
    <aside
      className={clsx(
        "flex h-full w-60 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-edge bg-rail px-3 pb-4 pt-safe",
        className,
      )}
    >
      <div className="mb-6 mt-8 flex h-10 items-center gap-1 px-2.5">
        <span className="me-auto flex items-center gap-2.5">
          <AppTile size={28} title="Lymi" />
          <Wordmark size={18} className="text-text" />
        </span>
        {onSearch && (
          <IconButton label={t`Search`} size="sm" onClick={onSearch}>
            <Search />
          </IconButton>
        )}
        <AddMenu onAddCard={onAdd} onCreateDeck={onCreateDeck} size="sm" align="end" />
      </div>

      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} exact={n.exact} className={item} st={st}>
          <n.icon aria-hidden="true" />
          <span className="flex-1">{i18n._(n.label)}</span>
          {n.to === "/activity" && unseen && (
            <i className="size-1.5 rounded-full bg-amber-text" aria-hidden="true" />
          )}
        </NavLink>
      ))}

      {decks && decks.length > 0 && (
        <>
          <div className="mx-2.5 mb-1.5 mt-7 text-xs font-medium uppercase tracking-[0.06em] text-muted">
            <Trans>Decks</Trans>
          </div>
          {decks.map((d) => (
            <NavLink
              key={d.id}
              to="/library/$deckId"
              params={{ deckId: d.id }}
              className={item}
              st={st}
            >
              <span className="flex-1 truncate">{d.name}</span>
              <span className="text-xs tabular-nums text-muted">
                {d.due > 0 ? <b className="font-semibold text-amber-text">{d.due}</b> : d.total}
              </span>
            </NavLink>
          ))}
        </>
      )}

      <div className="min-h-6 flex-1" />

      {/* The rule is its own line across the rail, not a border on the row: a top border on a
          rounded row curves at the corners and reads as a broken card rather than a divider. */}
      <div className="-mx-3 mt-2 border-t border-edge px-3 pt-2">
        <LearnerMenu
          variant="rail"
          name={name}
          email={email}
          docsUrl={docsUrl}
          onSignOut={onSignOut}
          signingOut={signingOut}
          static={st}
        />
      </div>
    </aside>
  );
}

/**
 * The app frame. The shell is capped and centred rather than stretched: a vocabulary app has
 * one column of content, and a 2560 px sidebar-plus-column is a worse read, not a better one.
 */
export function AppShell({
  sidebar,
  nav,
  children,
}: {
  sidebar?: ReactNode | undefined;
  /** The phone pill. Floats over the content, centred above the home indicator. */
  nav?: ReactNode | undefined;
  children: ReactNode;
}) {
  return (
    <div className="@container/shell flex min-h-dvh w-full bg-canvas">
      {/* The rail is pinned to the viewport rather than stretched down the document: as a plain
          flex child it grew with a long page and scrolled away with it. */}
      {sidebar && <div className="sticky top-0 h-dvh shrink-0 self-start">{sidebar}</div>}
      <main className="@container flex min-w-0 flex-1 flex-col pt-safe">{children}</main>
      {nav && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-(--z-sticky) flex justify-center pb-safe @3xl/shell:hidden">
          <div className="mb-6">{nav}</div>
        </div>
      )}
    </div>
  );
}

/**
 * The row above every screen's title: back on the start side, the screen's own controls on the
 * end. One height and one shape everywhere, so back is always under the same thumb and the title
 * never moves. Actions are square ghost icon buttons; the round amber capture, where a screen has
 * it, goes first so it never sits between two squares. On desktop the rail does this job, so
 * the bar only stays for a screen nested under another one.
 */
export function TopBar({
  back,
  actions,
  nested = false,
  className,
}: {
  back?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  /** A screen under another one (deck settings) keeps the bar on desktop for its way back. */
  nested?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <header
      className={clsx(
        "-mt-2 mb-2 flex h-14 items-center gap-2",
        !nested && "@3xl/shell:hidden",
        className,
      )}
    >
      {back}
      {actions && <div className="ms-auto flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}

const backClass =
  "-ms-2.5 inline-flex h-11 min-w-11 max-w-[65%] items-center gap-0.5 rounded-sm pe-2.5 ps-1 text-md text-text-2 transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97] hoverable:hover:bg-plate-2 hoverable:hover:text-text [&_svg]:size-[22px] [&_svg]:shrink-0";

/** Back to the screen above, named, so a card says which deck it returns to. */
export function BackButton({
  label,
  onClick,
  children,
}: {
  label: string;
  /** A button when there is no route to link, e.g. closing a card back to its deck. */
  onClick?: (() => void) | undefined;
  /** A router link, for when back is a place. Receives the class and the content. */
  children?: ((className: string, content: ReactNode) => ReactNode) | undefined;
}) {
  const content = (
    <>
      <ChevronLeft aria-hidden="true" />
      <span className="truncate">{label}</span>
    </>
  );
  if (children) return <>{children(backClass, content)}</>;
  return (
    <button type="button" onClick={onClick} className={backClass}>
      {content}
    </button>
  );
}

/** Page column. Same on every screen so the eye lands in the same place. */
export function Page({
  children,
  width = "full",
  className,
}: {
  children: ReactNode;
  /** "md" for reading screens, "full" for Today, Library and a deck. */
  width?: "md" | "full" | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      className={clsx(
        "mx-auto flex w-full flex-1 flex-col px-5 pt-5 pb-safe-nav @3xl:px-8 @3xl:pb-12 @3xl:pt-8",
        width === "md" ? "max-w-2xl" : "max-w-(--column)",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  eyebrow,
  sub,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  /** Small line above the title, e.g. a back link on the phone. */
  eyebrow?: ReactNode | undefined;
  /** One line under the title: the date, a count. */
  sub?: ReactNode | undefined;
  /** The screen's own controls. Phone-only on screens the rail already serves. */
  actions?: ReactNode | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <header className={clsx("pb-5 @3xl:pb-7", className)}>
      {eyebrow}
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h1 className="min-w-0 text-2xl font-medium leading-[1.2] text-text">{title}</h1>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>
      {sub && <div className="mt-1.5 text-sm text-muted tabular-nums">{sub}</div>}
      {children}
    </header>
  );
}
