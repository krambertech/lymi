export type Contract = {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, unknown> };
};

export function contractOf(document: unknown, operations?: string[]): Contract;
export function closedChoices(contract: Contract): string[];
export function breakingChanges(frozen: Contract, next: Contract): string[];
