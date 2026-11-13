import { z } from "zod";
import { type AiGatewayBindings, providerEndpoint } from "./gateway";
import type { Fetch } from "./types";

export const LEAD_IN_MODEL = "gpt-6-luna";

export interface LeadInUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number | undefined;
  status?: number | undefined;
}

export interface LeadInRequest {
  instructions: string;
  input: Record<string, string>;
}

export interface LeadInWriter {
  model: string;
  write(request: LeadInRequest): Promise<{ previousText: string | null } & LeadInUsage>;
}

export class LeadInError extends Error {
  constructor(
    /** `refused` when a reply arrived but was unusable, so asking again buys the same answer. */
    readonly reason: "refused" | "failed",
    readonly usage?: LeadInUsage,
  ) {
    super("A lead-in could not be written");
    this.name = "LeadInError";
  }
}

const Usage = z.object({
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      completion_tokens_details: z.object({ reasoning_tokens: z.number().optional() }).optional(),
    })
    .optional(),
});
const Payload = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.literal("stop"),
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
});
const Reply = z.object({ previousText: z.string().nullable() });
const NO_USAGE = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0 };
const REPLY_SCHEMA = {
  type: "object",
  properties: { previousText: { type: ["string", "null"] } },
  required: ["previousText"],
  additionalProperties: false,
};

/** One OpenAI call that writes the words said before a term, never after it. */
export function createLeadInWriter(
  env: AiGatewayBindings & { OPENAI_API_KEY?: string | undefined },
  request: Fetch = fetch,
): LeadInWriter | null {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return {
    model: LEAD_IN_MODEL,
    async write({ instructions, input }) {
      const endpoint = providerEndpoint(env, "openai");
      const response = await request(`${endpoint.base}/chat/completions`, {
        method: "POST",
        redirect: "manual",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          ...endpoint.headers,
        },
        body: JSON.stringify({
          model: LEAD_IN_MODEL,
          reasoning_effort: "low",
          max_completion_tokens: 768,
          messages: [
            { role: "system", content: instructions },
            { role: "user", content: JSON.stringify(input) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "lead_in", strict: true, schema: REPLY_SCHEMA },
          },
        }),
        // With the decision, leaves the speech call room inside the phone's 12-second wait.
        signal: AbortSignal.timeout(4_000),
      });
      const status = response.status;
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new LeadInError("failed", { ...NO_USAGE, status });
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 16_384) {
            await reader.cancel();
            throw new LeadInError("failed", { ...NO_USAGE, status });
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      let body: unknown;
      try {
        body = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        throw new LeadInError("failed", { ...NO_USAGE, status });
      }
      const metered = Usage.safeParse(body).data?.usage;
      const usage: LeadInUsage = {
        inputTokens: metered?.prompt_tokens ?? 0,
        outputTokens: metered?.completion_tokens ?? 0,
        reasoningTokens: metered?.completion_tokens_details?.reasoning_tokens ?? 0,
        status,
      };
      try {
        const text = Payload.parse(body).choices[0]?.message.content;
        return { previousText: Reply.parse(JSON.parse(text ?? "")).previousText, ...usage };
      } catch {
        throw new LeadInError("refused", usage);
      }
    },
  };
}
