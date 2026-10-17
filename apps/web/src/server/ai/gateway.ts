export type AiGatewayBindings = {
  AI_GATEWAY_URL?: string | undefined;
  AI_GATEWAY_TOKEN?: string | undefined;
};

const PROVIDERS = {
  openai: "openai",
  anthropic: "anthropic/v1",
  elevenlabs: "elevenlabs",
  "google-ai-studio": "google-ai-studio",
  "google-cloud-tts": "custom-google-cloud-tts",
  typesafe: "custom-typesafe",
} as const;

export class AiGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiGatewayError";
  }
}

export function providerEndpoint(
  env: AiGatewayBindings,
  provider: keyof typeof PROVIDERS,
): { base: string; headers: Record<string, string> } {
  const token = env.AI_GATEWAY_TOKEN?.trim();
  const gateway = env.AI_GATEWAY_URL?.trim().replace(/\/$/, "");
  if (!token || !gateway) throw new AiGatewayError("AI Gateway is not configured");
  if (!/^https:\/\/gateway\.ai\.cloudflare\.com\/v1\/[a-z0-9]+\/[a-z0-9-]+$/.test(gateway)) {
    throw new AiGatewayError("AI Gateway URL is invalid");
  }
  return {
    base: `${gateway}/${PROVIDERS[provider]}`,
    headers: {
      "cf-aig-authorization": `Bearer ${token}`,
      "cf-aig-collect-log-payload": "false",
      "cf-aig-skip-cache": "true",
    },
  };
}
