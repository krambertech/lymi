import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { ArrowRight, Plug, X } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { ASSISTANTS as ALL } from "../lib/assistants";
import { connectedAppsQuery } from "../lib/queries";
import { useReduceMotion } from "../lib/use-reduce-motion";
import type { AppIdentity } from "./app-mark";
import { IconButton } from "./button";
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
    <span className="block rounded-[10px] bg-plate p-[1.5px]">
      <span className="edge grid size-7 place-items-center rounded-[9px] bg-plate text-ink">
        <Glyph app={app} className="size-[15px]" />
      </span>
    </span>
  );
}

// Pointing at the card opens the marks' overlap, so they spread sideways without leaving their row.
const SPREAD =
  "[--dir:1] rtl:[--dir:-1] [translate:0] transition-[translate] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hoverable:group-hover/offer:[translate:calc(var(--i)*8px*var(--dir))_0]";

/** The card above the learner on the rail. Each mark opens its page in Settings; the title opens the Apps group. */
export function AssistantOffer({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useLingui();
  const still = useReduceMotion();
  return (
    <section
      aria-labelledby="assistant-offer-title"
      className="group/offer edge rounded-lg bg-plate p-3"
    >
      <div className="flex items-center">
        <ul className="-ms-0.5 me-auto flex -space-x-1 rtl:space-x-reverse">
          {ASSISTANTS.map(({ app, key }, i) => {
            const name = app.name;
            return (
              <li key={name} className="flex">
                <NavLink
                  to="/settings/apps/$app"
                  params={{ app: key }}
                  aria-label={t`Connect ${name}`}
                  style={{ "--i": i } as CSSProperties}
                  className={clsx("rounded-[10px]", !still && SPREAD)}
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
      <NavLink to="/settings" hash="apps" className="mt-2.5 block rounded-xs">
        <span id="assistant-offer-title" className="text-sm font-medium text-ink">
          <Trans>Connect your AI assistant</Trans>
          <ArrowRight
            aria-hidden="true"
            className={clsx(
              "ms-1 inline-block size-3.5 align-[-2px] text-ink-muted rtl:-scale-x-100",
              !still &&
                "transition-[translate,color] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hoverable:group-hover/offer:translate-x-0.5 hoverable:group-hover/offer:text-ink rtl:hoverable:group-hover/offer:-translate-x-0.5",
            )}
          />
        </span>
        <span className="mt-0.5 block text-sm text-ink-muted text-pretty">
          <Trans>Ask Claude or ChatGPT to create cards and decks for you.</Trans>
        </span>
      </NavLink>
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
