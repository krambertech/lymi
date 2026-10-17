import { type AiGatewayBindings, providerEndpoint } from "./gateway";
import type { Fetch, TextObserver, TextProvider, TextRequest } from "./types";

export type OpenAiTextBindings = {
  OPENAI_API_KEY?: string | undefined;
  OPENAI_TEXT_MODEL?: string | undefined;
} & AiGatewayBindings;

export class OpenAiTextError extends Error {
  readonly status: number | undefined;
  /** What a reply that came back unusable still cost. */
  readonly usage: Usage | undefined;

  constructor(
    message: string,
    options?: ErrorOptions & { status?: number | undefined; usage?: Usage | undefined },
  ) {
    super(message, options);
    this.name = "OpenAiTextError";
    this.status = options?.status;
    this.usage = options?.usage;
  }
}

/** Lower efforts misplace stress marks in pronunciations; see docs/stack.md. */
const REASONING_EFFORT = "high";

/** The text vendor, per docs/stack.md. Structured outputs, so the reply parses or the call fails. */
export function createOpenAiTextProvider(
  env: OpenAiTextBindings,
  request: Fetch = fetch,
  observe?: TextObserver,
): TextProvider {
  const model = env.OPENAI_TEXT_MODEL || "gpt-6-luna";
  const call = (input: TextRequest) => completeOnce(env, request, model, input);
  return {
    provider: "openai",
    model,
    async complete(input: TextRequest) {
      if (!observe) return (await call(input)).reply;
      const started = Date.now();
      const report = (usage: Usage | undefined, status?: number) => {
        try {
          observe({
            provider: "openai",
            model,
            inputTokens: usage?.prompt_tokens ?? 0,
            outputTokens: usage?.completion_tokens ?? 0,
            reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens,
            cachedTokens: usage?.prompt_tokens_details?.cached_tokens,
            latencyMs: Date.now() - started,
            error: status !== undefined,
            status,
          });
        } catch {
          /* Measuring a call never decides its outcome. */
        }
      };
      try {
        const { reply, usage } = await call(input);
        report(usage);
        return reply;
      } catch (err) {
        report(err instanceof OpenAiTextError ? err.usage : undefined, statusOf(err));
        throw err;
      }
    },
  };
}

type Usage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
  prompt_tokens_details?: { cached_tokens?: number };
};

/** An error's HTTP status, or 500 for one that never got a usable reply. */
function statusOf(err: unknown): number {
  return err instanceof OpenAiTextError && err.status ? err.status : 500;
}

async function completeOnce(
  env: OpenAiTextBindings,
  request: Fetch,
  model: string,
  input: TextRequest,
): Promise<{ reply: unknown; usage: Usage | undefined }> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new OpenAiTextError("OpenAI text is not configured");
  const endpoint = providerEndpoint(env, "openai");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...endpoint.headers,
  };
  const response = await fetchWithRetry(request, `${endpoint.base}/chat/completions`, {
    method: "POST",
    redirect: "manual",
    headers,
    body: JSON.stringify({
      model,
      reasoning_effort: input.effort ?? REASONING_EFFORT,
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
    usage?: Usage;
  };
  const usage = body.usage;
  const choice = body.choices?.[0];
  if (choice?.finish_reason === "length")
    throw new OpenAiTextError("OpenAI reply was cut off", { usage });
  const content = choice?.message?.content;
  if (!content) throw new OpenAiTextError("OpenAI returned no text", { usage });
  try {
    return { reply: JSON.parse(content) as unknown, usage };
  } catch (cause) {
    throw new OpenAiTextError("OpenAI returned text that is not JSON", { cause, usage });
  }
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
