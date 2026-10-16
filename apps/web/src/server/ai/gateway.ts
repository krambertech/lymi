export type AiGatewayBindings = {
  /** The `lymi` gateway, `https://gateway.ai.cloudflare.com/v1/<account>/lymi`. */
  AI_GATEWAY_URL?: string | undefined;
  AI_GATEWAY_TOKEN?: string | undefined;
};

/** Each provider's own base, and where the same paths live on the gateway. */
const PROVIDERS = {
  openai: { direct: "https://api.openai.com/v1", gateway: "openai" },
  anthropic: { direct: "https://api.anthropic.com/v1", gateway: "anthropic/v1" },
  elevenlabs: { direct: "https://api.elevenlabs.io", gateway: "elevenlabs" },
  "google-ai-studio": {
    direct: "https://generativelanguage.googleapis.com",
    gateway: "google-ai-studio",
  },
} as const;

/**
 * Where a provider's requests go, and the header that authenticates them. The gateway is
 * authenticated, so without its token (as locally) requests go to the provider and carry no
 * gateway header.
 */
export function providerEndpoint(
  env: AiGatewayBindings,
  provider: keyof typeof PROVIDERS,
): { base: string; headers: Record<string, string> } {
  const token = env.AI_GATEWAY_TOKEN?.trim();
  const gateway = env.AI_GATEWAY_URL?.trim().replace(/\/$/, "");
  const { direct, gateway: path } = PROVIDERS[provider];
  if (!token || !gateway) return { base: direct, headers: {} };
  return { base: `${gateway}/${path}`, headers: { "cf-aig-authorization": `Bearer ${token}` } };
}
