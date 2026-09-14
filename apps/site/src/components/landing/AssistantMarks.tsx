import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { ArrowRight } from "lucide-react";
import { useId } from "react";
import { assistantsHref } from "./pages";

type Gradient = {
  from: [x: number, y: number];
  to: [x: number, y: number];
  stops: readonly [color: string, offset: number, opacity?: number][];
};

/** A solid colour or a linear gradient in the mark's 24-unit box. */
type Paint = string | Gradient;

/** Typed, so a mark asked for by a name that isn't in the list fails the build. */
export type AssistantName =
  | "Claude"
  | "ChatGPT"
  | "Claude Code"
  | "Codex"
  | "Gemini"
  | "Other apps";

type Assistant = {
  name: AssistantName;
  label?: MessageDescriptor;
  guide: string;
  path: string;
  /** Paints layered over the same path, in order. Omitted for a monochrome brand. */
  brand?: Paint | readonly Paint[];
};

/**
 * Each assistant links to its guide under /docs/mcp. Claude, Claude Code and MCP paths are
 * from simple-icons (CC0); OpenAI, Codex and Gemini from lobe-icons (MIT).
 */
const ASSISTANTS: readonly Assistant[] = [
  {
    name: "Claude",
    guide: "/docs/mcp/claude#claude-desktop-and-claudeai",
    brand: "#d97757",
    path: "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z",
  },
  {
    name: "ChatGPT",
    guide: "/docs/mcp/chatgpt#chatgpt",
    path: "M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z",
  },
  {
    name: "Claude Code",
    guide: "/docs/mcp/claude#claude-code",
    brand: "#d97757",
    path: "M21 10.5h3v3h-3v3h-1.5v3H18v-3h-1.5v3H15v-3H9v3H7.5v-3H6v3H4.5v-3H3v-3H0v-3h3v-6h18Zm-15 0h1.5v-3H6Zm10.5 0H18v-3h-1.5z",
  },
  {
    name: "Codex",
    guide: "/docs/mcp/chatgpt#codex-cli",
    brand: {
      from: [12, 0],
      to: [12, 24],
      stops: [
        ["#b1a7ff", 0],
        ["#7a9dff", 0.5],
        ["#3941ff", 1],
      ],
    },
    path: "M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z",
  },
  {
    name: "Gemini",
    guide: "/docs/mcp/gemini#gemini-cli",
    brand: [
      "#3186ff",
      {
        from: [7, 15.5],
        to: [11, 12],
        stops: [
          ["#08b962", 0],
          ["#08b962", 1, 0],
        ],
      },
      {
        from: [8, 5.5],
        to: [11.5, 11],
        stops: [
          ["#f94543", 0],
          ["#f94543", 1, 0],
        ],
      },
      {
        from: [3.5, 13.5],
        to: [17.5, 12],
        stops: [
          ["#fabc12", 0],
          ["#fabc12", 0.46, 0],
        ],
      },
    ],
    path: "M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z",
  },
  {
    name: "Other apps",
    label: msg`Other apps`,
    guide: "/docs/mcp",
    path: "M13.85 0a4.16 4.16 0 0 0-2.95 1.217L1.456 10.66a.835.835 0 0 0 0 1.18.835.835 0 0 0 1.18 0l9.442-9.442a2.49 2.49 0 0 1 3.541 0 2.49 2.49 0 0 1 0 3.541L8.59 12.97l-.1.1a.835.835 0 0 0 0 1.18.835.835 0 0 0 1.18 0l.1-.098 7.03-7.034a2.49 2.49 0 0 1 3.542 0l.049.05a2.49 2.49 0 0 1 0 3.54l-8.54 8.54a1.96 1.96 0 0 0 0 2.755l1.753 1.753a.835.835 0 0 0 1.18 0 .835.835 0 0 0 0-1.18l-1.753-1.753a.266.266 0 0 1 0-.394l8.54-8.54a4.185 4.185 0 0 0 0-5.9l-.05-.05a4.16 4.16 0 0 0-2.95-1.218c-.2 0-.401.02-.6.048a4.17 4.17 0 0 0-1.17-3.552A4.16 4.16 0 0 0 13.85 0m0 3.333a.84.84 0 0 0-.59.245L6.275 10.56a4.186 4.186 0 0 0 0 5.902 4.186 4.186 0 0 0 5.902 0L19.16 9.48a.835.835 0 0 0 0-1.18.835.835 0 0 0-1.18 0l-6.985 6.984a2.49 2.49 0 0 1-3.54 0 2.49 2.49 0 0 1 0-3.54l6.983-6.985a.835.835 0 0 0 0-1.18.84.84 0 0 0-.59-.245",
  },
];

