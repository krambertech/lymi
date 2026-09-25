import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import {
  Activity,
  Archive,
  BookOpen,
  ChartNoAxesColumn,
  Compass,
  Download,
  Keyboard,
  LogOut,
  MessageSquare,
  Settings,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useLearnerAvatar } from "../lib/avatar";
import { promptToInstall, useInstallState } from "../lib/pwa-install";
import { Avatar } from "./avatar";
import { FeedbackDialog } from "./feedback-dialog";
import { InstallDialog } from "./install-dialog";
import { NavLink, useStaticNav } from "./nav-link";
import { ShortcutsDialog } from "./shortcuts-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type Place = "/settings" | "/activity" | "/insights" | "/explore" | "/archived";

interface Props {
  name: string | undefined;
  email?: string | undefined;
  /** "rail" sits at the foot of the sidebar and opens upward; "phone" is the avatar in a header. */
  variant: "rail" | "phone";
  docsUrl: string;
  onSignOut?: (() => void | Promise<void>) | undefined;
  signingOut?: boolean | undefined;
}

/** The part of a name a friend uses. Google sends the full one. */
export function firstName(name: string | undefined): string | undefined {
  return name?.trim().split(/\s+/)[0] || undefined;
}

/**
 * The learner, and the few things that belong to them rather than to a screen: where to go,
 * what this device can do, and the way out. The rail already lists Insights, so
 * on desktop the menu holds only what has no other home. Keyboard shortcuts appear where
 * there is a keyboard; Install appears where the browser can actually do it. Writing to Lymi sits
 * with the docs, since both are where a learner goes when the app has not answered them.
 */
export function LearnerMenu({ name, email, variant, docsUrl, onSignOut, signingOut }: Props) {
  const { t } = useLingui();
  const st = useStaticNav();
  const install = useInstallState();
  const photo = useLearnerAvatar();
  const [shortcuts, setShortcuts] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);
  const short = firstName(name) ?? t`You`;
  const installable = !install.installed && (install.canPrompt || install.isIOS);

  const place = (to: Place, icon: ReactNode, label: ReactNode, trailing?: ReactNode) => (
    <DropdownMenuLinkItem render={<NavLink to={to} />}>
      {icon}
      <span className="flex-1">{label}</span>
      {trailing}
    </DropdownMenuLinkItem>
  );

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
                <Avatar name={name} src={photo.src} pending={photo.pending || !name} size={34} />
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
                <Avatar name={name} src={photo.src} pending={photo.pending || !name} size={40} />
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
          {/* Activity is behind You on every device: it is read when something is in question,
              not a destination the learner steers by. DESIGN.md, Layout. */}
          {place("/activity", <Activity aria-hidden="true" />, <Trans>Activity</Trans>)}
          {variant === "phone" && (
            <>
              {place(
                "/insights",
                <ChartNoAxesColumn aria-hidden="true" />,
                <Trans>Insights</Trans>,
              )}
              {/* The pill is drawn for two, so Explore rides here; Today's strip is the way in
                  a learner actually sees. */}
              {place("/explore", <Compass aria-hidden="true" />, <Trans>Explore</Trans>)}
            </>
          )}
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
          <DropdownMenuItem onClick={() => !st && setFeedback(true)}>
            <MessageSquare aria-hidden="true" />
            <Trans>Send feedback</Trans>
          </DropdownMenuItem>

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
      {!st && <FeedbackDialog open={feedback} onOpenChange={setFeedback} />}
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
