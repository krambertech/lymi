import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { BookMarked, Sun } from "lucide-react";
import { NavLink, type StaticNav } from "./nav-link";

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
export function PillNav({ static: st }: { static?: StaticNav }) {
  const { t, i18n } = useLingui();
  const item =
    "inline-flex h-11 items-center gap-2 rounded-full px-4.5 text-base font-medium text-muted transition-[background-color,color,box-shadow,scale] duration-150 active:scale-[0.97] hoverable:hover:text-text [&.active]:bg-plate [&.active]:text-text [&.active]:edge [&_svg]:size-5";
  return (
    <nav
      aria-label={t`Main`}
      className="pointer-events-auto flex gap-1 rounded-full bg-plate-2 p-1.5 edge"
    >
      {PILL_NAV.map((n) => (
        <NavLink key={n.to} to={n.to} exact={n.exact} className={item} st={st}>
          <n.icon aria-hidden="true" />
          <span>{i18n._(n.label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
