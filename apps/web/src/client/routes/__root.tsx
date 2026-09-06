import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { AddCardSheet } from "../components/AddCardSheet";
import { PillNav } from "../components/PillNav";
import { AddCardProvider, useAddCard } from "../lib/add-card";
import { ApiError, flushOutbox } from "../lib/api";
import { decksQuery, meQuery } from "../lib/queries";
import { AppShell, Sidebar } from "../views/Shell";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Root,
});

function Root() {
  return (
    <AddCardProvider>
      <Shell />
    </AddCardProvider>
  );
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const me = useQuery(meQuery);
  const decks = useQuery({ ...decksQuery, enabled: me.isSuccess });
  const add = useAddCard();
  // Consent is a stop inside another app's sign-in; the design page and the docs are their
  // own documents. The docs read signed out, so they must never redirect to /login.
  const bare =
    location.pathname === "/login" ||
    location.pathname === "/consent" ||
    location.pathname.startsWith("/design") ||
    location.pathname.startsWith("/docs");
  const onReview = location.pathname.startsWith("/review");

  useEffect(() => {
    if (me.isError && me.error instanceof ApiError && me.error.status === 401 && !bare) {
      navigate({ to: "/login" });
    }
  }, [me.isError, me.error, bare, navigate]);

  useEffect(() => {
    if (me.isSuccess) void flushOutbox();
  }, [me.isSuccess]);

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
        add.openCard();
      }
      if ((e.key === "r" || e.key === "R") && !onReview) {
        e.preventDefault();
        navigate({ to: "/review" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, onReview, bare, add]);

  if (bare) return <Outlet />;

  return (
    <>
      <AppShell
        sidebar={
          <Sidebar
            decks={decks.data}
            name={me.data?.name}
            onAdd={() => add.openCard()}
            onCreateDeck={add.openDeck}
            className="hidden @3xl:flex"
          />
        }
        nav={onReview ? undefined : <PillNav />}
      >
        <Outlet />
      </AppShell>
      <AddCardSheet
        open={add.open === "card"}
        onOpenChange={(v) => (v ? add.openCard() : add.close())}
        deckId={add.deckId}
      />
    </>
  );
}
