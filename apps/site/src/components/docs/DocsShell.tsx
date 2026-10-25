import { clsx } from "clsx";
import { ArrowLeft, ArrowRight, BookOpen, Braces, Menu, Moon, Search, Sun, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { openLymiUrl } from "../../lib/origins";
import { setTheme } from "../../lib/theme";
import { Kbd } from "../Kbd";
import { AppTile, Wordmark } from "../Logo";
import { neighbours, pageAt, sidebarFor, TABS, tabOf } from "./nav";
import { SearchDialog } from "./Search";
import { Toc } from "./Toc";

const HEADER = "h-14";

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const read = () => setDark(document.documentElement.dataset.theme === "dark");
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      aria-label={dark ? "Switch to the light theme" : "Switch to the dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="grid size-9 place-items-center rounded-sm text-text-2 transition-[background-color,color,scale] duration-150 active:scale-[0.97] hoverable:hover:bg-plate-2 hoverable:hover:text-text"
    >
      {dark ? (
        <Moon className="size-[18px]" aria-hidden="true" />
      ) : (
        <Sun className="size-[18px]" aria-hidden="true" />
      )}
    </button>
  );
}

const navItem =
  "flex h-8 items-center rounded-xs px-2.5 text-base text-text-2 transition-[background-color,color] duration-150 hoverable:hover:bg-plate-2 hoverable:hover:text-text [&.active]:bg-plate [&.active]:text-text [&.active]:edge-inset [&.active]:font-medium";

const TAB_ICONS = { guides: BookOpen, api: Braces } as const;

/** Guides or API, at the top of the sidebar: the current half is filled with ink. */
function SectionSwitch({ pathname }: { pathname: string }) {
  const current = tabOf(pathname);
  return (
    <nav
      aria-label="Documentation sections"
      className="mb-7 grid grid-cols-2 gap-0.5 rounded-sm bg-plate-2 p-0.5"
    >
      {TABS.map((t) => {
        const on = t.id === current.id;
        const Icon = TAB_ICONS[t.id];
        return (
          <a
            key={t.id}
            href={t.to}
            aria-current={on ? "true" : undefined}
            className={clsx(
              "flex h-9 items-center justify-center gap-2 rounded-xs text-md font-medium transition-[background-color,color] duration-150",
              on ? "bg-text text-canvas" : "text-text-2 hoverable:hover:text-text",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {t.label}
          </a>
        );
      })}
    </nav>
  );
}

function SiteNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Documentation" className="grid gap-6">
      {sidebarFor(pathname).map((s) => (
        <div key={s.name} className="grid gap-0.5">
          <p className="mb-1 px-2.5 text-xs font-medium text-muted">{s.name}</p>
          {s.pages.map((p) => (
            <a
              key={p.to}
              href={p.to}
              onClick={onNavigate}
              className={clsx(navItem, pathname === p.to && "active")}
              aria-current={pathname === p.to ? "page" : undefined}
            >
              {p.nav}
            </a>
          ))}
        </div>
      ))}
      {/* The header's own link is hidden on a phone, so the drawer carries the way back. */}
      {onNavigate && (
        <a
          href={openLymiUrl()}
          className={clsx(navItem, "border-t border-edge !h-10 !rounded-none pt-2")}
        >
          Open Lymi
        </a>
      )}
    </nav>
  );
}

/**
 * The documentation site: header, the map on the left, the page in the middle, its contents
 * on the right. It sits outside the app shell, so it reads signed out.
 */
