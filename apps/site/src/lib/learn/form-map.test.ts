import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LESSONS, lessonBySlug } from "./catalogue";
import { formsIn } from "./checks/forms";
import { CLIPS, clipId, clipText, clipVoice, isConversation } from "./clips";
import {
  baseForm,
  FORM_MAP_CLIPS,
  FORM_MAP_RECORDED,
  FORMS,
  formFor,
  formMapClip,
  formsOf,
  kindOf,
  lessonFor,
  litParts,
  type MapKind,
  plainText,
  USES,
  usesOf,
  usesTaughtBy,
  WORDS,
  type WordId,
} from "./form-map";
import { mapReducer, type MapState, startMap } from "./form-map-state";
import { formText } from "./forms";
import VERIFIED from "./verified-forms.json";

const KINDS: readonly MapKind[] = ["verb", "noun"];
const ALL: readonly WordId[] = [...WORDS.verb, ...WORDS.noun];
const SAID = [
  ...new Set([
    ...USES.flatMap((use) => use.examples.map((example) => plainText(example.et))),
    ...ALL.flatMap((word) => formsOf(kindOf(word)).map((form) => baseForm(word, form.id).form)),
  ]),
];
const usesFor = (word: WordId) => formsOf(kindOf(word)).flatMap((form) => usesOf(form.id));

describe("the form map's data", () => {
  it("has at least six verbs and six nouns", () => {
    for (const kind of KINDS) expect(WORDS[kind].length).toBeGreaterThanOrEqual(6);
  });

  it("gives every word its three forms", () => {
    for (const word of ALL)
      for (const form of formsOf(kindOf(word)))
        expect(baseForm(word, form.id).form, `${word} ${form.id}`).toMatch(/^\p{Ll}+$/u);
  });

  it("gives every word every use of its kind, or says it doesn't happen", () => {
    for (const word of ALL)
      for (const use of usesFor(word)) {
        const cell = formFor(word, use.id);
        if (cell) expect(formText(cell.form).trim(), `${word} ${use.id}`).not.toBe("");
      }
    expect(formFor("sõber", "some")).toBeNull();
    expect(() => formFor("sõber", "past")).toThrow();
  });

  it("puts every use on a form, under one id", () => {
    const forms = new Set(FORMS.map((form) => form.id));
    for (const use of USES) expect(forms.has(use.form), use.id).toBe(true);
    expect(new Set(USES.map((use) => use.id)).size).toBe(USES.length);
    for (const form of FORMS) expect(usesOf(form.id).length, form.id).toBeGreaterThan(1);
  });

  it("shows each use in two to four sentences with different words, one part lit in each", () => {
    for (const use of USES) {
      expect(use.examples.length, use.id).toBeGreaterThanOrEqual(2);
      expect(use.examples.length, use.id).toBeLessThanOrEqual(4);
      const lit = use.examples.map((example) => {
        const parts = litParts(example.et);
        const marked = parts.filter((part) => part.lit);
        expect(marked, example.et).toHaveLength(1);
        expect(parts.map((part) => part.text).join("")).toBe(plainText(example.et));
        return marked[0]?.text.toLowerCase();
      });
      expect(new Set(lit).size, use.id).toBe(lit.length);
    }
  });

  it("names the lesson that teaches each use", () => {
    for (const use of USES) {
      const lesson = lessonFor(use.id);
      if (use.taught.slug === undefined) {
        expect(
          LESSONS.filter((each) => each.et === use.taught.et),
          use.id,
        ).toHaveLength(1);
        expect(lesson.slug, `${use.id}: the lesson is built, so name it by its slug`).toBe(
          undefined,
        );
      } else expect(lesson, use.id).toBe(lessonBySlug(use.taught.slug));
    }
  });

  it("fills in as the course goes", () => {
    expect(usesTaughtBy("haaldus")).toEqual([]);
    expect(usesTaughtBy("olevik")).toEqual(["now", "subject"]);
    expect(usesTaughtBy("tegevusnimed")).toEqual(expect.arrayContaining(["must", "want", "count"]));
    expect(usesTaughtBy("tegevusnimed")).not.toContain("past");
    for (const use of USES)
      if (use.taught.slug) expect(usesTaughtBy(use.taught.slug)).toContain(use.id);
  });

  it("uses only Estonian forms checked in Sõnaveeb", () => {
    const said = [
      ...USES.flatMap((use) => use.examples.map((example) => plainText(example.et))),
      ...FORMS.flatMap((form) => [form.et, form.asks]),
      ...ALL.flatMap((word) => [
        ...formsOf(kindOf(word)).map((form) => baseForm(word, form.id).form),
        ...usesFor(word).flatMap((use) => formText(formFor(word, use.id)?.form ?? "")),
      ]),
      ...ALL.flatMap((word) =>
        [
          ...formsOf(kindOf(word)).map((form) => baseForm(word, form.id).odd),
          ...usesFor(word).map((use) => formFor(word, use.id)?.odd),
          ...usesFor(word).map((use) => use.tip),
        ].flatMap((note) =>
          litParts(note?.message ?? note?.id ?? "")
            .filter((part) => part.lit)
            .map((part) => part.text),
        ),
      ),
    ];
    const missing = [...new Set(said.flatMap(formsIn))].filter((form) => !(form in VERIFIED));
    if (process.env.LESSON_FORMS_OUT)
      appendFileSync(process.env.LESSON_FORMS_OUT, missing.map((form) => `${form}\n`).join(""));
    expect(missing).toEqual([]);
  });
});

