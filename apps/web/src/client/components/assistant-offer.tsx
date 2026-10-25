import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Plug, X } from "lucide-react";
import { useState } from "react";
import { ASSISTANTS as ALL } from "../lib/assistants";
import { connectedAppsQuery } from "../lib/queries";
import type { AppIdentity } from "./app-mark";
import { Button, IconButton } from "./button";
import { NavLink } from "./nav-link";
import { DropdownMenuLinkItem } from "./ui/dropdown-menu";

const KEY = "lymi-assistant-offer-dismissed";

/** The assistants shown, in the order a learner is likeliest to have one; each opens its page in Settings. */
const ASSISTANTS = ALL.slice(0, 4).flatMap((a) => (a.app ? [{ app: a.app, key: a.key }] : []));

/**
 * Whether to offer connecting an AI assistant: only once the learner's connected apps have loaded
 * and there are none. The rail's card can be dismissed on this device; the menu row stays until
 * an app connects, so the way in is never lost.
 */
export function useAssistantOffer(enabled: boolean) {
  const apps = useQuery({ ...connectedAppsQuery, enabled });
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== null;
    } catch {
      return false;
    }
  });
  const none = apps.isSuccess && apps.data.length === 0;
  return {
    card: none && !dismissed,
    row: none,
    dismiss: () => {
      setDismissed(true);
      try {
        localStorage.setItem(KEY, "1");
      } catch {}
    },
  };
}

function Glyph({ app, className }: { app: AppIdentity; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill={app.brand ?? "currentColor"}
    >
      {app.path && <path d={app.path} />}
    </svg>
  );
}

function Mark({ app }: { app: AppIdentity }) {
  return (
    // The card's plate behind the tile cuts it out of the one it overlaps.
    <span className="block rounded-[13px] bg-plate p-0.5">
      <span className="edge grid size-9 place-items-center rounded-[11px] bg-plate text-text">
        <Glyph app={app} className="size-[18px]" />
      </span>
    </span>
  );
}

/** The card above the learner on the rail. Each mark opens its page in Settings; Connect opens the Apps group. */
export function AssistantOffer({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useLingui();
  return (
    <section
      aria-labelledby="assistant-offer-title"
      className="group/offer edge rounded-lg bg-plate p-3.5"
    >
      <div className="flex items-center">
        <ul className="-ms-0.5 me-auto flex -space-x-1 rtl:space-x-reverse">
          {ASSISTANTS.map(({ app, key }) => {
            const name = app.name;
            return (
              <li key={name} className="flex">
                <NavLink
                  to="/settings/apps/$app"
                  params={{ app: key }}
                  aria-label={t`Connect ${name}`}
                  className="relative rounded-[13px] transition-transform duration-200 ease-out hoverable:hover:z-10 hoverable:hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hoverable:hover:translate-y-0"
                >
                  <Mark app={app} />
                </NavLink>
              </li>
            );
          })}
        </ul>
        {/* Out of sight until the pointer is on the card, so it never sits beside the marks unaligned. */}
        <span className="flex transition-opacity duration-150 hoverable:opacity-0 hoverable:group-hover/offer:opacity-100 hoverable:group-focus-within/offer:opacity-100">
          <IconButton label={t`Dismiss`} size="xs" onClick={onDismiss}>
            <X />
          </IconButton>
        </span>
      </div>
      <p id="assistant-offer-title" className="mt-3 text-base font-medium text-text">
        <Trans>Connect your AI assistant</Trans>
      </p>
      <p className="mt-0.5 text-sm text-muted text-pretty">
        <Trans>Ask Claude or ChatGPT to create cards and decks for you.</Trans>
      </p>
      <Button size="sm" className="mt-3 w-full" render={<NavLink to="/settings" hash="apps" />}>
        <Trans>Connect</Trans>
      </Button>
    </section>
  );
}

/** The learner menu's row beside Docs, on both the rail and the phone. */
export function AssistantMenuItem() {
  return (
    <DropdownMenuLinkItem render={<NavLink to="/settings" hash="apps" />}>
      <Plug aria-hidden="true" />
      <Trans>Connect AI assistant</Trans>
    </DropdownMenuLinkItem>
  );
}
