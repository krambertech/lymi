import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { ArrowRight, Plug, X } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { publicSiteUrl } from "../lib/origins";
import { connectedAppsQuery } from "../lib/queries";
import { useReduceMotion } from "../lib/use-reduce-motion";
import { type AppIdentity, identifyApp } from "./app-mark";
import { IconButton } from "./button";
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
    <span className="block rounded-[10px] bg-plate p-[1.5px]">
      <span className="edge grid size-7 place-items-center rounded-[9px] bg-plate text-text">
        <Glyph app={app} className="size-[15px]" />
      </span>
    </span>
  );
}

// Pointing at the card opens the marks' overlap, so they spread sideways without leaving their row.
const SPREAD =
  "[--dir:1] rtl:[--dir:-1] [translate:0] transition-[translate] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hoverable:group-hover/offer:[translate:calc(var(--i)*8px*var(--dir))_0]";

/** The card above the learner on the rail. Each mark opens its own guide; the title opens them all. */
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
          {ASSISTANTS.map(({ app, guide }, i) => {
            const name = app.name;
            return (
              <li key={name} className="flex">
                <a
                  href={publicSiteUrl(guide)}
                  aria-label={t`Connect ${name}`}
                  style={{ "--i": i } as CSSProperties}
                  className={clsx("rounded-[10px]", !still && SPREAD)}
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
      <a href={GUIDES} className="mt-2.5 block rounded-xs">
        <span id="assistant-offer-title" className="text-sm font-medium text-text">
          <Trans>Connect your AI assistant</Trans>
          <ArrowRight
            aria-hidden="true"
            className={clsx(
              "ms-1 inline-block size-3.5 align-[-2px] text-muted rtl:-scale-x-100",
              !still &&
                "transition-[translate,color] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hoverable:group-hover/offer:translate-x-0.5 hoverable:group-hover/offer:text-text rtl:hoverable:group-hover/offer:-translate-x-0.5",
            )}
          />
        </span>
        <span className="mt-0.5 block text-sm text-muted text-pretty">
          <Trans>Ask Claude or ChatGPT to create cards and decks for you.</Trans>
        </span>
      </a>
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
