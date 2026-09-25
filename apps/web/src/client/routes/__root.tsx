import { useLingui } from "@lingui/react/macro";
import type { QueryClient } from "@tanstack/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { AddCardSheet } from "../components/add-card-sheet";
import { ShellChrome } from "../components/layout/shell-chrome";
import { NewDeckSheet } from "../components/new-deck-sheet";
import { PillNav } from "../components/pill-nav";
import { Toaster, toast } from "../components/ui/toast";
import { TooltipProvider } from "../components/ui/tooltip";
import { AddCardProvider, useAddCard } from "../lib/add-card";
import { ApiError, api } from "../lib/api";
import { LearnerAvatarProvider } from "../lib/avatar";
import {
  activate,
  bootstrapLanguage,
  isAppLanguage,
  isBareShell,
  pickLocale,
  readStoredLanguage,
} from "../lib/i18n";
import { publicSiteUrl } from "../lib/origins";
import { useRouteFocus } from "../lib/page-focus";
import { decksQuery, meQuery, seriesQuery, settingsQuery } from "../lib/queries";
import { shortQuote } from "../lib/short-quote";
import { Streak, StreakPlace, useSettleToday } from "../lib/streak";
import { SignOutProvider, useSignOut } from "../lib/use-sign-out";
import { warmCache } from "../lib/warm-cache";
import { claimWrites, flushWrites, onNotice } from "../lib/writes";
import { AppShell, Sidebar } from "../views/shell";

// Local and isolated preview builds only. Vite drops the import from production.
const DevPanel =
  import.meta.env.DEV || import.meta.env.LYMI_APP_PREVIEW
    ? lazy(() => import("../dev/dev-panel"))
    : null;

/**
 * A review has no pill nav, so a toast clears the grade strip instead. On a phone the strip sits on
 * the bottom edge; on a desktop its top is 116 px up while the card fits, or 692 px down once the
 * card reaches its 600 px cap; from 92 rem the corner is beside the strip.
 */
const REVIEW_TOAST_INSET =
  "[--toast-inset:calc(env(safe-area-inset-bottom)+108px)] md:[--toast-inset:max(128px,calc(100dvh-680px))] min-[92rem]:[--toast-inset:1rem]";

/** The streak is a place, so its open state is here: Back closes it, and a reload or a link keeps it. ADR 0017. */
const RootSearch = z.object({ streak: z.literal(true).optional().catch(undefined) });

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  validateSearch: RootSearch,
  component: Root,
});

function Root() {
  const { t } = useLingui();
  const { pathname } = useLocation();
  return (
    // Under reduced motion, Motion drops travel and scale and keeps the fades.
    <MotionConfig reducedMotion="user">
      {/* One provider, so the next tooltip along a row of controls opens at once. */}
      <TooltipProvider>
        <AddCardProvider>
          <SignOutProvider>
            <Shell />
            <Toaster
              aria-label={t`Notifications`}
              closeLabel={t`Dismiss`}
              viewportClassName={pathname.startsWith("/review") ? REVIEW_TOAST_INSET : undefined}
            />
            {/* Personas and seeds mean nothing on the design system pages. */}
            {DevPanel && !pathname.startsWith("/design") && (
              <Suspense fallback={null}>
                <DevPanel />
              </Suspense>
            )}
          </SignOutProvider>
        </AddCardProvider>
      </TooltipProvider>
    </MotionConfig>
  );
}

