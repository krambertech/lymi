import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { BookMarked, Sun } from "lucide-react";
import { NavLink } from "./nav-link";
import { SlidingPlate } from "./ui/sliding-plate";

/** Every destination in the phone pill. Review is a button on the screen, never a tab. */
export const PILL_NAV = [
  { to: "/today", label: msg`Today`, icon: Sun, exact: true },
  { to: "/library", label: msg`Library`, icon: BookMarked, exact: false },
] as const;

/**
 * Phone navigation: a floating pill over the content, two destinations wide.
 * Review lives in the Today hero and at the top of Library, so it is never in here.
 * Hidden during review, where the grades own the bottom of the screen.
 */
export function PillNav() {
  const { t, i18n } = useLingui();
  const item =
    "relative inline-flex h-11 select-none items-center gap-2 rounded-full px-4.5 text-base font-medium text-muted transition-[color,scale] duration-150 ease-out [-webkit-touch-callout:none] active:scale-[0.97] motion-reduce:active:scale-100 hoverable:hover:text-text [&.active]:text-text [&_svg]:size-5";
  return (
    <nav
      aria-label={t`Main`}
      className="pointer-events-auto relative flex gap-1 rounded-full bg-plate-2 p-1.5 edge"
    >
      <SlidingPlate
        chosen='[aria-current="page"]'
        attribute="aria-current"
        className="edge inset-y-1.5 rounded-full bg-plate"
      />
      {PILL_NAV.map((n) => (
        <NavLink key={n.to} to={n.to} exact={n.exact} className={item}>
          <n.icon aria-hidden="true" />
          <span>{i18n._(n.label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
