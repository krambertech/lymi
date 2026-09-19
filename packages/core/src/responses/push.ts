import { z } from "zod";
import { ReminderTime } from "../types";

export const PushConfigOut = z
  .object({ publicKey: z.string().min(1).meta({ description: "Public VAPID key" }) })
  .meta({ id: "PushConfig" });

export const PushSubscriptionStatusOut = z
  .object({
    enabled: z.boolean(),
    reminderTime: ReminderTime.nullable(),
    timezone: z.string().nullable(),
  })
  .meta({ id: "PushSubscriptionStatus" });
