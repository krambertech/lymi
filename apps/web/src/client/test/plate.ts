export interface PlateOffset {
  start: number;
  width: number;
}

function between(plate: DOMRect, item: DOMRect): PlateOffset {
  // `|| 0` folds -0 into 0.
  return {
    start: Math.round(plate.left - item.left) || 0,
    width: Math.round(plate.width - item.width) || 0,
  };
}

/** Where a sliding plate sits relative to the item it should cover, in whole pixels. */
export function plateOffset(plate: Element, item: Element): PlateOffset {
  return between(plate.getBoundingClientRect(), item.getBoundingClientRect());
}

/**
 * Where the plate sits in the first frame after `item` takes `value` for `attribute`, when a jump
 * has landed and a glide has barely left, however late the test reads it. Call it before the
 * action that makes the choice.
 */
export function offsetOnceChosen(
  plate: () => Element,
  item: Element,
  attribute: string,
  value: string,
): Promise<PlateOffset> {
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (item.getAttribute(attribute) !== value) return;
      observer.disconnect();
      requestAnimationFrame(async () => {
        const at = plate().getBoundingClientRect();
        // The press can still be scaling the item back to size, and the plate covers the settled box.
        for (let running = item.getAnimations(); running.length; running = item.getAnimations()) {
          await Promise.allSettled(running.map((animation) => animation.finished));
        }
        resolve(between(at, item.getBoundingClientRect()));
      });
    });
    observer.observe(item, { attributeFilter: [attribute] });
  });
}
