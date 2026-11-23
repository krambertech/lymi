/**
 * Lines the copy scans flag that stay, each with its reason. `text` is part of the English
 * message (rule "tell") or of its Ukrainian or Russian line (rule "uk" or "ru").
 */
export const ALLOWED_COPY: readonly { rule: "tell" | "uk" | "ru"; text: string; reason: string }[] =
  [
    {
      rule: "tell",
      text: "That makes the no the easy half.",
      reason: "It follows its reason: yes has six endings to learn, and no has none (copy.md).",
    },
    {
      rule: "tell",
      text: "doing great",
      reason: "The gloss of tubli, not praise for the learner.",
    },
    { rule: "tell", text: "Nice to meet you", reason: "The gloss of Väga meeldiv." },
    { rule: "tell", text: "Perfect tenses", reason: "The lesson's name (copy.md)." },
    { rule: "tell", text: "Perfect and pluperfect", reason: "The lesson's name: the tenses." },
    { rule: "tell", text: "Let’s and let them", reason: "The lesson's name: lähme and las." },
    { rule: "tell", text: "Perfect", reason: "A tense's name on the kit's Timeline." },
    {
      rule: "tell",
      text: "the perfect",
      reason: "The tense the perfect lesson teaches (täisminevik).",
    },
    {
      rule: "tell",
      text: "The perfect",
      reason: "The tense the perfect lesson teaches (täisminevik).",
    },
    {
      rule: "tell",
      text: "perfect or pluperfect",
      reason: "The tenses the perfect lesson tells apart.",
    },
    { rule: "uk", text: "Ти молодець.", reason: "The gloss of Sa oled tubli." },
    { rule: "ru", text: "Ты молодец.", reason: "The gloss of Sa oled tubli." },
  ];
