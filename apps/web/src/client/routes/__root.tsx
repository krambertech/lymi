import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AddCardSheet } from "../components/AddCardSheet";
import { ApiError, flushOutbox } from "../lib/api";
import { decksQuery, meQuery } from "../lib/queries";
import { rememberSignedIn } from "../lib/session-hint";
import { Sidebar, TabBar } from "../views/Shell";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Shell,
});

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const me = useQuery(meQuery);
  const decks = useQuery({ ...decksQuery, enabled: me.isSuccess });
  const [addOpen, setAddOpen] = useState(false);
  // Consent is a stop inside another app's sign-in; the design page and the docs are their
  // own documents. The docs read signed out, so they must never redirect to /login.
  // The site root is always the public, server-rendered landing page, so it wears no app chrome.
  const atRoot = location.pathname === "/";
  const bare =
    location.pathname === "/login" ||
    location.pathname === "/consent" ||
    location.pathname.startsWith("/design") ||
    location.pathname.startsWith("/docs") ||
    atRoot;
  const onReview = location.pathname.startsWith("/review");

  useEffect(() => {
    if (me.isError && me.error instanceof ApiError && me.error.status === 401 && !bare) {
      navigate({ to: "/login" });
    }
  }, [me.isError, me.error, bare, navigate]);

  // One learner's cards are nobody else's business, so every screen but the landing page and
  // the docs asks not to be indexed. The hint for what to paint first at the root is kept here
  // too, where both answers to /api/me pass through.
  useEffect(() => {
    const publicPage = atRoot ? me.isError : location.pathname.startsWith("/docs");
    let tag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (publicPage) {
      tag?.remove();
      return;
    }
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "robots";
      document.head.appendChild(tag);
    }
    tag.content = "noindex, nofollow";
  }, [location.pathname, atRoot, me.isError]);

  useEffect(() => {
    if (me.isSuccess) rememberSignedIn(true);
    if (me.isError && me.error instanceof ApiError && me.error.status === 401) {
      rememberSignedIn(false);
    }
  }, [me.isSuccess, me.isError, me.error]);

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
        setAddOpen(true);
      }
      if ((e.key === "r" || e.key === "R") && !onReview) {
        e.preventDefault();
        navigate({ to: "/review" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, onReview, bare]);

  if (bare) return <Outlet />;

  const totalDue = decks.data?.reduce((n, d) => n + d.due, 0) ?? 0;

  return (
    <div className="@container flex min-h-dvh w-full">
      <Sidebar
        decks={decks.data}
        totalDue={totalDue}
        onAdd={() => setAddOpen(true)}
        className="hidden @3xl:flex"
      />
      <main className="@container flex min-w-0 flex-1 flex-col pt-safe">
        <Outlet />
      </main>
      {!onReview && (
        <TabBar
          totalDue={totalDue}
          onAdd={() => setAddOpen(true)}
          className="fixed inset-x-0 bottom-0 z-(--z-sticky) @3xl:hidden"
        />
      )}
      <AddCardSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
