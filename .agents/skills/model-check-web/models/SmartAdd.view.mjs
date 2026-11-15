export const title = "Smart add, from a lesson to cards";

const screens = {
  input: "Lesson",
  reading: "Reading the lesson",
  questions: "Questions about the lesson",
  list: "Terms to add",
  added: "Cards added",
};

export const state = (v) => {
  if (v.step === "reading")
    return v.finished ? "Reading done, a beat to see the last words" : "Reading the lesson";
  if (v.step === "questions")
    return v.checks.includes(v.attempt) ? "Checking your answer" : "Questions about the lesson";
  return screens[v.step];
};

export const group = (v) =>
  v.step === "input"
    ? "start"
    : v.step === "reading"
      ? "reading"
      : v.step === "added"
        ? "done"
        : "choose";
export const colors = { start: "tan", reading: "blue", choose: "purple", done: "teal" };

const steps = {
  YouFindTerms: () => "you press Find terms",
  ScanFinishes: () => "the last words come in",
  ReadFails: () => "the read fails",
  YouStop: () => "you press Stop",
  BeatEnds: (_from, to) =>
    to.step === "questions" ? "Lymi has questions" : to.step === "list" ? "no questions" : null,
  YouShowTerms: () => "you press Show terms",
  CheckAnswers: () => "your answer is checked",
  CheckFails: () => "the check fails",
  YouGoBack: () => "you press Back",
  YouAddCards: () => "you add the cards",
};
export const step = (action, from, to) => (action in steps ? steps[action](from, to) : action);
