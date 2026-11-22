import { testRule } from "../test/run.mjs";

const filename = "card-row.tsx";

testRule("isolate-learner-text", {
  message:
    "Learner text in interface text can run right to left and reorder the sentence around it. " +
    "Isolate it with a labelled placeholder, which keeps the message: ${{ term: isolate(term) " +
    "}} in t or msg, {{ term: isolate(term) }} in <Trans>, or isolate(card.term) for a " +
    "property. docs/proposals/right-to-left.md.",
  valid: [
    { filename, code: "const a = t`Count ${count}`;" },
    { filename, code: "const b = t`Added ${{ term: isolate(term) }}`;" },
    { filename, code: "const c = <Trans>You have {count} cards</Trans>;" },
    { filename, code: "const d = <View aria-label={t`Delete ${card.term}`} />;" },
    { filename, code: 'const e = <View accessibilityLabel={cond ? t`Open ${deck}` : ""} />;' },
    { filename, code: "const f = `Added ${card.term}`;" },
    { filename, code: "const g = i18n.t`Added ${term}`;" },
  ],
  invalid: [
    { filename, code: "const a = t`Added ${card.term}`;", errors: ["t`Added ${card.term}`"] },
    {
      filename,
      code: "const b = msg`Moved to ${deckName}`;",
      errors: ["msg`Moved to ${deckName}`"],
    },
    {
      filename,
      code: "const c = t`Quoted ${shortQuote(text)}`;",
      errors: ["t`Quoted ${shortQuote(text)}`"],
    },
    {
      filename,
      code: 'const d = t`Shared by ${card?.owner ?? "someone"}`;',
      errors: ['t`Shared by ${card?.owner ?? "someone"}`'],
    },
    {
      filename,
      code: "const e = <Trans>Added {term}</Trans>;",
      errors: ["<Trans>Added {term}</Trans>"],
    },
    {
      filename,
      code: "const f = <Trans>Added <strong>{card.term}</strong></Trans>;",
      errors: ["<Trans>Added <strong>{card.term}</strong></Trans>"],
    },
    {
      filename,
      code: "const g = <View title={t`Delete ${card.term}`} />;",
      errors: ["t`Delete ${card.term}`"],
    },
  ],
});
