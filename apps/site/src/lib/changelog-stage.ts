/** Scales each changelog figure down to fit its 16:10 tray, and again whenever either resizes. */
export function fitChangelogStages(): void {
  const fitStage = (stage: Element) => {
    const content = stage.firstElementChild;
    if (!(stage instanceof HTMLElement) || !(content instanceof HTMLElement)) return;
    const style = getComputedStyle(stage);
    const width =
      stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height =
      stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const scale = Math.min(1, width / content.offsetWidth, height / content.offsetHeight);
    content.style.scale = String(Math.max(scale, 0));
  };
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const stage = entry.target.closest(".changelog-stage");
      if (stage) fitStage(stage);
    }
  });
  for (const stage of document.querySelectorAll(".changelog-stage")) {
    observer.observe(stage);
    if (stage.firstElementChild) observer.observe(stage.firstElementChild);
  }
}
