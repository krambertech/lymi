import { askedModes, introductionOrder, REVIEW_MODE_KEYS, stateDirection } from "@lymi/core";
import type { Directions, ReviewModeKey } from "@lymi/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { askedSql, taughtFirstSql } from "./modes";
import { type TestDb, testDb } from "./test-db";

const DIRECTIONS: Directions[] = ["recognition", "production", "both"];
const LISTS: ReviewModeKey[][] = [
  ["term_to_meaning", "meaning_to_term"],
  ["meaning_to_term", "term_to_meaning"],
  ["image_to_term", "term_to_meaning"],
  ["meaning_to_term", "image_to_meaning"],
  ["image_to_meaning"],
  ["image_to_term", "image_to_meaning"],
];

const cards = DIRECTIONS.flatMap((deck) => [
  { deck, directions: null, stored: null },
  ...DIRECTIONS.flatMap((directions) =>
    [null, ...LISTS].map((stored) => ({ deck, directions, stored })),
  ),
]);

describe("the server's review mode SQL", () => {
  let raw: TestDb["raw"];
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ raw, dispose } = await testDb());
  }, 60_000);
  afterAll(async () => dispose());

  const query = (card: (typeof cards)[number], picture: boolean, select: string, where: string) =>
    raw
      .prepare(
        `with
          cards as (select 'c' as id, 'u' as user_id, 'tere' as meaning, ? as directions, ? as review_modes),
          decks as (select ? as directions),
          card_images as (
            select 'c' as card_id, 'active' as status, 'a flag' as description, 0 as captured where ?
          ),
          card_states as (
            select 'u' as user_id, value as mode, json_extract(?, '$.' || value) as direction
            from json_each(?)
          )
        select card_states.mode as mode from card_states, cards, decks where ${where} order by ${select}`,
      )
      .bind(
        card.directions,
        card.stored && JSON.stringify(card.stored),
        card.deck,
        picture ? 1 : 0,
        JSON.stringify(Object.fromEntries(REVIEW_MODE_KEYS.map((k) => [k, stateDirection(k)]))),
        JSON.stringify(REVIEW_MODE_KEYS),
      )
      .all<{ mode: ReviewModeKey }>()
      .then(({ results }) => results.map((row) => row.mode));

  it("asks the modes askedModes does, for every list, with a picture and without", async () => {
    for (const card of cards) {
      for (const picture of [true, false]) {
        const asked = askedModes(card.directions ?? card.deck, card.stored, picture);
        expect(
          (await query(card, picture, "mode", askedSql())).sort(),
          JSON.stringify({ card, picture }),
        ).toEqual([...asked].sort());
      }
    }
  }, 60_000);

  it("ranks a card's asked modes as introductionOrder teaches them", async () => {
    for (const card of cards) {
      const order = introductionOrder(
        { directions: card.directions, reviewModeKeys: card.stored },
        card.deck,
      );
      const asked = askedModes(card.directions ?? card.deck, card.stored, true);
      expect(await query(card, true, taughtFirstSql(), askedSql()), JSON.stringify(card)).toEqual(
        order.filter((key) => asked.includes(key)),
      );
    }
  }, 60_000);
});
