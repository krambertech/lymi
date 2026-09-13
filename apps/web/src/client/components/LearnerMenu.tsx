import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
  Activity,
  Archive,
  BookOpen,
  ChartNoAxesColumn,
  Download,
  Keyboard,
  LogOut,
  Settings,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { promptToInstall, useInstallState } from "../lib/pwa-install";
import { Avatar } from "./Avatar";
import { InstallDialog } from "./InstallDialog";
import type { StaticNav } from "./NavLink";
import { ShortcutsDialog } from "./ShortcutsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type Place = "/settings" | "/activity" | "/insights" | "/archived";

interface Props {
  name: string | undefined;
  email?: string | undefined;
  /** "rail" sits at the foot of the sidebar and opens upward; "phone" is the avatar in a header. */
  variant: "rail" | "phone";
  /** Something an integration wrote is unseen. Shown beside Activity, phone only. */
  unseen?: boolean | undefined;
  docsUrl: string;
  onSignOut?: (() => void | Promise<void>) | undefined;
  signingOut?: boolean | undefined;
  static?: StaticNav;
}

/** The part of a name a friend uses. Google sends the full one. */
export function firstName(name: string | undefined): string | undefined {
  return name?.trim().split(/\s+/)[0] || undefined;
}

/**
 * The learner, and the few things that belong to them rather than to a screen: where to go,
 * what this device can do, and the way out. The rail already lists Activity and Insights, so
 * on desktop the menu holds only what has no other home. Keyboard shortcuts appear where
 * there is a keyboard; Install appears where the browser can actually do it.
 */
export function LearnerMenu({
  name,
  email,
  variant,
  unseen,
  docsUrl,
  onSignOut,
  signingOut,
  static: st,
}: Props) {
  const { t } = useLingui();
  const install = useInstallState();
  const [shortcuts, setShortcuts] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);
  const short = firstName(name) ?? t`You`;
  const installable = !install.installed && (install.canPrompt || install.isIOS);

  const place = (to: Place, icon: ReactNode, label: ReactNode, trailing?: ReactNode) => (
    <DropdownMenuLinkItem
      render={
        st ? (
          // biome-ignore lint/a11y/useAnchorContent: the menu row renders its label into this anchor
          <a href={to} onClick={(e) => e.preventDefault()} />
        ) : (
          <Link to={to} />
        )
      }
    >
      {icon}
      <span className="flex-1">{label}</span>
      {trailing}
    </DropdownMenuLinkItem>
  );
  const dot = <i className="size-1.5 rounded-full bg-amber-text" aria-hidden="true" />;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            variant === "rail" ? (
              <button
                type="button"
                aria-busy={signingOut || undefined}
                className={clsx(
                  "flex h-14 w-full items-center gap-3 rounded-md px-2 text-start transition-[background-color,box-shadow,opacity] duration-150",
                  // Open wins over hover: the pointer is still on the row when the menu appears.
                  "hoverable:hover:not-aria-expanded:bg-hover aria-expanded:edge aria-expanded:bg-plate",
                  signingOut && "opacity-45",
                )}
              >
                <Avatar name={name} size={34} />
                <span className="min-w-0 flex-1 truncate text-base text-text">{short}</span>
              </button>
            ) : (
              <button
                type="button"
                aria-busy={signingOut || undefined}
                className={clsx(
                  "relative inline-flex rounded-full transition-opacity before:absolute before:-inset-1.5 before:content-['']",
                  signingOut && "opacity-45",
                )}
              >
                <Avatar name={name} size={40} />
                <span className="sr-only">{short}</span>
              </button>
            )
          }
        />
        <DropdownMenuContent
          aria-label={short}
          align={variant === "rail" ? "start" : "end"}
          side={variant === "rail" ? "top" : "bottom"}
          className={variant === "rail" ? undefined : "min-w-56"}
        >
          {name && (
            <>
              <div className="grid gap-0.5 px-2.5 pb-2 pt-1.5">
                <span className="truncate text-base font-medium text-text">{name}</span>
                {email && <span className="truncate text-xs text-muted">{email}</span>}
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {place("/settings", <Settings aria-hidden="true" />, <Trans>Settings</Trans>)}
          {variant === "phone" &&
            place(
              "/activity",
              <Activity aria-hidden="true" />,
              <Trans>Activity</Trans>,
              unseen ? dot : undefined,
            )}
          {variant === "phone" &&
            place("/insights", <ChartNoAxesColumn aria-hidden="true" />, <Trans>Insights</Trans>)}
          {place("/archived", <Archive aria-hidden="true" />, <Trans>Archived</Trans>)}

          <DropdownMenuSeparator />
          {variant === "rail" && (
            <DropdownMenuItem onClick={() => setShortcuts(true)}>
              <Keyboard aria-hidden="true" />
              <Trans>Keyboard shortcuts</Trans>
            </DropdownMenuItem>
          )}
          {installable && (
            <DropdownMenuItem
              onClick={() => {
                if (install.canPrompt) void promptToInstall();
                else setInstallHelp(true);
              }}
            >
              <Download aria-hidden="true" />
              <Trans>Install Lymi</Trans>
            </DropdownMenuItem>
          )}
          <DropdownMenuLinkItem render={<a href={docsUrl} />}>
            <BookOpen aria-hidden="true" />
            <Trans>Docs</Trans>
          </DropdownMenuLinkItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={onSignOut}
            disabled={!onSignOut || signingOut}
          >
            <LogOut aria-hidden="true" />
            <Trans>Sign out</Trans>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {variant === "rail" && (
        <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
      )}
      {installable && (
        <InstallDialog
          open={installHelp}
          onClose={() => setInstallHelp(false)}
          ios={install.isIOS}
        />
      )}
    </>
  );
}
