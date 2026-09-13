import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { JoinPreviewOut } from "@lymi/core";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AuthFrame } from "../components/AuthFrame";
import { AuthNotice } from "../components/AuthNotice";
import { Avatar } from "../components/Avatar";
import { Button, buttonClass } from "../components/Button";
import { languageName } from "../components/DeckFields";
import { Skeleton } from "../components/Skeleton";
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
 * says whose deck it is, shows a few of its cards, and offers one button. ADR 0011.
 */
export function JoinView({ preview, onJoinWithGoogle, onJoin, busy, error, devSignIn }: JoinProps) {
  return (
    <AuthFrame footer={devSignIn} homeHref={publicSiteUrl()}>
      <section className="edge min-w-0 rounded-xl bg-plate p-6 text-center @xl:p-10">
        {!preview ? (
          <div className="grid justify-items-center gap-3" aria-hidden="true">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-6 h-12 w-full" />
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
      </section>
    </AuthFrame>
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
  const ownerName = deck.owner.name;
  const { viewer, deckId } = preview;
  const more = deck.total - deck.samples.length;
  const lastAdded = deck.lastAddedAt ? sinceLabel(i18n.locale, new Date(deck.lastAddedAt)) : null;
  const stats = [
    {
      key: "cards",
      value: i18n.number(deck.total),
      label: <Plural value={deck.total} one="card" other="cards" />,
    },
    deck.language && {
      key: "language",
      value: languageName(deck.language, i18n.locale),
      label: t`language`,
    },
  ].filter((stat) => !!stat);

  return (
    <>
      <p className="flex items-center justify-center gap-2 text-md text-text-2">
        <Avatar name={ownerName} size={26} />
        {viewer === "owner" ? (
          <Trans>Your deck</Trans>
        ) : (
          <Trans>{ownerName} shared a deck with you</Trans>
        )}
      </p>
      <h1 className="mt-3 text-balance break-words text-3xl font-medium tracking-[-0.02em] text-text">
        {deck.name}
      </h1>

      <dl className="mx-auto mt-5 grid max-w-sm auto-cols-fr grid-flow-col divide-x divide-edge">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="grid min-w-0 content-start justify-items-center gap-0.5 px-2"
          >
            <dt className="order-last text-sm text-muted">{stat.label}</dt>
            <dd className="max-w-full truncate text-lg font-semibold text-text">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {deck.samples.length > 0 && (
        <div className="mt-6">
          <ul aria-label={t`Cards from this deck`} className="grid gap-1.5 text-start">
            {deck.samples.map((card, index) => (
              <li
                key={card.term}
                className="enter-card flex items-baseline justify-between gap-4 rounded-md bg-plate-2 px-4 py-3 motion-reduce:[animation-name:enter-fade]"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <span className="min-w-0 break-words text-md font-medium text-text">
                  {card.term}
                </span>
                {card.meaning && (
                  <span className="min-w-0 truncate text-sm text-text-2">{card.meaning}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 flex flex-wrap justify-center gap-x-2 text-sm text-muted">
            {more > 0 && (
              <span>
                <Plural value={more} one="# more card" other="# more cards" />
              </span>
            )}
            {more > 0 && lastAdded && <span aria-hidden="true">·</span>}
            {lastAdded && <span>{t`Last added ${lastAdded}`}</span>}
          </p>
        </div>
      )}

      {viewer === "owner" && (
        <AuthNotice tone="neutral" role="status" className="mt-6">
          <Trans>Anyone with this link can join and review these cards.</Trans>
        </AuthNotice>
      )}
      {viewer === "member" && (
        <AuthNotice tone="success" role="status" className="mt-6">
          <Trans>You are already in this deck.</Trans>
        </AuthNotice>
      )}
      {viewer === "removed" && (
        <AuthNotice tone="neutral" role="status" className="mt-6">
          <Trans>
            You were removed from this deck, so this link cannot add you back. Your reviews are
            kept.
          </Trans>
        </AuthNotice>
      )}
      {(viewer === "signed-out" || viewer === "visitor") && (
        <p className="mx-auto mt-6 max-w-[40ch] text-pretty text-base text-text-2">
          <Trans>
            You review the cards on your own schedule. {ownerName} writes them and does not see your
            progress.
          </Trans>
        </p>
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
        <>
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
          <p className="mx-auto mt-4 max-w-[40ch] text-pretty text-sm text-muted">
            <Trans>{ownerName} will see your name once you join.</Trans>
          </p>
        </>
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
    </>
  );
}

function DeadLink({ preview }: { preview: JoinPreviewOut }) {
  const { deckId } = preview;
  return (
    <>
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
    </>
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
