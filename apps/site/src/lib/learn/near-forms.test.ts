import { expect, it } from "vitest";
import { slipBetween } from "./answers";
import VERIFIED from "./verified-forms.json";

it("lists each real form that is one slip from another; lesson:forms writes it", async () => {
  const forms = Object.entries(VERIFIED)
    .filter(([, source]) => !source.startsWith("by hand: not a word"))
    .map(([form]) => form);
  const near = forms.filter((form) => forms.some((other) => slipBetween(form, other) !== null));
  await expect(`${JSON.stringify(near, null, 2)}\n`).toMatchFileSnapshot("near-forms.json");
});
