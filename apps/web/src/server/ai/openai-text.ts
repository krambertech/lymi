import type { Fetch, TextProvider, TextRequest } from "./types";

export type OpenAiTextBindings = {
  OPENAI_API_KEY?: string | undefined;
  OPENAI_BASE_URL?: string | undefined;
  OPENAI_TEXT_MODEL?: string | undefined;
  AI_GATEWAY_TOKEN?: string | undefined;
};

export class OpenAiTextError extends Error {
  readonly status: number | undefined;

  constructor(message: string, options?: ErrorOptions & { status?: number | undefined }) {
    super(message, options);
    this.name = "OpenAiTextError";
    this.status = options?.status;
  }
}

/** The text vendor, per docs/stack.md. Structured outputs, so the reply parses or the call fails. */
export function createOpenAiTextProvider(
  env: OpenAiTextBindings,
  request: Fetch = fetch,
): TextProvider {
  const model = env.OPENAI_TEXT_MODEL || "gpt-5-mini";
  return {
    provider: "openai",
    model,
    async complete(input: TextRequest) {
      const apiKey = env.OPENAI_API_KEY?.trim();
      if (!apiKey) throw new OpenAiTextError("OpenAI text is not configured");
      const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      if (env.AI_GATEWAY_TOKEN) headers["cf-aig-authorization"] = `Bearer ${env.AI_GATEWAY_TOKEN}`;
      const response = await fetchWithRetry(request, `${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: input.instructions },
            { role: "user", content: input.input },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: input.schema.name, strict: true, schema: input.schema.schema },
          },
        }),
      });
      const body = (await response.json()) as {
        choices?: { message?: { content?: string | null }; finish_reason?: string }[];
      };
      const choice = body.choices?.[0];
      if (choice?.finish_reason === "length") throw new OpenAiTextError("OpenAI reply was cut off");
      const content = choice?.message?.content;
      if (!content) throw new OpenAiTextError("OpenAI returned no text");
      try {
        return JSON.parse(content) as unknown;
      } catch (cause) {
        throw new OpenAiTextError("OpenAI returned text that is not JSON", { cause });
      }
    },
  };
}

async function fetchWithRetry(request: Fetch, url: string, init: RequestInit): Promise<Response> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await request(url, { ...init, signal: AbortSignal.timeout(60_000) });
    } catch (cause) {
      if (attempt === 1) throw new OpenAiTextError("OpenAI could not be reached", { cause });
      await pause(200);
      continue;
    }
    if (response.ok) return response;
    lastStatus = response.status;
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    await response.body?.cancel();
    if (!retryable || attempt === 1) {
      throw new OpenAiTextError(`OpenAI text request failed (${response.status})`, {
        status: response.status,
      });
    }
    await pause(200 * (attempt + 1));
  }
  throw new OpenAiTextError(`OpenAI text request failed (${lastStatus})`, { status: lastStatus });
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
