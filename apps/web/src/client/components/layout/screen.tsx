import { createContext, type ReactNode, useContext, useRef } from "react";
import { useShellWide } from "../../lib/shell-width";
import { BackButton, Page, PageHeader, TileLockup, TopBar } from "../../views/shell";
import { NavLink } from "../nav-link";
import { Skeleton } from "../skeleton";
import { TabActions } from "./shell-chrome";

/**
 * Back names the screen above: a place to link to, or an action when there is no route. With
 * neither, it is the name alone, for the moment before the screen knows where back goes.
 */
export type Back =
  | {
      label: string;
      to: string;
      params?: Record<string, string> | undefined;
      hash?: string | undefined;
    }
  | {
      label: string;
      onClick: () => void;
      /** The icon's accessible name where the label is not drawn, as in a dialog's bar. */
      name?: string | undefined;
    }
  | { label: string; to?: undefined; onClick?: undefined };

interface Props {
  /** A tab opens with the lockup and the learner's controls; a page opens with its way back. */
  kind?: "tab" | "page" | undefined;
  /** Left undefined while it loads, and a skeleton holds its line. */
  title?: ReactNode | undefined;
  sub?: ReactNode | undefined;
  back?: Back | undefined;
  /** The screen's own controls, mounted once: in the bar on a phone, beside the title on a desktop. */
  actions?: ReactNode | undefined;
  /** A short line beside the title at every width, such as Saved. */
  status?: ReactNode | undefined;
  /** Keep the way back on a desktop, for a screen whose parent is not a row in the rail. */
  backOnDesktop?: boolean | undefined;
  /** Stands in for the bar, such as a search field. Wrap it in `ScreenBar`. */
  bar?: ReactNode | undefined;
  /** The view draws its own title inside its column, so the header is left out. */
  ownTitle?: boolean | undefined;
  /** Draws a full-width header around the bar, outside the column, such as a published deck's colour. */
  cover?: ((bar: ReactNode) => ReactNode) | undefined;
  /** Under the title, inside the header: a lede, a status line. */
  lede?: ReactNode | undefined;
  width?: "md" | "full" | undefined;
  children: ReactNode;
}

function BackLink({ back }: { back: Back }) {
  if ("onClick" in back && back.onClick) {
    return <BackButton label={back.label} onClick={back.onClick} />;
  }
  const link = "to" in back && back.to !== undefined ? back : undefined;
  return (
    <BackButton label={back.label}>
      {(className, content) =>
        link ? (
          <NavLink
            to={link.to}
            params={link.params ?? {}}
            {...(link.hash ? { hash: link.hash } : {})}
            className={className}
          >
            {content}
          </NavLink>
        ) : (
          <span className={className}>{content}</span>
        )
      }
    </BackButton>
  );
}

/** Whether the bar a `ScreenBar` stands in for stays on a desktop. */
const BarOnDesktop = createContext(false);

/** A replacement bar at the bar's own size, so the title under it never moves. */
export function ScreenBar({ children }: { children: ReactNode }) {
  return (
    <TopBar
      nested={useContext(BarOnDesktop)}
      back={<div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>}
    />
  );
}

/** One screen: the column, the bar and the title, in the same place every time. */
export function Screen({
  kind = "page",
  title,
  sub,
  back,
  actions,
  status,
  backOnDesktop = false,
  bar,
  ownTitle = false,
  cover,
  lede,
  width,
  children,
}: Props) {
  const tab = kind === "tab";
  const root = useRef<HTMLDivElement>(null);
  // Mounted in one slot, never hidden in two: a second copy would double every menu, shortcut and query inside.
  const wide = useShellWide(root);
  // A tab's bar is the learner's, so its own controls sit beside the title at every width.
  const beside = tab || wide;
  const topBar = bar ? (
    <BarOnDesktop value={backOnDesktop}>{bar}</BarOnDesktop>
  ) : (
    <TopBar
      nested={!tab && backOnDesktop}
      back={tab ? <TileLockup size="bar" /> : back && <BackLink back={back} />}
      actions={tab ? <TabActions /> : beside ? undefined : actions}
    />
  );
  return (
    <>
      {cover?.(topBar)}
      <Page ref={root} width={width}>
        {!cover && topBar}
        {!ownTitle && (
          <PageHeader
            title={title ?? <Skeleton className="h-8 w-44" />}
            sub={sub}
            actions={
              (status || (beside && actions)) && (
                <>
                  {status}
                  {beside && actions}
                </>
              )
            }
          >
            {lede}
          </PageHeader>
        )}
        {children}
      </Page>
    </>
  );
}
