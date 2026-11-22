import { z } from "zod";

export const MACHINE = { "x-lymi-machine": true } as const;

export const ID_MAX = 200;

export const Id = z.string().min(1).max(ID_MAX).meta(MACHINE);

export const Cursor = z.string().min(1).max(2000).meta(MACHINE);

export const QueryFlag = z.string().max(64).meta(MACHINE).pipe(z.stringbool());

export function boundedRecord<K extends z.core.$ZodRecordKey, V extends z.ZodType>(
  key: K,
  value: V,
  max: number,
) {
  return z
    .record(key, value)
    .refine((entries) => Object.keys(entries).length <= max, `Send at most ${max} entries.`)
    .meta({ maxProperties: max });
}

export type LaterParser = "AnkiConnect action" | "MCP tool";

export function parsedLater(by: LaterParser) {
  return z.unknown().meta({ "x-lymi-parsed-by": by });
}
