import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  TRAVEL_ANSWERS,
  TRAVEL_FIXES,
  TRAVEL_FORMS,
  TRAVEL_TELL,
  TRAVEL_TRANSLATE,
} from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

const TURN_RULE = msg`Turning toward a side takes <et>-le</et>: <et>Pöörake vasakule</et>, <et>Pöörake paremale</et>.`;
const SIDE_RULE = msg`Saying which side a place is on takes <et>-l</et>: <et>Kohvik on vasakul</et>, <et>Jaam on paremal</et>.`;
const TICKET_RULE = msg`Useful station phrases: <et>Kus on bussipeatus?</et>, <et>Palun üks pilet Tartusse.</et>, <et>Mis kell rong väljub?</et>`;

const FORM_GLOSS: Record<(typeof TRAVEL_FORMS)[number]["id"], MessageDescriptor> = {
  "turn-left": msg`to the left`,
  "turn-right": msg`to the right`,
  "on-left": msg`on the left`,
  "on-right": msg`on the right`,
  "to-tartu": msg`to Tartu`,
  straight: msg`straight ahead`,
};

const TELL_LABELS = {
  turn: { id: "turn", label: msg`Turning (where to)` },
  side: { id: "side", label: msg`Location (which side)` },
} as const;

const TRANS_PROMPTS: Record<(typeof TRAVEL_TRANSLATE)[number], MessageDescriptor> = {
  "Kus on bussipeatus?": msg`Where is the bus stop?`,
  "Palun üks pilet Tartusse.": msg`One ticket to Tartu, please.`,
  "Minge otse edasi.": msg`Go straight ahead (polite).`,
  "Pöörake vasakule.": msg`Turn left (polite).`,
  "Jaam on paremal.": msg`The station is on the right.`,
  "Mis kell rong väljub?": msg`What time does the train leave?`,
};

const FIX_PROMPTS: Record<(typeof TRAVEL_FIXES)[number]["id"], MessageDescriptor> = {
  turnLeft: msg`Turn left!`,
  turnRight: msg`Turn right!`,
  onLeft: msg`The café is on the left.`,
  onRight: msg`The station is on the right.`,
  toTartu: msg`One ticket to Tartu, please.`,
  whereStop: msg`Where is the bus stop?`,
};

const formSaid = (item: { before: string; answer: string; after: string }) =>
  `${item.before} ${item.answer}${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}`;

const formItem = (index: number): FormDrill => {
  const item = TRAVEL_FORMS[index] as (typeof TRAVEL_FORMS)[number];
  const rule = item.id === "to-tartu" ? "station" : item.id.startsWith("on-") ? "side" : "turn";
  return {
    kind: "form",
    id: `form-${item.id}`,
    rule,
    base: item.base,
    gloss: FORM_GLOSS[item.id],
    cue: { et: `${item.before} ___${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}` },
    answers: [item.answer],
    say: formSaid(item),
    explain: rule === "station" ? TICKET_RULE : rule === "side" ? SIDE_RULE : TURN_RULE,
  };
};

const tellItem = (index: number): ChoiceDrill => {
  const item = TRAVEL_TELL[index] as (typeof TRAVEL_TELL)[number];
  return {
    kind: "choice",
    id: `tell-${item.id}`,
    rule: item.kind,
    say: item.said,
    answer: TELL_LABELS[item.kind],
    wrong: [TELL_LABELS[item.kind === "turn" ? "side" : "turn"]],
    explain: item.kind === "turn" ? TURN_RULE : SIDE_RULE,
  };
};

const toAsciiId = (text: string) =>
  text
    .toLowerCase()
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("õ", "o")
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "");

export const DRILLS: DrillBank = {
  rules: {
    turn: { label: msg`Turning: <et>otse, vasakule, paremale</et>`, section: "directions" },
    side: { label: msg`Location: <et>vasakul, paremal</et>`, section: "directions" },
    station: { label: msg`At the station: <et>pilet, peatus, jaam</et>`, section: "write" },
  },
  items: [
    formItem(0),
    formItem(1),
    formItem(2),
    formItem(3),
    formItem(4),
    formItem(5),
    tellItem(0),
    tellItem(1),
    tellItem(2),
    tellItem(3),
    tellItem(4),
    tellItem(5),
    ...TRAVEL_TRANSLATE.map((said) => {
      const rule =
        said.includes("pilet") || said.includes("peatus") || said.includes("väljub")
          ? "station"
          : said.includes("paremal")
            ? "side"
            : "turn";
      return {
        kind: "translate" as const,
        id: `write-${toAsciiId(said)}`,
        rule: rule as "turn" | "side" | "station",
        prompt: TRANS_PROMPTS[said],
        answers: TRAVEL_ANSWERS[said],
        say: said,
        explain: rule === "station" ? TICKET_RULE : rule === "side" ? SIDE_RULE : TURN_RULE,
      };
    }),
    ...TRAVEL_FIXES.map((item) => {
      const rule =
        item.id === "toTartu" || item.id === "whereStop"
          ? "station"
          : item.id.startsWith("on")
            ? "side"
            : "turn";
      return {
        kind: "fix" as const,
        id: `fix-${item.id.toLowerCase()}`,
        rule: rule as "turn" | "side" | "station",
        wrong: item.wrong,
        prompt: FIX_PROMPTS[item.id],
        answers: [item.right] as readonly [string, ...string[]],
        say: item.right,
        explain: rule === "station" ? TICKET_RULE : rule === "side" ? SIDE_RULE : TURN_RULE,
      };
    }),
  ],
};
