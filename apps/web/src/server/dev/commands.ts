import type { ServiceContext } from "../services/context";
import {
  addSampleCards,
  asClaude,
  type DevCounts,
  enrichSampleCards,
  goalAhead,
  ownerAddsCards,
  reachGoal,
  recallCards,
  resetAccount,
  type SeedDeps,
  seedPersona,
  setDue,
  sharedDeckOf,
  slipCards,
} from "../services/dev";
import { type Persona, personas } from "./personas";

/**
 * What the developer palette can do to the signed-in account. The web palette and `pnpm local`
 * list and run these through `/api/dev/commands`, so a new one reaches both without a client
 * change; the phone is meant to read the same list. Persona, language and theme stay client-side:
 * they are a sign-in, a setting and a local preference, not states of the account.
 */
export interface DevCommand {
  id: string;
  group: "Simulate" | "Account";
  /** `{count}` is replaced by the count the palette or the CLI passes. */
  title: string;
  count?: { default: number; max: number };
  /** Further words a search should find it by. */
  keywords?: string;
  /** Throws data away, so the palette asks twice and never offers it in Recent. */
  confirm?: boolean;
  /** Why it can do nothing for this account right now, or null. */
  blocked: (state: CommandState) => string | null;
  /** Does it and says what happened, in one sentence. */
  run: (
    ctx: ServiceContext,
    input: { count: number; persona: Persona | null; deps: SeedDeps },
  ) => Promise<string>;
}

/** What a command's blocked reason is decided from. */
export type CommandState = DevCounts & { sharedDeck: boolean };

export async function commandState(ctx: ServiceContext, counts: DevCounts): Promise<CommandState> {
  return { ...counts, sharedDeck: Boolean(await sharedDeckOf(ctx)) };
}

const noCards = (c: DevCounts) => (c.cards ? null : "No cards");
const nothingDue = (c: DevCounts) => noCards(c) ?? (c.due ? null : "Nothing due");
const noReviews = (c: DevCounts) => noCards(c) ?? (c.reviews ? null : "No reviews");
const cards = (n: number) => (n === 1 ? "1 card" : `${n} cards`);

export const commands: DevCommand[] = [
  {
    id: "claude",
    group: "Simulate",
    title: "Claude adds {count} cards",
    count: { default: 5, max: 200 },
    keywords: "assistant mcp connected app activity",
    blocked: () => null,
    run: async (ctx, { count }) =>
      `Claude added ${cards(await addSampleCards(asClaude(ctx), count))}.`,
  },
  {
    id: "enrich",
    group: "Simulate",
    title: "Enrich {count} cards",
    count: { default: 5, max: 200 },
    keywords: "ai example",
    blocked: noCards,
    run: async (ctx, { count }) => {
      const enriched = await enrichSampleCards(ctx, count);
      return enriched ? `Enriched ${cards(enriched)}.` : "Every card already has an example.";
    },
  },
  {
    id: "forget",
    group: "Simulate",
    title: "Forget {count} cards",
    count: { default: 3, max: 200 },
    keywords: "lapse again forgotten today",
    blocked: nothingDue,
    run: async (ctx, { count }) => `Forgot ${cards(await recallCards(ctx, count, 1))}.`,
  },
  {
    id: "slip",
    group: "Simulate",
    title: "Make {count} often forgotten",
    count: { default: 3, max: 200 },
    keywords: "slipping hook",
    blocked: noReviews,
    run: async (ctx, { count }) => `${cards(await slipCards(ctx, count))} are now often forgotten.`,
  },
  {
    id: "goal",
    group: "Simulate",
    title: "Reach today's goal",
    keywords: "streak flame",
    blocked: noCards,
    run: async (ctx) => {
      const graded = await reachGoal(ctx);
      return graded
        ? `Graded ${graded} more. Today's goal is met.`
        : "Today's goal was already met.";
    },
  },
  {
    id: "goal-ahead",
    group: "Simulate",
    title: "Leave {count} reviews to today's goal",
    count: { default: 2, max: 50 },
    keywords: "streak replay celebration spark again",
    blocked: noCards,
    run: async (ctx, { count }) => {
      const { attempts, goal } = await goalAhead(ctx, count);
      const away = goal - attempts;
      const reviews = away === 1 ? "1 review" : `${away} reviews`;
      return away < count
        ? `Today's goal is now ${goal}, the most it can be, ${reviews} away.`
        : `Today's goal is now ${goal}, ${reviews} away.`;
    },
  },
  {
    id: "due",
    group: "Simulate",
    title: "Make {count} cards due",
    count: { default: 5, max: 10_000 },
    keywords: "review",
    blocked: noCards,
    run: async (ctx, { count }) => `${cards(await setDue(ctx, count))} due now.`,
  },
  {
    id: "owner",
    group: "Simulate",
    title: "The owner adds {count} cards",
    count: { default: 3, max: 200 },
    keywords: "shared deck member teacher lesson",
    blocked: (c) => (c.sharedDeck ? null : "No shared deck"),
    run: async (ctx, { count }) =>
      `The owner added ${cards(await ownerAddsCards(ctx, count))} to the shared deck.`,
  },
  {
    id: "reseed",
    group: "Account",
    confirm: true,
    title: "Reseed",
    keywords: "persona starting data restore",
    blocked: () => null,
    run: async (ctx, { persona, deps }) => {
      const target = persona ?? personas.find((p) => p.id === "learner");
      if (!target) throw new Error("No persona to reseed from");
      const counts = await seedPersona(ctx, target, deps);
      return `Reseeded ${target.name}: ${cards(counts.cards)}, ${counts.reviews} reviews.`;
    },
  },
  {
    id: "reset",
    group: "Account",
    confirm: true,
    title: "Empty this account",
    keywords: "reset delete clear",
    blocked: (c) => (c.decks ? null : "Already empty"),
    run: async (ctx, { deps }) => {
      await resetAccount(ctx, deps.images?.bucket);
      return "The account is empty.";
    },
  },
];

/** The list for an account, or without blocked reasons when nobody is signed in. */
export function summarize(state: CommandState | null) {
  return commands.map(({ id, group, title, count, keywords, confirm, blocked }) => ({
    id,
    group,
    title,
    count: count ?? null,
    keywords: keywords ?? "",
    confirm: confirm ?? false,
    blocked: state ? blocked(state) : null,
  }));
}
