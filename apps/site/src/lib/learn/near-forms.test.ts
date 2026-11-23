import { expect, it } from "vitest";
import { answerWord, slipBetween } from "./answers";
import VERIFIED from "./verified-forms.json";

const slipKey = (form: string) =>
  answerWord(form)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/(.)\1+/gu, "$1");

it("lists each real form that is one slip from another; lesson:forms writes it", async () => {
  const forms = Object.entries(VERIFIED)
    .filter(([, source]) => !source.startsWith("by hand: not a word"))
    .map(([form]) => form);
  const alike = Map.groupBy(forms, slipKey);
  const near = forms.filter((form) =>
    (alike.get(slipKey(form)) ?? []).some((other) => slipBetween(form, other) !== null),
  );
  await expect(`${JSON.stringify(near, null, 2)}\n`).toMatchFileSnapshot("near-forms.json");
});
