import type { Fetch } from "../ai";
import { type AiGatewayBindings, providerEndpoint } from "../ai/gateway";
import { INSTRUCTIONS } from "./prompt";

export type LessonReaderBindings = {
  ANTHROPIC_API_KEY?: string | undefined;
  /** An organisation-wide key needs the workspace it bills to. */
  ANTHROPIC_WORKSPACE_ID?: string | undefined;
  ANTHROPIC_LESSON_MODEL?: string | undefined;
} & AiGatewayBindings;

export type LessonMaterial = {
  /** Normalised pages, in the learner's order. */
  images: { bytes: Uint8Array; type: "image/webp" | "image/jpeg" | "image/png" }[];
  pdfs: Uint8Array[];
  text: string;
};

export type LessonUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  ms: number;
};

export interface LessonReader {
  model: string;
  /** Streams the reply's JSON text as it is written, then resolves with what the read cost. */
  stream(
    material: LessonMaterial,
    brief: string,
    schema: Record<string, unknown>,
    onText: (text: string) => void,
  ): Promise<LessonUsage>;
}

export class LessonReaderError extends Error {
  constructor(message: string, options?: ErrorOptions & { status?: number }) {
    super(message, options);
    this.name = "LessonReaderError";
    this.status = options?.status;
  }
  readonly status: number | undefined;
}

/** Haiku 5.5 at low effort read the owner's lessons best in the October 2026 bake-off. */
const DEFAULT_MODEL = "claude-haiku-5-5";

export function createLessonReader(
  env: LessonReaderBindings,
  request: Fetch = fetch,
): LessonReader | null {
  const key = env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  const model = env.ANTHROPIC_LESSON_MODEL || DEFAULT_MODEL;
  const endpoint = providerEndpoint(env, "anthropic");
  return {
    model,
    async stream(material, brief, schema, onText) {
      const started = Date.now();
      const headers: Record<string, string> = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        ...endpoint.headers,
      };
      if (env.ANTHROPIC_WORKSPACE_ID)
        headers["anthropic-workspace-id"] = env.ANTHROPIC_WORKSPACE_ID;
      const content = [
        ...material.pdfs.map((bytes) => ({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64(bytes) },
        })),
        ...material.images.map((image) => ({
          type: "image",
          source: { type: "base64", media_type: image.type, data: base64(image.bytes) },
        })),
        ...(material.text
          ? [{ type: "text", text: `Pasted by the learner:\n${material.text}` }]
          : []),
        { type: "text", text: brief },
      ];
      let response: Response;
      try {
        response = await request(`${endpoint.base}/messages`, {
          method: "POST",
          redirect: "manual",
          headers,
          body: JSON.stringify({
            model,
            max_tokens: 16000,
            stream: true,
            system: INSTRUCTIONS,
            output_config: { effort: "low", format: { type: "json_schema", schema } },
            messages: [{ role: "user", content }],
          }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (cause) {
        throw new LessonReaderError("The lesson reader could not be reached", { cause });
      }
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new LessonReaderError(`The lesson reader failed (${response.status})`, {
          status: response.status,
        });
      }

      const usage: LessonUsage = { model, inputTokens: 0, outputTokens: 0, ms: 0 };
      let stop: string | undefined;
      for await (const event of serverSentEvents(response.body)) {
        if (event.type === "message_start")
          usage.inputTokens = event.message?.usage?.input_tokens ?? 0;
        if (
          event.type === "content_block_delta" &&
          event.delta?.type === "text_delta" &&
          event.delta.text
        ) {
          onText(event.delta.text);
        }
        if (event.type === "message_delta") {
          usage.outputTokens = event.usage?.output_tokens ?? usage.outputTokens;
          stop = event.delta?.stop_reason ?? stop;
        }
        if (event.type === "error") throw new LessonReaderError("The lesson reader stream failed");
      }
      if (stop === "max_tokens") throw new LessonReaderError("The lesson reply was cut off");
      usage.ms = Date.now() - started;
      return usage;
    },
  };
}

type StreamEvent = {
  type: string;
  message?: { usage?: { input_tokens?: number } };
  delta?: { type?: string; text?: string; stop_reason?: string };
  usage?: { output_tokens?: number };
  error?: { message?: string };
};

async function* serverSentEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    let end = buffer.indexOf("\n\n");
    while (end >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("");
      if (data) yield JSON.parse(data) as StreamEvent;
      end = buffer.indexOf("\n\n");
    }
  }
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
