import { clsx } from "clsx";
import { ArrowLeft, ArrowRight, Menu, Moon, Search, Sun, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { productUrl } from "../../lib/origins";
import { setTheme } from "../../lib/theme";
import { Kbd } from "../Kbd";
import { Wordmark } from "../Logo";
import { neighbours, pageAt, SECTIONS } from "./nav";
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

function SiteNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Documentation" className="grid gap-6">
      {SECTIONS.map((s) => (
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
          href={productUrl()}
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
  const { prev, next } = neighbours(pathname);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);

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

  // The drawer covers the page, so the page behind it should not scroll.
  useEffect(() => {
    if (!menu) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
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
      <header
        className={clsx(
          "sticky top-0 z-(--z-sticky) border-b border-edge bg-canvas",
          HEADER,
          "flex items-center gap-2 px-3 lg:px-6",
        )}
      >
        <button
          type="button"
          aria-label={menu ? "Close the menu" : "Open the menu"}
          aria-expanded={menu}
          onClick={() => setMenu((v) => !v)}
          className="grid size-9 place-items-center rounded-sm text-text-2 lg:hidden hoverable:hover:bg-plate-2"
        >
          {menu ? (
            <X className="size-[18px]" aria-hidden="true" />
          ) : (
            <Menu className="size-[18px]" aria-hidden="true" />
          )}
        </button>

        <div className="flex items-center gap-2 pe-2">
          <a href="/" aria-label="Lymi home" className="rounded-xs">
            <Wordmark size={17} className="text-text" title="Lymi" />
          </a>
          <span aria-hidden="true" className="text-lg text-faint">
            /
          </span>
          <a href="/docs" className="rounded-xs text-base text-text-2 hoverable:hover:text-text">
            docs
          </a>
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setSearch(true)}
          className="flex h-9 items-center gap-2 rounded-sm bg-plate-2 pl-2.5 pr-1.5 text-base text-muted transition-colors duration-150 hoverable:hover:text-text sm:w-56"
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="hidden flex-1 text-start sm:block">Search</span>
          <span className="hidden sm:block">
            <Kbd>⌘K</Kbd>
          </span>
        </button>

        <ThemeToggle />

        <a
          href={productUrl()}
          className="hidden h-9 items-center rounded-sm px-3 text-base text-text-2 transition-colors duration-150 sm:inline-flex hoverable:hover:bg-plate-2 hoverable:hover:text-text"
        >
          Open Lymi
        </a>
      </header>

      {menu && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-(--z-dropdown) overflow-y-auto border-t border-edge bg-canvas px-4 py-6 lg:hidden">
          <SiteNav pathname={pathname} onNavigate={() => setMenu(false)} />
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[88rem] items-start gap-10 px-4 lg:px-6">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-52 shrink-0 overflow-y-auto py-8 lg:block">
          <SiteNav pathname={pathname} />
        </aside>

        <main id="doc-content" className="min-w-0 flex-1 py-10 lg:py-12">
          {/* The reference carries field tables, so it gets a wider column than prose does. */}
          <div
            className={clsx(
              "mx-auto",
              pathname === "/docs/api" ? "max-w-[52rem]" : "max-w-[44rem]",
            )}
          >
            {page && (
              <header className="mb-8">
                {/* On a phone the sidebar is behind a button, so the page says where it sits. */}
                <p className="mb-2 text-sm font-medium text-muted lg:hidden">{page.section}</p>
                <h1 className="text-3xl font-medium tracking-[-0.02em] text-text">{page.title}</h1>
              </header>
            )}
            {children}

            {(prev || next) && (
              <nav
                aria-label="Nearby pages"
                className="mt-16 grid gap-3 border-t border-edge pt-6 sm:grid-cols-2"
              >
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

        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-48 shrink-0 overflow-y-auto py-12 xl:block">
          <Toc path={pathname} />
        </aside>
      </div>

      <SearchDialog open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
