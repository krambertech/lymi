import { describe, expect, it } from "vitest";
import { chunks, messagesIn } from "./catalog";
import { formsIn, lessonForms } from "./forms";
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
