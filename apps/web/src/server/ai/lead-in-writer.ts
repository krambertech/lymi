import { z } from "zod";
import { type AiGatewayBindings, providerEndpoint } from "./gateway";
import type { Fetch } from "./types";

export const LEAD_IN_MODEL = "gemini-2.5-flash-lite";

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
  usageMetadata: z
    .object({
      promptTokenCount: z.number().optional(),
      candidatesTokenCount: z.number().optional(),
      thoughtsTokenCount: z.number().optional(),
    })
    .optional(),
});
const Payload = z.object({
  candidates: z
    .array(
      z.object({
        finishReason: z.literal("STOP"),
        content: z.object({
          parts: z.array(
            z.object({ text: z.string().optional(), thought: z.boolean().optional() }),
          ),
        }),
      }),
    )
    .min(1),
});
const Reply = z.object({ previousText: z.string().nullable() });
const NO_USAGE = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0 };

/** One Gemini call that writes the words said before a term, never after it. */
export function createLeadInWriter(
  env: AiGatewayBindings & { GEMINI_API_KEY?: string | undefined },
  request: Fetch = fetch,
): LeadInWriter | null {
  const key = env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return {
    model: LEAD_IN_MODEL,
    async write({ instructions, input }) {
      const endpoint = providerEndpoint(env, "google-ai-studio");
      const response = await request(
        `${endpoint.base}/v1beta/models/${LEAD_IN_MODEL}:generateContent`,
        {
          method: "POST",
          redirect: "manual",
          headers: {
            "x-goog-api-key": key,
            "Content-Type": "application/json",
            ...endpoint.headers,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: instructions }] },
            contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: { previousText: { type: "STRING", nullable: true } },
                required: ["previousText"],
              },
              temperature: 0,
              maxOutputTokens: 768,
              thinkingConfig: { thinkingBudget: 512 },
            },
          }),
          // With the decision, leaves the speech call room inside the phone's 12-second wait.
          signal: AbortSignal.timeout(4_000),
        },
      );
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
      const metadata = Usage.safeParse(body).data?.usageMetadata;
      const thoughts = metadata?.thoughtsTokenCount ?? 0;
      const usage: LeadInUsage = {
        inputTokens: metadata?.promptTokenCount ?? 0,
        // Gemini bills thinking as output.
        outputTokens: (metadata?.candidatesTokenCount ?? 0) + thoughts,
        reasoningTokens: thoughts,
        status,
      };
      try {
        const payload = Payload.parse(body);
        const text = payload.candidates[0]?.content.parts
          .filter((p) => !p.thought)
          .map((p) => p.text ?? "")
          .join("");
        return { previousText: Reply.parse(JSON.parse(text ?? "")).previousText, ...usage };
      } catch {
        throw new LeadInError("refused", usage);
      }
    },
  };
}
