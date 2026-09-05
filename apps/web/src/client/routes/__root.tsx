import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AddCardSheet } from "../components/AddCardSheet";
import { Lantern } from "../components/Lantern";
import { ApiError, flushOutbox } from "../lib/api";
import { decksQuery, meQuery } from "../lib/queries";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Shell,
});

const NAV = [
  { to: "/", label: "Today" },
  { to: "/decks", label: "Decks" },
  { to: "/settings", label: "Settings" },
] as const;

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const me = useQuery(meQuery);
  const decks = useQuery({ ...decksQuery, enabled: me.isSuccess });
  const [addOpen, setAddOpen] = useState(false);
  const onLogin = location.pathname === "/login";
  const onReview = location.pathname.startsWith("/review");

  useEffect(() => {
    if (me.isError && me.error instanceof ApiError && me.error.status === 401 && !onLogin) {
      navigate({ to: "/login" });
    }
  }, [me.isError, me.error, onLogin, navigate]);

  useEffect(() => {
    if (me.isSuccess) void flushOutbox();
  }, [me.isSuccess]);

  // Global shortcuts: N adds, R reviews. Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
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
  }, [navigate, onReview]);

  if (onLogin) return <Outlet />;

  const totalDue = decks.data?.reduce((n, d) => n + d.due, 0) ?? 0;

  return (
    <div className="flex min-h-dvh w-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col gap-1 border-r border-border bg-surface p-3">
        <Link
          to="/"
          className="flex items-center gap-2 px-2 pb-4 pt-1.5 font-semibold tracking-[-0.02em] text-[17px]"
        >
          <Lantern className="size-5" flicker />
          lymi
        </Link>
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex items-center justify-between rounded-sm px-2.5 py-2 text-[14px] text-ink-2 hover:bg-hover [&.active]:bg-bg [&.active]:text-ink [&.active]:shadow-[0_1px_2px_oklch(0_0_0/0.06)]"
            activeOptions={{ exact: n.to === "/" }}
          >
            <span>{n.label}</span>
            {n.to === "/" && totalDue > 0 && (
              <small className="text-[12px] font-semibold text-amber-text tabular-nums">
                {totalDue}
              </small>
            )}
          </Link>
        ))}
        {decks.data && decks.data.length > 0 && (
          <>
            <div className="mx-2.5 mb-1.5 mt-3.5 text-[12px] font-semibold text-muted">Decks</div>
            {decks.data.map((d) => (
              <Link
                key={d.id}
                to="/decks/$deckId"
                params={{ deckId: d.id }}
                className="flex items-center justify-between rounded-sm px-2.5 py-2 text-[14px] text-ink-2 hover:bg-hover [&.active]:bg-bg [&.active]:text-ink"
              >
                <span className="truncate">{d.name}</span>
                <small className="text-[12px] text-muted tabular-nums">{d.total}</small>
              </Link>
            ))}
          </>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-between rounded-sm px-2.5 py-2 text-[14px] text-ink-2 hover:bg-hover"
        >
          <span>Add word</span>
          <kbd className="rounded-[5px] border border-border bg-bg px-1.5 py-[3px] text-[11px] leading-none text-muted">
            N
          </kbd>
        </button>
      </aside>

      {/* Content */}
      <main className="flex min-w-0 flex-1 flex-col pt-safe">
        <Outlet />
      </main>

      {/* Mobile tab bar, hidden during review so the grade buttons own the bottom edge */}
      {!onReview && (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border bg-bg/95 backdrop-blur pb-safe md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="relative flex min-w-16 flex-col items-center gap-0.5 px-3 pb-2 pt-2.5 text-[12px] text-muted [&.active]:text-ink [&.active]:font-semibold"
            >
              {n.label}
              {n.to === "/" && totalDue > 0 && (
                <span
                  className="absolute right-2 top-2 size-1.5 rounded-full bg-amber"
                  aria-hidden="true"
                />
              )}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex min-w-16 flex-col items-center gap-0.5 px-3 pb-2 pt-2.5 text-[12px] text-muted"
          >
            Add
          </button>
        </nav>
      )}

      <AddCardSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
