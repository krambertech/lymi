import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

/** The open screen's title, for focus to land on when the control that held it is gone. */
export function pageTitle() {
  const title = document.querySelector<HTMLElement>("main h1");
  if (title && !title.hasAttribute("tabindex")) title.tabIndex = -1;
  return title;
}

/**
 * On a move to another screen, focus its title when the pressed link went with the old one, so a
 * screen reader announces where the learner is and Tab starts from the top of it.
 */
export function useRouteFocus() {
  const router = useRouter();
  useEffect(
    () =>
      router.subscribe("onRendered", ({ pathChanged }) => {
        if (!pathChanged) return;
        requestAnimationFrame(() => {
          const active = document.activeElement;
          if (active && active !== document.body) return;
          pageTitle()?.focus({ preventScroll: true });
        });
      }),
    [router],
  );
}
