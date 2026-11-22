declare const checked: unique symbol;
export type AiConsent = { readonly [checked]: true };

export function consentForCanary(): AiConsent {
  return {} as AiConsent;
}

export function consentForEvaluation(): AiConsent {
  return {} as AiConsent;
}
