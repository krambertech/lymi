// Azure AI Speech, as a comparison candidate only. It is deliberately not in
// apps/web/src/server/ai: promoting it into the product's provider chain is a decision this
// harness exists to inform, not one it should pre-empt.

const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

export class AzureSpeechError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "AzureSpeechError";
    this.status = options?.status;
  }
}

/** Ask Azure which voices exist, so no voice name is hardcoded from memory. */
export async function azureVoices(env) {
  const key = env.AZURE_SPEECH_KEY?.trim();
  const region = env.AZURE_SPEECH_REGION?.trim();
  if (!key || !region) return null;
  const response = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
    { headers: { "Ocp-Apim-Subscription-Key": key }, signal: AbortSignal.timeout(30_000) },
  );
  if (!response.ok) {
    throw new AzureSpeechError(`Azure voice list failed (${response.status})`, {
      status: response.status,
    });
  }
  return await response.json();
}

/**
 * Pick one voice per locale: the newest generation Azure offers there, female where there is a
 * choice, so the comparison is not confounded by voice age or gender.
 */
export function pickVoice(voices, locale) {
  const candidates = voices.filter((voice) => voice.Locale?.toLowerCase() === locale.toLowerCase());
  if (candidates.length === 0) return null;
  const rank = (voice) => {
    const name = voice.ShortName ?? "";
    if (name.includes("DragonHD")) return 3;
    if (name.includes("Multilingual")) return 2;
    if (voice.VoiceType === "Neural") return 1;
    return 0;
  };
  candidates.sort((a, b) => {
    const byRank = rank(b) - rank(a);
    if (byRank !== 0) return byRank;
    const byGender = Number(b.Gender === "Female") - Number(a.Gender === "Female");
    if (byGender !== 0) return byGender;
    return (a.ShortName ?? "").localeCompare(b.ShortName ?? "");
  });
  return candidates[0];
}

function escapeXml(text) {
  return text.replace(
    /[<>&'"]/g,
    (character) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character],
  );
}

/**
 * Build a provider with the same shape as the product's SpeechProvider, so the runner treats
 * every candidate identically. `phonemes` is optional IPA, which is the reason Azure is
 * interesting: it is the one candidate here that accepts a pronunciation rather than inferring it.
 */
export function createAzureProvider(env, { locale, voice }) {
  return {
    provider: "azure",
    model: "neural",
    voice: voice.ShortName,
    locale,
    contentType: "audio/mpeg",
    extension: "mp3",
    async speech({ text, phonemes }) {
      const key = env.AZURE_SPEECH_KEY?.trim();
      const region = env.AZURE_SPEECH_REGION?.trim();
      if (!key || !region) throw new AzureSpeechError("Azure speech is not configured");
      const body = phonemes
        ? `<phoneme alphabet="ipa" ph="${escapeXml(phonemes)}">${escapeXml(text)}</phoneme>`
        : escapeXml(text);
      const ssml =
        `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">` +
        `<voice name="${voice.ShortName}">${body}</voice></speak>`;
      const response = await fetch(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": OUTPUT_FORMAT,
            "User-Agent": "lymi-tts-compare",
          },
          body: ssml,
          signal: AbortSignal.timeout(30_000),
        },
      );
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new AzureSpeechError(
          `Azure speech request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
          { status: response.status },
        );
      }
      return response;
    },
  };
}
