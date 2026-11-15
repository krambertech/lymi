/** Set once the homepage's present has dropped its lid in this visit. */
export const GIFT_SEEN = "lymi-free-gift";

/**
 * Marks the document before first paint when the present will drop its lid, so the prerendered lid
 * starts hidden instead of showing and then jumping up to fall. BaseLayout inlines it.
 */
export function giftScript(): string {
  return `try{if(!sessionStorage.getItem(${JSON.stringify(GIFT_SEEN)})&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.gift="new"}catch(e){}`;
}
