/**
 * How many cards a hand holds at once. The deck page deals its hand on the server and `HandOfCards`
 * deals the next round in the browser, so both read the number from here rather than their own.
 */
export const HAND_SIZE = 5;
