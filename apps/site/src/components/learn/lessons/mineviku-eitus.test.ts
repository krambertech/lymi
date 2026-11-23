import { setupI18n } from "@lingui/core";
import { describe, expect, it } from "vitest";
import {
  CLIPS,
  clipId,
  NUD_BUILT,
  NUD_SHOWN,
  NUD_WHOLE,
  nudForm,
  PAST_NO_SORT,
  PAST_NO_WHEN,
} from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { madeItems, whenItems } from "./MinevikuEitus";

const i18n = setupI18n({ locale: "en", messages: { en: {} } });

describe("the -nud form from the -da form", () => {
  it("builds what Sõnaveeb lists for every -da, -ta and -la verb of the three-forms lesson", () => {
    expect(Object.fromEntries(NUD_BUILT.map((verb) => [verb.ma, nudForm(verb)]))).toEqual({
      elama: "elanud",
      lugema: "lugenud",
      rääkima: "rääkinud",
      õppima: "õppinud",
      istuma: "istunud",
      töötama: "töötanud",
      armastama: "armastanud",
      ootama: "oodanud",
      kuulama: "kuulanud",
      vaatama: "vaadanud",
      olema: "olnud",
      tulema: "tulnud",
    });
  });

  it("leaves minema and the bare -a verbs to be learned whole", () => {
    expect(NUD_BUILT.map((verb) => verb.ma)).not.toEqual(
      expect.arrayContaining(NUD_WHOLE.map(({ verb }) => verb)),
    );
  });
});

describe("“Make the -nud form”", () => {
  const items = madeItems(i18n);

  it("asks only verbs the explorer above doesn't show", () => {
    expect(items.map((item) => item.pair[1])).toHaveLength(NUD_BUILT.length - NUD_SHOWN.length);
    for (const item of items) expect(NUD_SHOWN as readonly string[]).not.toContain(item.pair[1]);
  });

  it("asks a -da, a -ta and a -la verb in every run of six", () => {
    for (let run = 0; run < 50; run++) {
      const keys = new Set(
        eachPairFirst(items, items[0])
          .slice(0, 6)
          .map((item) => item.pair[0]),
      );
      expect([...keys].sort()).toEqual(["da", "la", "ta"]);
    }
  });

  it("has a recording of every form it asks", () => {
    const recorded = CLIPS["mineviku-eitus"] ?? {};
    for (const item of items) {
      const form = item.answers[0] ?? "";
      expect(recorded[clipId(form)]).toBe(form);
    }
  });
});

describe("“Now or in the past?”", () => {
  it("hears every verb once in a run of seven", () => {
    const items = whenItems(i18n);
    for (let run = 0; run < 50; run++) {
      const verbs = eachPairFirst(items, items[0])
        .slice(0, 7)
        .map((item) => item.pair[0]);
      expect(new Set(verbs).size).toBe(PAST_NO_WHEN.length);
    }
  });

  it("never gives the time away with a time word", () => {
    for (const { now, past } of PAST_NO_WHEN)
      for (const said of [now, past]) expect(said).not.toMatch(/\b(eile|täna|homme)\b/i);
  });
});

describe("“Which group?”", () => {
  it("sorts three forms into each group", () => {
    for (const bin of ["now", "yes", "no"])
      expect(PAST_NO_SORT.filter((each) => each.bin === bin)).toHaveLength(3);
  });
});
