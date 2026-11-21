import { describe, expect, it } from "vitest";
import { chunks, messagesIn } from "./catalog";
import { formsIn, lessonForms } from "./forms";
import {
  nearPair,
  oneLetterApart,
  placeShares,
  STRATEGIES,
  type Strategy,
  strategyScore,
} from "./giveaways";
import { parse, textOf } from "./html";

describe("the check helpers", () => {
  it("reads whole words and leaves endings, stems and syllables out", () => {
    expect(formsIn("Ma ei loe. Nad loe-vad -teist raa·ma·tu")).toEqual(["ma", "ei", "loe", "nad"]);
    expect(formsIn("Täna on Esmaspäev!")).toEqual(["täna", "on", "esmaspäev"]);
  });

  it("finds a message in source that wraps its words across lines and tags", () => {
    const source = `<Trans>
      To find the form that follows ei, take the ma form from lesson {present} and
      drop the -n. <Word w="Loen" /> becomes <Word w="ei loe" />, and{" "}
      <Word w="räägin" /> becomes it.
    </Trans>`;
    const id =
      "To find the form that follows ei, take the ma form from lesson {present} and drop the -n. <0/> becomes <1/>, and <2/> becomes it.";
    expect(chunks(id)[0]).toBe("To find the form that follows ei, take the ma form from lesson");
    expect(messagesIn(source, [{ id }, { id: "Something else entirely" }])).toEqual([{ id }]);
  });

  it("leaves out Estonian hidden from screen readers, such as Morph's struck letters", () => {
    const tree = parse(
      '<p><span class="sr-only"><span lang="et">pood</span> becomes <span lang="et">poe</span></span><span aria-hidden="true" lang="et">po<s>od</s>e</span></p>',
      "en",
    );
    const page = {
      slug: "none",
      tree,
      recording: { words: [], parts: [] },
    } as unknown as Parameters<typeof lessonForms>[0];
    expect([...lessonForms(page).keys()]).toEqual(["pood", "poe"]);
  });

  it("finds options one is another plus a letter or two at an end", () => {
    expect(nearPair("kool", "kooli")).toBe(true);
    expect(nearPair("koolis", "kool")).toBe(true);
    expect(nearPair("Pärnus", "pärnu")).toBe(true);
    expect(nearPair("is", "kooli")).toBe(false);
    expect(nearPair("kool", "koolides")).toBe(false);
    expect(nearPair("laud", "laual")).toBe(false);
    expect(nearPair("d", "vad")).toBe(false);
    expect(nearPair("2:40", "12:40")).toBe(false);
    expect(oneLetterApart("Räägite", "Räägige")).toBe(true);
    expect(oneLetterApart("loete", "lugete")).toBe(false);
    expect(oneLetterApart("kool", "kooli")).toBe(true);
    expect(oneLetterApart("kool", "kool")).toBe(false);
  });

  it("scores the cheap rules by what they would pick", () => {
    const [longest, , middle, alone] = STRATEGIES as [Strategy, Strategy, Strategy, Strategy];
    expect(middle.pick(["kool", "kooli", "koolis"])).toEqual([1]);
    expect(longest.pick(["tuba", "toa", "toas"])).toEqual([0, 2]);
    expect(alone.pick(["lugete", "loete", "lugege"])).toEqual([1]);
    expect(alone.pick(["kass", "pood", "tuba"])).toEqual([0, 1, 2]);
    const rounds = [
      { options: ["kool", "kooli", "koolis"], answer: 1 },
      { options: ["raamat", "raamatu", "raamatus"], answer: 1 },
    ];
    expect(strategyScore(middle, rounds)).toEqual({ score: 1, chance: 1 / 3, rounds: 2 });
    expect(placeShares(rounds, 3)).toEqual([0, 1, 0]);
    const leading = STRATEGIES[4] as Strategy;
    expect(leading.pick(["pood", "jõgi", "turg"], "Ema on poes.")).toEqual([0]);
    expect(leading.applies?.({ options: ["pood", "tuba"], answer: 0, heard: "Ema on poes." })).toBe(
      true,
    );
    // The answer said as written: matching what is heard is the task.
    expect(
      leading.applies?.({ options: ["kodus", "koolis"], answer: 0, heard: "Ma olen kodus." }),
    ).toBe(false);
  });

  it("parses server HTML with the language each element is in", () => {
    const tree = parse(
      '<p>See <b lang="et">kass<span aria-hidden="true">!</span></b> &amp; more</p>',
      "en",
    );
    const b = (tree.children[0] as { children: unknown[] }).children[1] as Parameters<
      typeof textOf
    >[0];
    expect(textOf(tree)).toBe("See kass & more");
    expect((b as { lang: string }).lang).toBe("et");
  });
});
