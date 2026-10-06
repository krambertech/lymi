import { describe, expect, it } from "vitest";
import { speechText } from "./speech-text";

describe("speech text", () => {
  it.each([
    ["õppima · õppida · õpin", "õppima, õppida, õpin"],
    ["kool  ·  kooli  ·  kooli", "kool, kooli, kooli"],
    ["pikk\u00a0·\u00a0pika\u00a0·\u00a0pikka", "pikk, pika, pikka"],
    ["einsteigen · stieg ein · ist eingestiegen", "einsteigen, stieg ein, ist eingestiegen"],
  ])("pauses between all forms in %s", (term, spoken) => {
    expect(speechText(term)).toBe(spoken);
  });

  it.each(["col·legi", "a·b", "tere!", " · x", "x · ", "ジョン・スミス"])(
    "keeps the spelling and punctuation of %s",
    (term) => expect(speechText(term)).toBe(term),
  );
});
