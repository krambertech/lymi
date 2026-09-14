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
import { lazy, Suspense, useEffect, useRef } from "react";
import { AddCardSheet } from "../components/AddCardSheet";
import { NewDeckSheet } from "../components/NewDeckSheet";
import { PillNav } from "../components/PillNav";
import { Toaster } from "../components/ui/toast";
import { TooltipProvider } from "../components/ui/tooltip";
import { AddCardProvider, useAddCard } from "../lib/add-card";
import { ApiError, api } from "../lib/api";
import { LearnerAvatarProvider } from "../lib/avatar";
import { flushOutbox } from "../lib/grades";
import {
  activate,
  bootstrapLanguage,
  isAppLanguage,
  isBareShell,
  pickLocale,
  readStoredLanguage,
} from "../lib/i18n";
import { publicSiteUrl } from "../lib/origins";
import { decksQuery, meQuery, settingsQuery } from "../lib/queries";
import { Streak, useSettleToday } from "../lib/streak";
import { SignOutProvider, useSignOut } from "../lib/use-sign-out";
import { AppShell, Sidebar } from "../views/Shell";

// Local and isolated preview builds only. Vite drops the import from production.
const DevPanel =
  import.meta.env.DEV || import.meta.env.LYMI_APP_PREVIEW
    ? lazy(() => import("../dev/DevPanel"))
    : null;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
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
            <Toaster label={t`Notifications`} closeLabel={t`Dismiss`} />
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
  const settings = useQuery({ ...settingsQuery, enabled: !bare && me.isSuccess });
  const leave = useSignOut();
  useSettleToday(!bare && me.isSuccess);

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
      navigate({ to: "/login", search: { returnTo } });
    }
  }, [me.isError, me.error, bare, navigate]);

  // The one place queued grades replay: after sign-in and whenever the connection returns.
  useEffect(() => {
    if (!me.isSuccess) return;
    const flush = () => {
      void flushOutbox().then((sent) => {
        if (sent > 0) void queryClient.invalidateQueries({ queryKey: ["queue"] });
      });
    };
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [me.isSuccess, queryClient]);

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

  if (bare) return <Outlet />;

  return (
    <LearnerAvatarProvider enabled={me.isSuccess}>
      <AppShell
        // A session closes the app around it. The phone already hid its pill during review; the
        // rail stayed up with search, capture, every deck and the profile, which made focus a
        // phone-only idea. Both go now, and both come back when the session ends.
        sidebar={
          onReview ? undefined : (
            <Sidebar
              decks={decks.data}
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
      >
        <Outlet />
      </AppShell>
      <AddCardSheet
        open={add.open === "card"}
        onOpenChange={(v) => (v ? add.openCard() : add.close("card"))}
        deckId={add.deckId}
        onCreateDeck={add.openDeck}
      />
      <NewDeckSheet
        open={add.open === "deck"}
        onOpenChange={(v) => (v ? add.openDeck() : add.close("deck"))}
      />
    </LearnerAvatarProvider>
  );
}
