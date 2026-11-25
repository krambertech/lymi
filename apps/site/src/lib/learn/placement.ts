import { shuffle } from "./quiz";

export interface Drawn {
  rule: string;
}

export const PLACEMENT_PASS = 2;
export const PER_STAGE = 3;

export function drawBalanced<Q extends Drawn>(
  pool: readonly Q[],
  count: number,
  lessonOf: (question: Q) => string,
): Q[] {
  const mixed = shuffle(pool);
  const picked: Q[] = [];
  const usedRules = new Set<string>();
  const lessons = shuffle([...new Set(mixed.map(lessonOf))]);
  for (const lesson of lessons) {
    if (picked.length >= count) break;
    const next = mixed.find((question) => lessonOf(question) === lesson);
    if (next) {
      picked.push(next);
      usedRules.add(next.rule);
    }
  }
  const byRule = new Map<string, Q[]>();
  for (const question of mixed) {
    if (picked.includes(question)) continue;
    const list = byRule.get(question.rule) ?? [];
    list.push(question);
    byRule.set(question.rule, list);
  }
  const fresh = shuffle([...byRule.keys()].filter((rule) => !usedRules.has(rule)));
  const seen = shuffle([...byRule.keys()].filter((rule) => usedRules.has(rule)));
  const rules = [...fresh, ...seen];
  for (let round = 0; picked.length < count; round += 1) {
    let added = false;
    for (const rule of rules) {
      const next = byRule.get(rule)?.[round];
      if (next && picked.length < count) {
        picked.push(next);
        added = true;
      }
    }
    if (!added) break;
  }
  return shuffle(picked);
}

export function drawPlacementStage<Q extends Drawn>(
  pool: readonly Q[],
  lessonOf: (question: Q) => string,
): Q[] {
  return drawBalanced(pool, PER_STAGE, lessonOf);
}

export interface StageScore {
  right: number;
  total: number;
}

export const stagePassed = ({ right, total }: StageScore): boolean =>
  right >= Math.min(PLACEMENT_PASS, total);

export function firstFailedStage(scores: readonly (StageScore | undefined)[]): number | undefined {
  const index = scores.findIndex((score) => score && score.total > 0 && !stagePassed(score));
  return index === -1 ? undefined : index;
}
