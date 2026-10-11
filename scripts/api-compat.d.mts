export type Contract = {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, unknown> };
};

export function contractOf(document: unknown): Contract;
export function breakingChanges(frozen: Contract, next: Contract): string[];
