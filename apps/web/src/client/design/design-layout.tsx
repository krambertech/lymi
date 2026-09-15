import { Link, Outlet } from "@tanstack/react-router";
import { clsx } from "clsx";
import { Menu } from "lucide-react";
import { MotionConfig } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { IconButton } from "../components/button";
import { AppTile, Wordmark } from "../components/logo";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { Field, FieldLabel } from "../components/ui/field";
import { Switch } from "../components/ui/switch";
import { setTheme } from "../lib/theme";
import { DocLink } from "./doc-link";
import { useForcedStates } from "./forced-states";
import { ROOM_THEMES, usePageTheme } from "./frame";
import { IconToggle } from "./icon-toggle";
import { type DocRef, FOUNDATIONS, GROUPS, SCREENS } from "./registry";

const heading = "mx-2.5 mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted";
const item =
  "flex h-11 items-center rounded-sm px-2.5 text-base text-text-2 transition-[background-color,color,box-shadow] duration-150 hoverable:hover:bg-hover hoverable:hover:text-text md:h-9 [&.active]:edge [&.active]:bg-plate [&.active]:text-text";

/** The design system's own frame: a rail like the app's, and one page at a time beside it. */
export function DesignLayout() {
  const [menu, setMenu] = useState(false);
  // The page shows the room it is in; picking one stores it, so System is left to Settings.
  const theme = usePageTheme();
  const motion = usePageMotion();
  useForcedStates();

  useEffect(() => {
    const initial = document.title;
    return () => {
      document.title = initial;
    };
  }, []);

  return (
    <MotionConfig reducedMotion={motion.reduced ? "always" : "user"}>
      <div className="@container/shell flex min-h-dvh bg-canvas text-text">
        <div className="sticky top-0 hidden h-dvh w-64 shrink-0 self-start @3xl/shell:block">
          <aside className="flex h-full flex-col border-e border-edge bg-rail">
            <div className="mx-3 mt-8 mb-6 flex h-10 items-center justify-between gap-2 ps-2.5">
              <Home />
              <IconToggle label="Theme" value={theme} onChange={setTheme} options={ROOM_THEMES} />
            </div>
            <nav aria-label="Design system" className="min-h-0 flex-1 overflow-y-auto px-3 pb-8">
              <Contents />
            </nav>
            <MotionSwitch {...motion} className="border-t border-edge px-5.5 py-4" />
          </aside>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-(--z-sticky) flex h-14 items-center gap-2 border-b border-edge bg-canvas px-3 @3xl/shell:hidden">
            <IconButton label="Contents" onClick={() => setMenu(true)}>
              <Menu />
            </IconButton>
            <Home className="me-auto" />
            <IconToggle label="Theme" value={theme} onChange={setTheme} options={ROOM_THEMES} />
          </header>
          <main className="@container mx-auto w-full max-w-[1120px] flex-1 px-5 pt-8 pb-16 @3xl/shell:px-10">
            <Outlet />
          </main>
        </div>

        <Dialog open={menu} onOpenChange={setMenu}>
          <DialogContent className="w-[min(92vw,440px)]">
            <DialogTitle>Design system</DialogTitle>
            <nav aria-label="Design system" className="-mx-3 max-h-[70dvh] overflow-y-auto px-3">
              <Contents onNavigate={() => setMenu(false)} />
            </nav>
            <MotionSwitch {...motion} />
          </DialogContent>
        </Dialog>
      </div>
    </MotionConfig>
  );
}

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeSystemMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Reduced motion for the whole design system, starting from the system setting. It lives on the
 * root, because the rewritten stylesheet no longer reads the media query itself.
 */
function usePageMotion() {
  const system = useSyncExternalStore(
    subscribeSystemMotion,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );
  const [picked, setPicked] = useState<boolean | null>(null);
  const reduced = picked ?? system;
  useEffect(() => {
    if (!reduced) return;
    const root = document.documentElement;
    root.dataset.motion = "reduce";
    return () => {
      delete root.dataset.motion;
    };
  }, [reduced]);
  return { reduced, setReduced: (next: boolean) => setPicked(next === system ? null : next) };
}

function MotionSwitch({
  reduced,
  setReduced,
  className,
}: {
  reduced: boolean;
  setReduced: (reduced: boolean) => void;
  className?: string | undefined;
}) {
  return (
    <Field orientation="horizontal" className={clsx("justify-between gap-4", className)}>
      <FieldLabel className="text-base text-text-2">Reduce motion</FieldLabel>
      <Switch checked={reduced} onCheckedChange={setReduced} />
    </Field>
  );
}

function Home({ className }: { className?: string | undefined }) {
  return (
    <Link
      to="/design/$page"
      params={{ page: "brand" }}
      aria-label="Lymi design system"
      className={clsx("flex h-10 items-center gap-2.5 rounded-sm", className)}
    >
      <AppTile size={28} />
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <Wordmark size={18} className="text-text" />
        <i className="size-1 rounded-full bg-faint" />
        <span className="text-md font-medium tracking-[-0.01em] text-muted">design</span>
      </span>
    </Link>
  );
}

function Contents({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const sections: { title: string; links: { key: string; name: string; to: DocRef }[] }[] = [
    {
      title: "Foundations",
      links: FOUNDATIONS.map((f) => ({
        key: f.slug,
        name: f.title,
        to: { kind: "page", page: f.slug },
      })),
    },
    {
      title: "Components",
      links: GROUPS.map((g) => ({
        key: g.slug,
        name: g.title,
        to: { kind: "group", group: g.slug },
      })),
    },
    {
      title: "Screens",
      links: SCREENS.map((s) => ({
        key: s.slug,
        name: s.name,
        to: { kind: "screen", screen: s.slug },
      })),
    },
  ];
  return (
    <div className="grid gap-7">
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className={heading}>{section.title}</h2>
          <ul className="grid gap-0.5">
            {section.links.map((l) => (
              <li key={l.key}>
                <DocLink to={l.to} className={item} onClick={onNavigate}>
                  {l.name}
                </DocLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
