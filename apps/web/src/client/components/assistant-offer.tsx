import { Trans, useLingui } from "@lingui/react/macro";
import { isolate } from "@lymi/core";
import { useQuery } from "@tanstack/react-query";
import { Plug, X } from "lucide-react";
import { useState } from "react";
import { publicSiteUrl } from "../lib/origins";
import { connectedAppsQuery } from "../lib/queries";
import { type AppIdentity, identifyApp } from "./app-mark";
import { Button, IconButton } from "./button";
import { DropdownMenuLinkItem } from "./ui/dropdown-menu";

const KEY = "lymi-assistant-offer-dismissed";

/** The assistants with a setup guide, in the order a learner is likeliest to have one. */
const ASSISTANTS: { app: AppIdentity; guide: string }[] = [
  { app: identifyApp("https://claude.ai/"), guide: "/docs/mcp/claude" },
  { app: identifyApp("https://chatgpt.com/"), guide: "/docs/mcp/chatgpt" },
  { app: identifyApp("https://accountlinking.google.com/"), guide: "/docs/mcp/gemini" },
  { app: identifyApp("https://grok.com/"), guide: "/docs/mcp/grok" },
];

const GUIDES = publicSiteUrl("/docs/mcp");

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

/** The card above the learner on the rail. Each mark opens its own guide; Connect opens them all. */
export function AssistantOffer({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useLingui();
  return (
    <section
      aria-labelledby="assistant-offer-title"
      className="group/offer edge rounded-lg bg-plate p-3.5"
    >
      <div className="flex items-center">
        <ul className="-ms-0.5 me-auto flex -space-x-1 rtl:space-x-reverse">
          {ASSISTANTS.map(({ app, guide }) => {
            const name = app.name;
            return (
              <li key={name} className="flex">
                <a
                  href={publicSiteUrl(guide)}
                  aria-label={t`Connect ${{ name: isolate(name) }}`}
                  className="relative rounded-[13px] transition-transform duration-200 ease-out hoverable:hover:z-10 hoverable:hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hoverable:hover:translate-y-0"
                >
                  <Mark app={app} />
                </a>
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
      <Button size="sm" className="mt-3 w-full" render={<a href={GUIDES} />}>
        <Trans>Connect</Trans>
      </Button>
    </section>
  );
}

/** The learner menu's row beside Docs, on both the rail and the phone. */
export function AssistantMenuItem() {
  return (
    <DropdownMenuLinkItem render={<a href={GUIDES} />}>
      <Plug aria-hidden="true" />
      <Trans>Connect AI assistant</Trans>
    </DropdownMenuLinkItem>
  );
}
