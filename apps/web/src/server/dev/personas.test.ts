import { CardInput, DeckInput } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { accountPersona, accounts, personaEmail, personaFor, personas } from "./personas";
import { PICTURES } from "./pictures";

describe("personas", () => {
  it("have unique ids and resolve from their email", () => {
    const ids = personas.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of personas) {
      expect(personaFor(personaEmail(p.id))?.id).toBe(p.id);
      expect(personaFor(personaEmail(p.id).toUpperCase())?.id).toBe(p.id);
    }
    expect(personaFor("k.porshnieva@gmail.com")).toBeNull();
    expect(personaFor("nobody@lymi.local")).toBeNull();
  });

  it("seed only what the real deck and card schemas accept", () => {
    for (const p of accounts) {
      for (const deck of p.decks) {
        expect(
          DeckInput.safeParse({
            name: deck.name,
            description: deck.description ?? null,
            defaultLanguage: deck.defaultLanguage,
            directions: deck.directions ?? "recognition",
          }).success,
          `${p.id} / ${deck.name}`,
        ).toBe(true);
        for (const card of deck.cards) {
          const {
            createdBy: _actor,
            introducedDaysAgo: _days,
            archived: _a,
            important: _i,
            picture: _p,
            ...input
          } = card;
          const result = CardInput.safeParse({ deckId: "deck", ...input });
          expect(result.success, `${p.id} / ${deck.name} / ${card.term}`).toBe(true);
        }
      }
    }
  });

  it("never ask for a review before a card exists", () => {
    for (const p of accounts.filter((a) => a.decks.length > 0)) {
      const newest = Math.min(
        ...p.decks.flatMap((d) => d.cards.map((c) => c.introducedDaysAgo ?? d.introducedDaysAgo)),
      );
      for (const day of p.reviewDays) expect(day, p.id).toBeGreaterThanOrEqual(0);
      if (p.reviewDays.length > 0) {
        expect(Math.max(...p.reviewDays), p.id).toBeLessThanOrEqual(
          Math.max(...p.decks.map((d) => d.introducedDaysAgo)),
        );
      }
      expect(newest).toBeGreaterThanOrEqual(0);
    }
  });

  it("do not seed a term twice into one persona unless one copy is archived", () => {
    for (const p of accounts) {
      const seen = new Map<string, number>();
      for (const deck of p.decks.filter((d) => !d.archived)) {
        for (const card of deck.cards.filter((c) => !c.archived)) {
          const key = `${card.language ?? deck.defaultLanguage ?? ""} ${card.term.toLowerCase()}`;
          seen.set(key, (seen.get(key) ?? 0) + 1);
        }
      }
      const twice = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
      expect(twice, p.id).toEqual([]);
    }
  });

  it("name only accounts, decks and pictures that exist", () => {
    for (const p of accounts) {
      const own = new Set(p.decks.map((d) => d.name));
      for (const series of p.series ?? []) {
        for (const name of series.decks) expect(own.has(name), `${p.id} series ${name}`).toBe(true);
      }
      for (const deck of p.decks) {
        for (const id of deck.people?.members ?? []) {
          expect(accountPersona(id), `${p.id} / ${deck.name} member ${id}`).toBeDefined();
          expect(id, `${p.id} cannot join its own deck`).not.toBe(p.id);
        }
        for (const card of deck.cards) {
          if (card.picture) expect(PICTURES[card.picture], card.term).toBeDefined();
        }
      }
      const welcome = p.landing?.welcomeWith;
      if (welcome) {
        const owner = accountPersona(welcome.owner);
        const deck = owner?.decks.find((d) => d.name === welcome.deck);
        expect(deck?.people?.members, `${p.id} lands on a deck it belongs to`).toContain(p.id);
      }
    }
  });
});
