import type { FocusEvent, SyntheticEvent } from "react";

const within = (group: HTMLElement, node: EventTarget | null) =>
  node instanceof Element && node.closest(`[data-slot="${group.dataset.slot}"]`) === group;

/** Tabbing onto an item of a group lands on its chosen item instead, as with native radios; a pointer's focus stays put. */
export function focusChosen(event: FocusEvent<HTMLElement>, item: string, chosen: string) {
  const group = event.currentTarget;
  const target = event.target;
  if (group.contains(event.relatedTarget as Node | null)) return;
  if (!(target instanceof HTMLElement) || !target.matches(`${item}:focus-visible`)) return;
  if (!within(group, target)) return;
  const pick = Array.from(group.querySelectorAll<HTMLElement>(chosen)).find((el) =>
    within(group, el),
  );
  if (pick && pick !== target && !pick.hasAttribute("data-disabled")) pick.focus();
}

/** True when focus moves out of the group, rather than between its items. */
export function leavesGroup(event: FocusEvent<HTMLElement>) {
  return !event.currentTarget.contains(event.relatedTarget as Node | null);
}

/** True when a key event came from one of the group's own items, not a control nested in one. */
export function fromItem(event: SyntheticEvent<HTMLElement>, item: string) {
  const target = event.target instanceof Element ? event.target.closest(item) : null;
  return within(event.currentTarget, target);
}