function Shell() {
  const { t } = useLingui();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const add = useAddCard();
  const seededLanguage = useRef(false);
  const activeDeckId = location.pathname.match(/^\/library\/([^/]+)/)?.[1];
  // Consent is a stop inside another app's sign-in; the local design page is its own document.
  const bare = isBareShell(location.pathname);
  const onReview = location.pathname.startsWith("/review");
  const me = useQuery({ ...meQuery, enabled: !bare });
  const decks = useQuery({ ...decksQuery, enabled: !bare && me.isSuccess });
  const series = useQuery({ ...seriesQuery, enabled: !bare && me.isSuccess });
  const settings = useQuery({ ...settingsQuery, enabled: !bare && me.isSuccess });
  const leave = useSignOut();
  useSettleToday(!bare && me.isSuccess);
  useRouteFocus();

  const appLanguage = settings.data?.appLanguage;
  useEffect(() => {
    if (bare) {
      bootstrapLanguage(location.pathname);
      return;
    }
    if (!settings.isSuccess) return;
    if (isAppLanguage(appLanguage)) {
      // The persisted cache is written a second late, so a snapshot hydrated on boot can predate
      // the stored choice; the server, not the snapshot, gets to correct it.
      if (!settings.isFetchedAfterMount && appLanguage !== readStoredLanguage()) {
        void queryClient.invalidateQueries(settingsQuery);
        return;
      }
      activate(appLanguage);
      return;
    }
    if (appLanguage !== null || seededLanguage.current) return;

    const locale = pickLocale();
    seededLanguage.current = true;
    activate(locale);
    void api
      .updateSettings({ appLanguage: locale })
      .then((value) => queryClient.setQueryData(settingsQuery.queryKey, value))
      .catch(() => {
        seededLanguage.current = false;
      });
  }, [
    appLanguage,
    bare,
    location.pathname,
    queryClient,
    settings.isSuccess,
    settings.isFetchedAfterMount,
  ]);

  useEffect(() => {
    if (me.isError && me.error instanceof ApiError && me.error.status === 401 && !bare) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      // The Worker already sends a signed-out Explore visit to the site; this covers a shell the
      // service worker served.
      if (/^\/explore(?:\/|$)/.test(window.location.pathname)) {
        window.location.replace(publicSiteUrl(returnTo));
        return;
      }
      navigate({ to: "/login", search: { returnTo } });
    }
  }, [me.isError, me.error, bare, navigate]);

  // Queued writes and grades replay after sign-in, when the connection returns, and when the app
  // comes back to the front; the lists refetch once something landed.
  const learnerId = me.data?.id;
  useEffect(() => {
    if (!learnerId) return;
    claimWrites(learnerId);
    const flush = () => {
      void flushWrites().then((flushed) => {
        if (flushed.sent > 0) void queryClient.invalidateQueries({ queryKey: ["decks"] });
        if (flushed.sent + flushed.graded > 0) {
          void queryClient.invalidateQueries({ queryKey: ["queue"] });
        }
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") flush();
    };
    flush();
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [learnerId, queryClient]);

  // Every deck's cards, sections and draw are fetched once while online, so each opens offline.
  // Keyed on the ids, not the list, so a review moving a count does not start it again.
  const deckIds = decks.data?.map((deck) => deck.id).join(" ");
  useEffect(() => {
    if (!deckIds) return;
    const idle = window.setTimeout(() => void warmCache(queryClient, deckIds.split(" ")), 2000);
    return () => window.clearTimeout(idle);
  }, [deckIds, queryClient]);

  // A write made offline that the server would not take is said once, naming what it was.
  useEffect(
    () =>
      onNotice((notice) => {
        const label = shortQuote(notice.label);
        if (notice.reason === "skipped") {
          const deckName = notice.deckName;
          toast.add({
            title: t`“${label}” was already in ${deckName}, so the copy added offline was left out.`,
          });
        } else {
          const reason = notice.message;
          toast.add({
            type: "error",
            title: label
              ? t`A change to “${label}” made offline couldn’t be saved. ${reason}`
              : t`A change made offline couldn’t be saved. ${reason}`,
          });
        }
        void queryClient.invalidateQueries({ queryKey: ["decks"] });
        void queryClient.invalidateQueries({ queryKey: ["cards"] });
      }),
    [queryClient, t],
  );

  // Global shortcuts: N adds, R reviews. Ignored while typing.
  useEffect(() => {
    if (bare) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        add.openCard(activeDeckId);
      }
      if ((e.key === "r" || e.key === "R") && !onReview) {
        e.preventDefault();
        navigate({ to: "/review" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, onReview, bare, add, activeDeckId]);

  const signedIn = me.isSuccess;
  const learnerName = me.data?.name;
  const learnerEmail = me.data?.email;
  const { openCard, openDeck } = add;
  const { signOut, busy: signingOut } = leave;
  // One object until something in it changes, so a query tick does not re-render every screen's bar.
  const chrome = useMemo(
    () => ({
      streak: signedIn ? <Streak variant="phone" /> : undefined,
      name: learnerName,
      email: learnerEmail,
      docsUrl: publicSiteUrl("/docs"),
      onAddCard: () => openCard(),
      onCreateDeck: openDeck,
      onSignOut: signOut,
      signingOut,
    }),
    [signedIn, learnerName, learnerEmail, openCard, openDeck, signOut, signingOut],
  );

  if (bare) return <Outlet />;

  return (
    <LearnerAvatarProvider enabled={me.isSuccess}>
      <ShellChrome value={chrome}>
        <AppShell
          // A session closes the app around it. The phone already hid its pill during review; the
          // rail stayed up with search, capture, every deck and the profile, which made focus a
          // phone-only idea. Both go now, and both come back when the session ends.
          sidebar={
            onReview ? undefined : (
              <Sidebar
                decks={decks.data}
                series={series.data}
                name={me.data?.name}
                email={me.data?.email}
                docsUrl={publicSiteUrl("/docs")}
                onAdd={() => add.openCard()}
                onCreateDeck={add.openDeck}
                onSignOut={leave.signOut}
                signingOut={leave.busy}
                streak={me.isSuccess ? <Streak variant="rail" /> : undefined}
                className="hidden @3xl/shell:flex"
              />
            )
          }
          nav={onReview ? undefined : <PillNav />}
          fill={onReview}
        >
          <Outlet />
        </AppShell>
      </ShellChrome>
      <AddCardSheet
        open={add.open === "card"}
        onOpenChange={(v) => (v ? add.openCard() : add.close("card"))}
        deckId={add.deckId}
        sectionId={add.sectionId}
        onCreateDeck={add.openDeck}
      />
      <NewDeckSheet
        open={add.open === "deck"}
        onOpenChange={(v) => (v ? add.openDeck() : add.close("deck"))}
      />
      {me.isSuccess && <StreakPlace />}
    </LearnerAvatarProvider>
  );
}
