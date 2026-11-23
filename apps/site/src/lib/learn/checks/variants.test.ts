import { describe, expect, it } from "vitest";
import { LESSON_SLUGS } from "../catalogue";
import { ALLOWED_VARIANTS } from "./allowed-variants";
import { alwaysRightVariants, rejectedVariants, unlistedVariants } from "./variants";

const sentences = alwaysRightVariants;

describe("the variants of an accepted sentence that are always right", () => {
  it("swaps a subject pronoun's long and short form, both ways", () => {
    expect(sentences("Ma elan Tallinnas.")).toContain("Mina elan Tallinnas.");
    expect(sentences("Mina elan Tallinnas.")).toContain("Ma elan Tallinnas.");
    expect(sentences("Kus sa elad?")).toContain("Kus sina elad?");
    expect(sentences("Tema on õpetaja.")).toEqual(["Ta on õpetaja."]);
    expect(sentences("Nad elavad Tartus.")).toEqual(["Nemad elavad Tartus."]);
    expect(sentences("Teie olete arst.")).toContain("Te olete arst.");
  });

  it("leaves out a 1st or 2nd person subject the verb's ending shows", () => {
    expect(sentences("Ma elan Tallinnas.")).toContain("Elan Tallinnas.");
    expect(sentences("Kus sa elad?")).toContain("Kus elad?");
    expect(sentences("Me oleme kodus.")).toContain("Oleme kodus.");
    expect(sentences("Tere! Ma olen Jaan.")).toContain("Tere! Olen Jaan.");
    expect(sentences("Ta ütles: „Ma tulen.“")).toContain("Ta ütles: „Tulen.“");
    expect(sentences("Täna lähen ma tööle.")).toEqual([
      "Täna lähen mina tööle.",
      "Täna lähen tööle.",
    ]);
  });

  it("never leaves out a 3rd person subject", () => {
    expect(sentences("Ta elab Tallinnas.")).toEqual(["Tema elab Tallinnas."]);
    expect(sentences("Nad on kodus.")).toEqual(["Nemad on kodus."]);
  });

  it("swaps but keeps a pronoun before ei, whose verb has no ending", () => {
    expect(sentences("Ma ei tule.")).toEqual(["Mina ei tule."]);
  });

  it("leaves a pronoun alone when it isn't plainly the subject", () => {
    expect(sentences("Jaan ootab teda.")).toEqual([]);
    expect(sentences("Mina ka.")).toEqual([]);
    expect(sentences("Kes see on? Mina.")).toEqual([]);
    expect(sentences("See olen mina.")).toEqual([]);
    expect(sentences("Mis on tema nimi?")).toEqual([]);
    expect(sentences("Mina ja sina oleme sõbrad.")).toEqual([]);
    expect(sentences("Tema kass magab.")).toEqual([]);
    expect(sentences("Ka mina olen õpetaja.")).toEqual([]);
    expect(sentences("Mari ja meie elame Tallinnas.")).toEqual([]);
    expect(sentences("Sina või mina olen süüdi.")).toEqual([]);
    expect(sentences("See olen mina ise.")).toEqual([]);
    expect(sentences("Me ootame meie bussi.")).toEqual([
      "Meie ootame meie bussi.",
      "Ootame meie bussi.",
    ]);
  });

  it("finds an accepted answer's variant the item marks wrong", () => {
    expect(
      rejectedVariants({ kind: "translate", id: "live", answers: ["Ma elan Tallinnas."] }),
    ).toEqual(["Mina elan Tallinnas.", "Elan Tallinnas."]);
    expect(
      rejectedVariants({
        kind: "translate",
        id: "live",
        answers: ["Ma elan Tallinnas.", "Mina elan Tallinnas.", "Elan Tallinnas."],
      }),
    ).toEqual([]);
    expect(
      rejectedVariants({ kind: "dictation", id: "live", answers: ["Ma elan Tallinnas."] }),
    ).toEqual([]);
  });

  it("asks a fix item to take the other form of the word it fixes, and only that word", () => {
    expect(
      rejectedVariants({
        kind: "fix",
        id: "be",
        wrong: "Sa olen kodus.",
        answers: ["Ma olen kodus."],
      }),
    ).toEqual(["Mina olen kodus."]);
    expect(
      rejectedVariants({
        kind: "fix",
        id: "be",
        wrong: "Ma oled kodus.",
        answers: ["Ma olen kodus."],
      }),
    ).toEqual([]);
  });

  it("lets the allow-list keep a variant, and names an entry nothing rejects", () => {
    const item = { kind: "translate", id: "live", answers: ["Ma elan Tallinnas."] } as const;
    const entry = (variant: string) => ({
      lesson: "olevik",
      in: "lesson" as const,
      id: "live",
      variant,
      reason: "A test.",
    });
    const problems = (variants: readonly string[]) =>
      unlistedVariants("olevik", "lesson", [item], () => "Olevik.tsx", variants.map(entry));
    expect(problems(["Mina elan Tallinnas.", "Elan Tallinnas."])).toEqual([]);
    expect(problems(["Mina elan Tallinnas."])).toEqual([
      expect.stringContaining("marks “Elan Tallinnas.” wrong"),
    ]);
    expect(problems(["Mina elan Tallinnas.", "Elan Tallinnas.", "Ma elan Tartus."])).toEqual([
      expect.stringContaining('lists “Ma elan Tartus.” for olevik item "live"'),
    ]);
  });

  it("allows variants only in lessons that exist", () => {
    expect(ALLOWED_VARIANTS.filter((each) => !LESSON_SLUGS.includes(each.lesson))).toEqual([]);
  });
});