/** A vendor's colour is a quotation: it fills the mark and never the plate around it. */
function Mark({ assistant }: { assistant: Assistant }) {
  const id = useId();
  const layers = assistant.brand === undefined ? ["currentColor"] : [assistant.brand].flat();

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fillRule="evenodd">
      <defs>
        {layers.map((paint, i) =>
          typeof paint === "string" ? null : (
            <linearGradient
              // biome-ignore lint/suspicious/noArrayIndexKey: layers are fixed data, so the index is the identity
              key={i}
              id={`${id}-${i}`}
              x1={paint.from[0]}
              y1={paint.from[1]}
              x2={paint.to[0]}
              y2={paint.to[1]}
              gradientUnits="userSpaceOnUse"
            >
              {paint.stops.map(([color, offset, opacity]) => (
                <stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
              ))}
            </linearGradient>
          ),
        )}
      </defs>
      {layers.map((paint, i) => (
        <path
          // biome-ignore lint/suspicious/noArrayIndexKey: layers are fixed data, so the index is the identity
          key={i}
          d={assistant.path}
          fill={typeof paint === "string" ? paint : `url(#${id}-${i})`}
        />
      ))}
    </svg>
  );
}

/** One assistant's mark on its own, by name. */
export function AssistantMark({ name }: { name: AssistantName }) {
  const assistant = ASSISTANTS.find((a) => a.name === name);
  return assistant ? <Mark assistant={assistant} /> : null;
}

/** The assistants a visitor can connect from, each opening its setup guide. */
export function AssistantMarks({ compact }: { compact?: boolean | undefined }) {
  const { t, i18n } = useLingui();
  if (compact) {
    return (
      <ul aria-label={t`Connect an assistant`} className="flex flex-wrap justify-center gap-2">
        {ASSISTANTS.map((assistant) => {
          const name = assistant.label ? i18n._(assistant.label) : assistant.name;
          return (
            <li key={assistant.name}>
              <a
                href={assistant.guide}
                aria-label={name}
                title={name}
                className="edge grid size-11 place-items-center rounded-full bg-plate text-text transition-[background-color,scale] duration-150 ease-out active:scale-[0.97] hoverable:hover:bg-hover"
              >
                <Mark assistant={assistant} />
              </a>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul aria-label={t`Connect an assistant`} className="flex flex-wrap gap-2">
      {ASSISTANTS.map((assistant) => (
        <li key={assistant.name}>
          <a
            href={assistant.guide}
            className="edge flex h-11 items-center gap-2.5 rounded-md bg-plate ps-3 pe-3.5 text-sm text-text transition-[background-color,scale] duration-150 ease-out active:scale-[0.97] hoverable:hover:bg-hover"
          >
            <Mark assistant={assistant} />
            {assistant.label ? i18n._(assistant.label) : assistant.name}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** The marks, then a link to the assistants page where the page's locale has one. */
export function AssistantMarksWithMore() {
  const { i18n } = useLingui();
  const more = assistantsHref(i18n.locale);
  return (
    <>
      <AssistantMarks />
      {more && (
        <a
          href={more}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xs text-sm font-medium text-text-2 hoverable:hover:text-text"
        >
          <Trans>Lymi with AI assistants</Trans>
          <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
        </a>
      )}
    </>
  );
}
