import type { DevCommandSummary } from "@lymi/client/dev-palette";
import { ApiError } from "../lib/api";

export type PersonaSummary = {
  id: string;
  name: string;
  email: string;
  description: string;
  /** Where the palette lists it: Start, Everyday, Languages, Scale and edges, Together. */
  group: string;
  /** Signing in lands on a screen of its own, such as a join link. */
  landing: boolean;
  appLanguage: string;
  decks: number;
  cards: number;
  dueNow: number | "all";
};

export type RenderedEmail = {
  subject: string;
  preview: string;
  text: string;
  html: string;
  language: string;
  from: string;
  replyTo: string;
  to: string;
};

export type DevCounts = { decks: number; cards: number; due: number; reviews: number };

export type DevState = {
  user: { id: string; name: string; email: string };
  persona: PersonaSummary | null;
  counts: DevCounts;
  settings: { appLanguage: string | null; meaningLanguage: string };
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

/** Persona routes available only on loopback and capability-protected app previews. */
export const devApi = {
  personas: () => request<{ personas: PersonaSummary[] }>("/api/dev/personas"),
  state: () => request<DevState>("/api/dev/state"),
  commands: () => request<{ commands: DevCommandSummary[] }>("/api/dev/commands"),
  run: (id: string, count?: number) =>
    request<{ note: string; counts: DevCounts }>(`/api/dev/commands/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify(count === undefined ? {} : { count }),
    }),
  emails: () =>
    request<{ kinds: string[]; operators: string[]; canSend: boolean }>("/api/dev/emails"),
  renderEmail: (kind: string, language: string) =>
    request<RenderedEmail>(`/api/dev/emails/render?${new URLSearchParams({ kind, language })}`),
  sendEmail: (kind: string, language: string, to: string) =>
    request<{ ok: true }>("/api/dev/emails/send", {
      method: "POST",
      body: JSON.stringify({ kind, language, to }),
    }),
  /** The URL a browser is pointed at to become a persona. Sets the session and redirects. */
  signInUrl: (persona: string, returnTo?: string) =>
    `/api/dev/sign-in?${new URLSearchParams(returnTo ? { as: persona, returnTo } : { as: persona })}`,
};
