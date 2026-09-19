import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BackButton, Page, PageHeader, TileLockup, TopBar } from "../../views/shell";
import { Skeleton } from "../skeleton";
import { TabActions, useStaticLinks } from "./shell-chrome";

/** Back names the screen above: a place to link to, or an action when there is no route. */
export type ScreenBack =
  | {
      label: string;
      to: string;
      params?: Record<string, string> | undefined;
      hash?: string | undefined;
    }
  | { label: string; onClick: () => void };

interface Props {
  /** A tab opens with the lockup and the learner's controls; a page opens with its way back. */
  kind?: "tab" | "page" | undefined;
  /** Left undefined while it loads, and a skeleton holds its line. */
  title?: ReactNode | undefined;
  sub?: ReactNode | undefined;
  back?: ScreenBack | undefined;
  /** The screen's own controls, written once: in the bar on a phone, beside the title on a desktop. */
  actions?: ReactNode | undefined;
  /** A short line beside the title at every width, such as Saved. */
  status?: ReactNode | undefined;
  /** Keep the way back on a desktop, for a screen whose parent is not a row in the rail. */
  backOnDesktop?: boolean | undefined;
  /** Stands in for the bar on a phone, such as a search field. Wrap it in `ScreenBar`. */
  bar?: ReactNode | undefined;
  /** The view draws its own title inside its column, so the header is left out. */
  ownTitle?: boolean | undefined;
  /** Under the title, inside the header: a lede, a status line. */
  lede?: ReactNode | undefined;
  width?: "md" | "full" | undefined;
  children: ReactNode;
}

function Back({ back }: { back: ScreenBack }) {
  const st = useStaticLinks();
  if ("onClick" in back) return <BackButton label={back.label} onClick={back.onClick} />;
  const { to, params, hash } = back;
  return (
    <BackButton label={back.label}>
      {(className, content) =>
        st ? (
          <a href={to} onClick={(e) => e.preventDefault()} className={className}>
            {content}
          </a>
        ) : (
          <Link to={to} params={params ?? {}} {...(hash ? { hash } : {})} className={className}>
            {content}
          </Link>
        )
      }
    </BackButton>
  );
}

/** A replacement bar at the bar's own size, so the title under it never moves. */
export function ScreenBar({ children }: { children: ReactNode }) {
  return <TopBar back={<div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>} />;
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
  lede,
  width,
  children,
}: Props) {
  const tab = kind === "tab";
  return (
    <Page width={width}>
      {bar ?? (
        <TopBar
          nested={!tab && backOnDesktop}
          back={tab ? <TileLockup size="bar" /> : back && <Back back={back} />}
          actions={
            tab ? (
              <TabActions />
            ) : actions ? (
              <span className="flex items-center gap-1 @3xl/shell:hidden">{actions}</span>
            ) : undefined
          }
        />
      )}
      {!ownTitle && (
        <PageHeader
          title={title ?? <Skeleton className="h-8 w-44" />}
          sub={sub}
          actions={
            // A tab's bar is the learner's, so its own controls sit beside the title at every width.
            tab || !actions ? (
              (status || actions) && (
                <>
                  {status}
                  {actions}
                </>
              )
            ) : (
              <>
                {status}
                <span className="hidden items-center gap-1.5 @3xl/shell:flex">{actions}</span>
              </>
            )
          }
        >
          {lede}
        </PageHeader>
      )}
      {children}
    </Page>
  );
}
