import { z } from "zod";
import { Scope } from "../types";
import { Timestamp } from "./common";

export const ApiKeyOut = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    start: z
      .string()
      .nullable()
      .meta({ description: "First characters of the key, for recognising it" }),
    scope: Scope,
    lastRequest: Timestamp.nullable(),
    createdAt: Timestamp,
  })
  .meta({ id: "ApiKey" });

export const ApiKeyCreatedOut = ApiKeyOut.extend({
  key: z.string().meta({ description: "The plain key. Shown once; the server stores a hash." }),
}).meta({ id: "ApiKeyCreated" });
