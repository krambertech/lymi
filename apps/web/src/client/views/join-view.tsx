import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { JoinPreviewOut } from "@lymi/core";
import { Link } from "@tanstack/react-router";
import { CalendarClock, EyeOff, History, Languages, Layers } from "lucide-react";
import { type ReactNode, useState } from "react";
import { AuthNotice } from "../components/auth-notice";
import { Avatar } from "../components/avatar";
import { Button, buttonClass } from "../components/button";
import { CardStream } from "../components/card-stream";
import { languageName } from "../components/deck-fields";
import { Lockup } from "../components/logo";
import { PublicPolicyLinks } from "../components/public-policy-links";
import { Skeleton } from "../components/skeleton";
import { publicSiteUrl } from "../lib/origins";

export interface JoinProps {
  preview: JoinPreviewOut | undefined;
  /** Signed out: carry the link through Google sign-in. */
  onJoinWithGoogle?: (() => void) | undefined;
  /** Signed in and not yet a member. */
  onJoin?: (() => void) | undefined;
  busy?: boolean | undefined;
  error?: ReactNode | undefined;
  /** Local development only: the email sign-in, so a browser test can join without Google. */
  devSignIn?: ReactNode | undefined;
}

/**
 * A deck's join page. A classmate arrives from a chat on their phone, often signed out, so it
 * says whose deck it is, lets a few of its cards drift past, and offers one button. ADR 0011.
 */
export function JoinView({ preview, onJoinWithGoogle, onJoin, busy, error, devSignIn }: JoinProps) {
  const { t } = useLingui();
  return (
    <div className="@container min-h-dvh flex-1 bg-canvas text-text">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] @4xl:px-10 @4xl:pt-[calc(2rem+env(safe-area-inset-top))]">
        <header className="flex justify-center @4xl:justify-start">
          <a href={publicSiteUrl()} aria-label={t`Lymi home`} className="rounded-sm p-1.5">
            <Lockup size={22} flicker />
          </a>
        </header>

        <main className="flex flex-1 flex-col justify-center py-10 @4xl:py-16">
          {!preview ? (
            <div
              className="mx-auto grid w-full max-w-[26rem] justify-items-center gap-3"
              aria-hidden="true"
            >
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-5 w-56" />
              <Skeleton className="mt-8 h-48 w-full rounded-xl" />
              <Skeleton className="mt-8 h-12 w-full" />
            </div>
          ) : preview.status === "live" && preview.deck ? (
            <LiveLink
              preview={preview}
              deck={preview.deck}
              onJoinWithGoogle={onJoinWithGoogle}
              onJoin={onJoin}
              busy={busy}
              error={error}
            />
          ) : (
            <DeadLink preview={preview} />
          )}
        </main>

        <footer className="grid justify-items-center">
          {devSignIn}
          <PublicPolicyLinks className="mt-4" />
        </footer>
      </div>
    </div>
  );
}

