import { z } from "zod";
import { Scope } from "../types";
import { Timestamp } from "./common";

export const ConnectedAppOut = z
  .object({
    id: z.string(),
    clientId: z.string().meta({ description: "The client's Client ID Metadata Document URL" }),
    name: z.string().nullable().meta({ description: "The name the client gave for itself" }),
    scope: Scope,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "ConnectedApp" });
