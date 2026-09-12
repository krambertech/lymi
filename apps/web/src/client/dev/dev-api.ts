import { ApiError } from "../lib/api";

export type PersonaSummary = {
  id: string;
  name: string;
  email: string;
  description: string;
  meaningLanguage: string;
  decks: number;
  cards: number;
  dueNow: number | "all";
};

export type DevCounts = { decks: number; cards: number; due: number; reviews: number };

export type DevState = {
  user: { id: string; name: string; email: string };
  persona: PersonaSummary | null;
  counts: DevCounts;
  settings: { meaningLanguage: string };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    credentials: "include",
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {}
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

/** The local-only routes under /api/dev. Every call 404s outside a loopback origin. */
export const devApi = {
  personas: () => request<{ personas: PersonaSummary[] }>("/api/dev/personas"),
  state: () => request<DevState>("/api/dev/state"),
  seed: (persona?: string) =>
    request<{ counts: DevCounts }>("/api/dev/seed", {
      method: "POST",
      body: JSON.stringify(persona ? { persona } : {}),
    }),
  reset: () => request<{ counts: DevCounts }>("/api/dev/reset", { method: "POST" }),
  due: (count: number | "all") =>
    request<{ due: number; counts: DevCounts }>("/api/dev/due", {
      method: "POST",
      body: JSON.stringify({ count }),
    }),
  /** The URL a browser is pointed at to become a persona. Sets the session and redirects. */
  signInUrl: (persona: string, returnTo: string) =>
    `/api/dev/sign-in?${new URLSearchParams({ as: persona, returnTo })}`,
};
