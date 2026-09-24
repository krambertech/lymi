import { useState } from "react";

const KEY = "lymi-rest-dismissed";

/** The day the rest-day banner was dismissed on, so it stays away until that day ends. */
export function useRestDismissal(today: string | undefined) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });
  const dismiss = () => {
    if (!today) return;
    setDismissed(today);
    try {
      localStorage.setItem(KEY, today);
    } catch {}
  };
  return { dismissed: !!today && dismissed === today, dismiss };
}
