import { BookMarked, Sun } from "lucide-react";
import { NavLink, type StaticNav } from "./NavLink";

/** Every destination in the phone pill. Review is a button on the screen, never a tab. */
export const PILL_NAV = [
  { to: "/", label: "Today", icon: Sun, exact: true },
  { to: "/library", label: "Library", icon: BookMarked, exact: false },
] as const;

/**
 * Phone navigation: a floating frosted pill over the content, two destinations wide.
 * Review lives in the Today hero and at the top of Library, so it is never in here.
 * Hidden during review, where the grades own the bottom of the screen.
 */
export function PillNav({ static: st }: { static?: StaticNav }) {
  const item =
    "inline-flex h-11 items-center gap-2 rounded-full px-4.5 text-base font-medium text-muted transition-[background-color,color,box-shadow,scale] duration-150 active:scale-[0.97] [&.active]:bg-plate [&.active]:text-text [&.active]:edge [&_svg]:size-5";
  return (
    <nav
      aria-label="Main"
      className="pointer-events-auto flex gap-1 rounded-full bg-plate/70 p-1.5 backdrop-blur-xl edge"
    >
      {PILL_NAV.map((n) => (
        <NavLink key={n.to} to={n.to} exact={n.exact} className={item} st={st}>
          <n.icon aria-hidden="true" />
          <span>{n.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
