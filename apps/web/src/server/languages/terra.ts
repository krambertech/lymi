import type { TextModel } from "../ai/types";

/** For a language whose readings the default model leaves out or misplaces; docs/stack.md has the evaluation. */
export const TERRA = { model: "gpt-6.1-terra", effort: "medium" } as const satisfies TextModel;
