/** This page's id. Requests carry it so the live channel does not echo the tab's own writes. ADR 0024. */
export const tabId =
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
