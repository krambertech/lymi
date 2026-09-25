import { Link, type LinkComponentProps, type RegisteredRouter } from "@tanstack/react-router";
import { clsx } from "clsx";
import { type ComponentProps, createContext, type ReactNode, useContext, useMemo } from "react";

const StaticNavContext = createContext<{ path: string } | undefined>(undefined);

/**
 * The design pages draw screens that must not navigate. Under this provider every `NavLink` is an
 * inert anchor, active when it points at `path`, and forms skip their autofocus.
 */
export function StaticNavProvider({ path, children }: { path: string; children: ReactNode }) {
  const value = useMemo(() => ({ path }), [path]);
  return <StaticNavContext value={value}>{children}</StaticNavContext>;
}

/** The path a design page pretends to be on, or undefined in the app. */
export function useStaticNav() {
  return useContext(StaticNavContext);
}

type Props<TTo extends string | undefined> = LinkComponentProps<
  "a",
  RegisteredRouter,
  string,
  TTo
> & {
  /** Match the path exactly. Needed for "/", which prefixes everything. */
  exact?: boolean | undefined;
};

/** A router link, or an inert anchor carrying the same classes under `StaticNavProvider`. */
export function NavLink<const TTo extends string | undefined = undefined>({
  exact,
  ...props
}: Props<TTo>) {
  const st = useStaticNav();
  if (st) return <InertLink current={st.path} {...(props as InertProps)} />;
  // TypeScript cannot follow the router's conditional types through a generic spread.
  const link = props as LinkComponentProps<"a", RegisteredRouter, string, string>;
  return <Link {...link} activeOptions={{ exact: !!exact }} />;
}

interface InertProps extends Omit<ComponentProps<"a">, "href"> {
  to?: string | undefined;
  params?: Record<string, string> | undefined;
  search?: unknown;
  hash?: string | undefined;
  // The router's own options, which an anchor must not receive.
  from?: unknown;
  state?: unknown;
  mask?: unknown;
  replace?: unknown;
  resetScroll?: unknown;
  hashScrollIntoView?: unknown;
  viewTransition?: unknown;
  ignoreBlocker?: unknown;
  reloadDocument?: unknown;
  preload?: unknown;
  preloadDelay?: unknown;
  preloadIntentProximity?: unknown;
  activeOptions?: unknown;
  activeProps?: unknown;
  inactiveProps?: unknown;
  startTransition?: unknown;
  unsafeRelative?: unknown;
}

function InertLink({
  current,
  to = "",
  params,
  hash,
  className,
  onClick,
  search: _search,
  from: _from,
  state: _state,
  mask: _mask,
  replace: _replace,
  resetScroll: _resetScroll,
  hashScrollIntoView: _hashScrollIntoView,
  viewTransition: _viewTransition,
  ignoreBlocker: _ignoreBlocker,
  reloadDocument: _reloadDocument,
  preload: _preload,
  preloadDelay: _preloadDelay,
  preloadIntentProximity: _preloadIntentProximity,
  activeOptions: _activeOptions,
  activeProps: _activeProps,
  inactiveProps: _inactiveProps,
  startTransition: _startTransition,
  unsafeRelative: _unsafeRelative,
  ...anchor
}: InertProps & { current: string }) {
  const path = Object.entries(params ?? {}).reduce(
    (filled, [name, value]) => filled.replace(`$${name}`, value),
    to,
  );
  const href = hash ? `${path}#${hash}` : path;
  return (
    <a
      {...anchor}
      href={href}
      className={clsx(className, current === href && "active")}
      aria-current={current === href ? "page" : undefined}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
    />
  );
}
