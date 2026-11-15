import { useLingui } from "@lingui/react/macro";
import { Volume2 } from "lucide-react";

/** The languages the product gives a native voice by default (`speech-voices.ts`). */
const NATIVE = [
  "ar",
  "pt-BR",
  "da",
  "nl",
  "et",
  "fi",
  "fr",
  "de",
  "el",
  "it",
  "ja",
  "zh",
  "ru",
  "uk",
];

/** Heights of a still waveform, so the drawing reads as a voice without sound. */
const WAVE = [6, 12, 20, 14, 26, 18, 30, 22, 12, 24, 16, 28, 20, 10, 18, 26, 14, 8, 16, 10, 6];

/** One card being heard, over the languages that have their own voice. */
export function VoicesFigure() {
  const { i18n } = useLingui();
  const names = new Intl.DisplayNames([i18n.locale], { type: "language" });
  const languages = NATIVE.map((code) => names.of(code) ?? code).sort((a, b) =>
    a.localeCompare(b, i18n.locale),
  );

  return (
    <div aria-hidden="true" className="mx-auto max-w-[420px]">
      <div className="rounded-xl bg-plate p-5 edge">
        <p className="text-xs font-medium tracking-[0.06em] text-ink-muted uppercase">
          {names.of("et")}
        </p>
        <p lang="et" className="mt-2 text-3xl font-medium tracking-[-0.026em] text-ink">
          Head aega
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-canvas [&_svg]:size-4">
            <Volume2 />
          </span>
          <span className="flex h-8 flex-1 items-center gap-[3px]">
            {WAVE.map((height, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing, so the index is the identity
                key={index}
                className="w-[3px] rounded-full bg-ink-secondary"
                style={{ height, opacity: index < 13 ? 1 : 0.35 }}
              />
            ))}
          </span>
        </div>
      </div>
      <ul className="mt-5 flex flex-wrap gap-1.5">
        {languages.map((name) => (
          <li
            key={name}
            className="rounded-full bg-plate px-2.5 py-1 text-xs text-ink-secondary edge"
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
