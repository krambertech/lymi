import { answerWord, sameAnswer } from "./answers";

const PAIRS: Record<string, string> = {
  ma: "mina",
  mina: "ma",
  sa: "sina",
  sina: "sa",
  me: "meie",
  meie: "me",
  te: "teie",
  teie: "te",
  ta: "tema",
  tema: "ta",
  nad: "nemad",
  nemad: "nad",
};

const THIRD = new Set(["ta", "tema", "nad", "nemad"]);

const NEGATIONS = new Set(["ei", "pole"]);
const JOINS = new Set(["ja", "või"]);

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function swapped(word: string, text: string): string {
  const pair = PAIRS[word] as string;
  const rest = text.slice(word.length);
  return (text.charAt(0) === text.charAt(0).toUpperCase() ? capital(pair) : pair) + rest;
}

function variants(sentence: string): string[] {
  const pieces = sentence.split(" ");
  const words = pieces.map(answerWord);
  const negated = words.some((word) => NEGATIONS.has(word));
  const out: string[] = [];
  pieces.forEach((text, i) => {
    const word = words[i] as string;
    if (!(word in PAIRS) || answerWord(text) !== text.toLowerCase()) return;
    out.push([...pieces.slice(0, i), swapped(word, text), ...pieces.slice(i + 1)].join(" "));
    const joined = JOINS.has(words[i - 1] ?? "") || JOINS.has(words[i + 1] ?? "");
    if (negated || joined || THIRD.has(word) || pieces.length < 3) return;
    const dropped = [...pieces.slice(0, i), ...pieces.slice(i + 1)].join(" ");
    out.push(i === 0 ? capital(dropped) : dropped);
  });
  return out;
}

export function withPronouns(sentences: readonly [string, ...string[]]): [string, ...string[]] {
  const out: [string, ...string[]] = [sentences[0]];
  for (const sentence of [...sentences, ...sentences.flatMap(variants)])
    if (!out.some((each) => sameAnswer(each, sentence))) out.push(sentence);
  return out;
}