export function DocsShell({ pathname, children }: { pathname: string; children: ReactNode }) {
  const page = pageAt(pathname);
  // A resource page carries field lists and requests, so it gets a wider column than prose does.
  const resource = pathname.startsWith("/docs/api/");
  const { prev, next } = neighbours(pathname);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [searchKey, setSearchKey] = useState("⌘K");
  const menuButton = useRef<HTMLButtonElement>(null);

  // The server renders the Mac label; other keyboards learn theirs once the page runs.
  useEffect(() => {
    if (!/Mac|iPhone|iPad|iPod/.test(navigator.platform)) setSearchKey("Ctrl K");
  }, []);

  // Cmd-K opens search. / does too, the way every docs site does.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearch(true);
      }
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: navigating is the trigger, not the value
  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  // A long sidebar opens on the page being read, not on its first section.
  // biome-ignore lint/correctness/useExhaustiveDependencies: navigating is the trigger, not the value
  useEffect(() => {
    document
      .querySelector<HTMLElement>("#doc-sidebar [aria-current='page']")
      ?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  // The drawer covers the page, so the page behind it should not scroll, and Escape closes it.
  useEffect(() => {
    if (!menu) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      menuButton.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#doc-content"
        className="sr-only rounded-sm bg-plate px-3 py-2 text-base text-text edge focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-(--z-tooltip)"
      >
        Skip to the page
      </a>
      {/* The header shares the page's width, so the logo sits over the sidebar's labels. */}
      <header className="sticky top-0 z-(--z-sticky) border-b border-edge bg-canvas">
        <div className={clsx("mx-auto flex max-w-[88rem] items-center gap-2 px-4 lg:px-6", HEADER)}>
          <button
            ref={menuButton}
            type="button"
            aria-label={menu ? "Close the menu" : "Open the menu"}
            aria-expanded={menu}
            aria-controls="doc-menu"
            onClick={() => setMenu((v) => !v)}
            className="-ms-2 grid size-9 place-items-center rounded-sm text-text-2 lg:hidden hoverable:hover:bg-plate-2"
          >
            {menu ? (
              <X className="size-[18px]" aria-hidden="true" />
            ) : (
              <Menu className="size-[18px]" aria-hidden="true" />
            )}
          </button>
          {/* Straight after its button, so Tab walks from the button into the links. */}
          {menu && (
            <div
              id="doc-menu"
              className="fixed inset-x-0 bottom-0 top-14 z-(--z-dropdown) overflow-y-auto border-t border-edge bg-canvas px-4 py-6 lg:hidden"
            >
              <SectionSwitch pathname={pathname} />
              <SiteNav pathname={pathname} onNavigate={() => setMenu(false)} />
            </div>
          )}

          <a
            href="/docs"
            aria-label="Lymi docs"
            className="flex h-10 shrink-0 items-center gap-2.5 rounded-sm pe-2"
          >
            <AppTile size={26} />
            <span className="flex items-center gap-1.5" aria-hidden="true">
              <Wordmark size={17} className="text-text" />
              <i className="size-1 rounded-full bg-faint" />
              <span className="text-md font-medium tracking-[-0.01em] text-muted">docs</span>
            </span>
          </a>

          <div className="flex-1" />

          <button
            type="button"
            aria-label="Search the docs"
            onClick={() => setSearch(true)}
            className="flex h-9 items-center gap-2 rounded-sm bg-plate-2 ps-2.5 pe-1.5 text-base text-muted transition-colors duration-150 hoverable:hover:text-text sm:w-56"
          >
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden flex-1 text-start sm:block">Search</span>
            <span className="hidden sm:block">
              <Kbd>{searchKey}</Kbd>
            </span>
          </button>

          <ThemeToggle />

          <a
            href={openLymiUrl()}
            className="hidden h-9 items-center rounded-sm px-3 text-base text-text-2 transition-colors duration-150 sm:inline-flex hoverable:hover:bg-plate-2 hoverable:hover:text-text"
          >
            Open Lymi
          </a>
        </div>
      </header>

      {/* Under the open drawer the page is out of reach, so Tab never lands on a link it hides. */}
      <div
        className="mx-auto flex w-full max-w-[88rem] items-start gap-10 px-4 lg:px-6"
        inert={menu}
      >
        {/* Pulled back by the links' inset, so their labels line up with the logo above. */}
        <aside
          id="doc-sidebar"
          className="sticky top-14 -ms-2.5 hidden h-[calc(100dvh-3.5rem)] w-[13.625rem] shrink-0 overflow-y-auto py-8 lg:block"
        >
          <SectionSwitch pathname={pathname} />
          <SiteNav pathname={pathname} />
        </aside>

        <main id="doc-content" className="min-w-0 flex-1 py-10 lg:py-12">
          <div className={resource ? "max-w-[50rem]" : "max-w-[44rem]"}>
            {/* The overview draws its own, larger heading. */}
            {page && pathname !== "/docs" && (
              <header className="mb-8">
                {/* On a phone the sidebar is behind a button, so the page says where it sits. */}
                <p className="mb-2 text-sm font-medium text-muted lg:hidden">{page.section}</p>
                <h1 className="text-3xl font-medium tracking-[-0.02em] text-text">{page.title}</h1>
              </header>
            )}
            {children}

            {(prev || next) && (
              <nav aria-label="Nearby pages" className="mt-16 grid gap-3 sm:grid-cols-2">
                {prev ? (
                  <a
                    href={prev.to}
                    className="group flex items-center gap-3 rounded-md p-3 text-start transition-colors duration-150 edge hoverable:hover:bg-plate-2"
                  >
                    <ArrowLeft
                      className="size-4 shrink-0 text-faint transition-transform duration-150 group-hover:-translate-x-0.5 group-hover:text-text"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs text-muted">Previous</span>
                      <span className="block truncate text-base text-text">{prev.nav}</span>
                    </span>
                  </a>
                ) : (
                  <span />
                )}
                {next && (
                  <a
                    href={next.to}
                    className="group flex items-center justify-end gap-3 rounded-md p-3 text-end transition-colors duration-150 edge sm:col-start-2 hoverable:hover:bg-plate-2"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs text-muted">Next</span>
                      <span className="block truncate text-base text-text">{next.nav}</span>
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-text"
                      aria-hidden="true"
                    />
                  </a>
                )}
              </nav>
            )}

            <footer className="mt-12 border-t border-edge pt-6 text-sm text-muted">
              <nav aria-label="Policies and support" className="flex flex-wrap gap-5">
                <a href="/privacy" className="rounded-xs hoverable:hover:text-text">
                  Privacy
                </a>
                <a href="/terms" className="rounded-xs hoverable:hover:text-text">
                  Terms
                </a>
                <a href="/support" className="rounded-xs hoverable:hover:text-text">
                  Support
                </a>
              </nav>
            </footer>
          </div>
        </main>

        <aside
          className={clsx(
            "sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-48 shrink-0 overflow-y-auto py-12 xl:block",
          )}
        >
          <Toc path={pathname} />
        </aside>
      </div>

      <SearchDialog open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