function LiveLink({
  preview,
  deck,
  onJoinWithGoogle,
  onJoin,
  busy,
  error,
}: Omit<JoinProps, "devSignIn"> & {
  preview: JoinPreviewOut;
  deck: NonNullable<JoinPreviewOut["deck"]>;
}) {
  const { t, i18n } = useLingui();
  const { viewer, deckId } = preview;
  // The server draws the cards at random, so a refetch must not swap the cards mid-stream.
  const [samples] = useState(deck.samples);
  const lastAdded = deck.lastAddedAt ? sinceLabel(i18n.locale, new Date(deck.lastAddedAt)) : null;
  const newcomer = viewer === "signed-out" || viewer === "visitor";

  return (
    <div className="mx-auto grid w-full max-w-[26rem] grid-cols-[minmax(0,1fr)] @4xl:max-w-none @4xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] @4xl:grid-rows-[auto_auto] @4xl:gap-x-20">
      <div className="grid justify-items-center text-center @4xl:col-start-1 @4xl:row-start-1 @4xl:self-end @4xl:justify-items-start @4xl:text-start">
        <p className="flex items-center gap-2 text-md text-text-2">
          <Avatar name={deck.owner.name} size={24} />
          {viewer === "owner" ? (
            <Trans>Your deck</Trans>
          ) : (
            <Trans>{deck.owner.name} shared a deck</Trans>
          )}
        </p>
        <h1 className="mt-3 max-w-full text-balance break-words text-[2.5rem] font-medium leading-[1.05] tracking-[-0.03em] @4xl:text-[3.25rem]">
          {deck.name}
        </h1>
        <ul
          aria-label={t`About this deck`}
          className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-base text-muted @4xl:justify-start"
        >
          {deck.language && (
            <li className="flex items-center gap-1.5">
              <Languages aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
              {languageName(deck.language, i18n.locale)}
            </li>
          )}
          <li className="flex items-center gap-1.5 tabular-nums">
            <Layers aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
            <Plural value={deck.total} one="# card" other="# cards" />
          </li>
          {lastAdded && (
            <li className="flex items-center gap-1.5">
              <History aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
              {t`Updated ${lastAdded}`}
            </li>
          )}
        </ul>
      </div>

      {samples.length > 0 && (
        <>
          <CardStream
            cards={samples}
            language={deck.language}
            direction="across"
            className="-mx-5 mt-8 @4xl:hidden"
          />
          <CardStream
            cards={samples}
            language={deck.language}
            direction="up"
            className="hidden h-[min(40rem,calc(100dvh-10rem))] min-h-[28rem] @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1 @4xl:block @4xl:self-center"
          />
        </>
      )}

      <div className="grid @4xl:col-start-1 @4xl:row-start-2 @4xl:self-start">
        {newcomer && (
          <ul className="mt-9 grid gap-3 text-base text-text-2 @4xl:mt-8">
            <li className="flex items-start gap-3">
              <CalendarClock
                aria-hidden="true"
                strokeWidth={1.75}
                className="mt-0.5 size-[18px] shrink-0 text-muted"
              />
              <Trans>Review on your own schedule. New cards appear as they are added.</Trans>
            </li>
            <li className="flex items-start gap-3">
              <EyeOff
                aria-hidden="true"
                strokeWidth={1.75}
                className="mt-0.5 size-[18px] shrink-0 text-muted"
              />
              <Trans>Only your name is shared, never your progress.</Trans>
            </li>
          </ul>
        )}
        {viewer === "owner" && (
          <AuthNotice tone="neutral" role="status" className="mt-9 @4xl:mt-8">
            <Trans>Anyone with this link can join and review these cards.</Trans>
          </AuthNotice>
        )}
        {viewer === "member" && (
          <AuthNotice tone="success" role="status" className="mt-9 @4xl:mt-8">
            <Trans>You are already in this deck.</Trans>
          </AuthNotice>
        )}
        {viewer === "removed" && (
          <AuthNotice tone="neutral" role="status" className="mt-9 @4xl:mt-8">
            <Trans>
              You were removed from this deck, so this link cannot add you back. Your reviews are
              kept.
            </Trans>
          </AuthNotice>
        )}

        {error && (
          <AuthNotice tone="danger" role="alert" className="mt-6">
            {error}
          </AuthNotice>
        )}

        {deckId ? (
          <Link
            to="/library/$deckId"
            params={{ deckId }}
            className={buttonClass("primary", "lg", "mt-7 w-full")}
          >
            <Trans>Open deck</Trans>
          </Link>
        ) : viewer === "signed-out" ? (
          <Button
            variant="primary"
            size="lg"
            loading={busy}
            onClick={onJoinWithGoogle}
            aria-disabled={!onJoinWithGoogle}
            className="mt-7 w-full"
          >
            <Trans>Join with Google</Trans>
          </Button>
        ) : viewer === "visitor" ? (
          <Button
            variant="primary"
            size="lg"
            loading={busy}
            onClick={onJoin}
            aria-disabled={!onJoin}
            className="mt-7 w-full"
          >
            <Trans>Join</Trans>
          </Button>
        ) : (
          <a href="/" className={buttonClass("secondary", "lg", "mt-7 w-full")}>
            <Trans>Go to Lymi</Trans>
          </a>
        )}
      </div>
    </div>
  );
}

function DeadLink({ preview }: { preview: JoinPreviewOut }) {
  const { deckId } = preview;
  return (
    <div className="mx-auto w-full max-w-[26rem] text-center">
      <h1 className="text-balance text-2xl font-medium tracking-[-0.02em] text-text">
        {preview.status === "off" ? (
          <Trans>This join link is turned off</Trans>
        ) : preview.status === "archived" ? (
          <Trans>This deck is archived</Trans>
        ) : (
          <Trans>This join link does not work</Trans>
        )}
      </h1>
      <p className="mx-auto mt-2 max-w-[40ch] text-pretty text-md text-text-2">
        {preview.status === "off" ? (
          <Trans>Ask the person who shared it for a new link.</Trans>
        ) : preview.status === "archived" ? (
          <Trans>Nobody can join it while it is archived.</Trans>
        ) : (
          <Trans>Check that the whole link was copied, or ask for a new one.</Trans>
        )}
      </p>
      {deckId ? (
        <>
          <p className="mx-auto mt-4 max-w-[40ch] text-pretty text-sm text-muted">
            <Trans>You are still in the deck.</Trans>
          </p>
          <Link
            to="/library/$deckId"
            params={{ deckId }}
            className={buttonClass("primary", "lg", "mt-7 w-full")}
          >
            <Trans>Open deck</Trans>
          </Link>
        </>
      ) : (
        <a href="/" className={buttonClass("secondary", "lg", "mt-7 w-full")}>
          <Trans>Go to Lymi</Trans>
        </a>
      )}
    </div>
  );
}

/** "today", "yesterday", "3 days ago": when the owner last added a card, in the page's language. */
function sinceLabel(locale: string, at: Date): string {
  const days = Math.max(0, Math.floor((Date.now() - at.getTime()) / 86_400_000));
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (days < 7) return format.format(-days, "day");
  if (days < 60) return format.format(-Math.floor(days / 7), "week");
  return format.format(-Math.floor(days / 30), "month");
}
