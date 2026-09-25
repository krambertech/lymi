/** The elements that loop forever. Each one pauses while it is off screen; `styles.css` holds the pause. */
const LOOPS =
  ".lantern-flicker, .deck-spread-float, .deck-finale-pool, .scene-bubble, .floating-word";

export function pauseLoopsOffscreen() {
  const visibility = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.toggleAttribute("data-offscreen", !entry.isIntersecting);
    }
  });
  const loopsIn = (node: Element) => [
    ...(node.matches(LOOPS) ? [node] : []),
    ...node.querySelectorAll(LOOPS),
  ];
  for (const el of document.querySelectorAll(LOOPS)) visibility.observe(el);
  // Islands mount and unmount loops after the page has loaded.
  new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) for (const el of loopsIn(node)) visibility.observe(el);
      }
      for (const node of record.removedNodes) {
        if (node instanceof Element) for (const el of loopsIn(node)) visibility.unobserve(el);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}