describe("the form map's sound", () => {
  it("plays only clips that say exactly what is shown, in the main voice", () => {
    const heard = SAID.filter((text) => formMapClip(text));
    expect(heard.length).toBeGreaterThan(0);
    for (const text of heard) {
      const [, lesson = "", id = ""] =
        formMapClip(text)?.match(/\/estonian-lessons\/([^/]+)\/([^/]+)\.mp3$/) ?? [];
      const clip = CLIPS[lesson]?.[id];
      expect(clip && !isConversation(clip), text).toBe(true);
      if (clip && !isConversation(clip))
        expect([clipText(clip), clipVoice(clip)], text).toEqual([text, "main"]);
    }
    expect([...heard, ...FORM_MAP_CLIPS].sort()).toEqual([...SAID].sort());
  });

  it("lists every sentence and form nobody has recorded, each with a file name of its own", () => {
    const recorded = new Set(
      Object.entries(CLIPS)
        .filter(([lesson]) => lesson !== "form-map")
        .flatMap(([, clips]) => Object.values(clips))
        .filter((clip) => !isConversation(clip) && clipVoice(clip) === "main")
        .map(clipText),
    );
    expect(FORM_MAP_CLIPS.filter((text) => recorded.has(text))).toEqual([]);
    expect(new Set(FORM_MAP_CLIPS.map(clipId)).size).toBe(FORM_MAP_CLIPS.length);
  });

  it("offers its own clips only once they are recorded", () => {
    expect(FORM_MAP_RECORDED).toBe("form-map" in CLIPS);
    if (!FORM_MAP_RECORDED)
      for (const text of FORM_MAP_CLIPS) expect(formMapClip(text), text).toBeNull();
  });
});

describe("the form map's state", () => {
  const open: MapState = startMap({ word: "lugema", use: "past" });

  it("opens on a word alone, or on a use with its form", () => {
    expect(startMap({ word: "tuba" })).toEqual({
      status: "closed",
      view: "branches",
      word: "tuba",
    });
    expect(open).toEqual({
      status: "use",
      view: "branches",
      word: "lugema",
      form: "ma",
      use: "past",
    });
  });

  it("keeps one form and one use open", () => {
    const form = mapReducer(open, { type: "form", form: "da" });
    expect(form).toEqual({ status: "form", view: "branches", word: "lugema", form: "da" });
    const use = mapReducer(form, { type: "use", use: "would" });
    expect(use).toMatchObject({ status: "use", form: "present", use: "would" });
  });

  it("closes what is pressed again", () => {
    const form = mapReducer(open, { type: "use", use: "past" });
    expect(form).toMatchObject({ status: "form", form: "ma" });
    expect(mapReducer(form, { type: "form", form: "ma" })).toMatchObject({ status: "closed" });
  });

  it("keeps what is open through a change of word or view, and closes it for another kind", () => {
    expect(mapReducer(open, { type: "word", word: "minema" })).toEqual({ ...open, word: "minema" });
    expect(mapReducer(open, { type: "view", view: "table" })).toEqual({ ...open, view: "table" });
    expect(mapReducer(open, { type: "kind", kind: "verb" })).toBe(open);
    expect(mapReducer(open, { type: "kind", kind: "noun" })).toEqual({
      status: "closed",
      view: "branches",
      word: "raamat",
    });
    expect(mapReducer(open, { type: "word", word: "tuba" })).toMatchObject({ status: "closed" });
  });

  it("ignores a form or use the word doesn't have", () => {
    expect(mapReducer(open, { type: "form", form: "genitive" })).toBe(open);
    expect(mapReducer(open, { type: "use", use: "plural" })).toBe(open);
  });
});
