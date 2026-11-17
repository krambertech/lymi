/**
 * The deck page's two behaviours that need script, kept out of an island so the card list ships
 * once, as HTML: a word's pronunciation in the list, and the phone's sticky Add.
 */
export function startDeckPage(): void {
  playWords();
  stickyAdd();
}

/** One word plays at a time; pressing the playing word stops it, and a failed clip says so. */
function playWords(): void {
  const status = document.querySelector<HTMLElement>("[data-audio-status]");
  let playing: { button: HTMLButtonElement; clip: HTMLAudioElement; label: string } | null = null;
  const stop = () => {
    if (!playing) return;
    playing.clip.pause();
    playing.button.removeAttribute("data-playing");
    playing.button.setAttribute("aria-label", playing.label);
    playing = null;
  };
  document.addEventListener("click", (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>("button[data-audio]")
        : null;
    if (!button) return;
    const again = playing?.button === button;
    stop();
    if (again) return;
    if (status) status.textContent = "";
    // A row names its card; the list says once where a card's clip lives.
    const base = status?.dataset.audioBase ?? "";
    const id = button.dataset.audio ?? "";
    const clip = new Audio(base ? base.replace(encodeURIComponent("{card}"), id) : id);
    playing = { button, clip, label: button.getAttribute("aria-label") ?? "" };
    button.setAttribute("data-playing", "");
    const stopLabel = status?.dataset.stopLabel;
    if (stopLabel) button.setAttribute("aria-label", stopLabel);
    const done = () => {
      if (playing?.clip === clip) stop();
    };
    const failed = () => {
      if (playing?.clip !== clip) return;
      stop();
      if (status) status.textContent = status.dataset.failed ?? "";
    };
    clip.addEventListener("ended", done);
    clip.addEventListener("error", failed);
    clip.play().catch(failed);
  });
}

/**
 * Shown once the hero's Add has scrolled away, hidden again while another Add is in view, so it
 * never doubles an Add the visitor can already see.
 */
function stickyAdd(): void {
  const bar = document.querySelector<HTMLElement>("[data-deck-sticky]");
  if (!bar || !("IntersectionObserver" in window)) return;
  // The Add links themselves; the try section marks its whole hand, which is no button to see.
  const others = [...document.querySelectorAll<HTMLElement>("a[data-add]")].filter(
    (el) => !bar.contains(el),
  );
  const seen = new Set<Element>();
  const hero = document.querySelector('[data-add="hero"]');
  let heroPassed = false;
  const update = () => {
    const show = heroPassed && seen.size === 0;
    bar.toggleAttribute("data-shown", show);
    document.documentElement.toggleAttribute("data-deck-sticky", show);
  };
  const watch = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) seen.add(entry.target);
      else seen.delete(entry.target);
      if (entry.target === hero) {
        heroPassed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      }
    }
    update();
  });
  for (const el of others) watch.observe(el);
}
