import { testRule } from "../test/run.mjs";

const filename = "VoiceDemo.tsx";

testRule("clip-owner", {
  message:
    "Use useClip() from this app's lib/use-clip.ts (apps/site/src/lib or apps/web/src/client/lib). " +
    "An audio element made anywhere else plays on and keeps its frame loop after its component " +
    "unmounts, and talks over the next clip (#1069, #1141).",
  valid: [
    { filename, code: "const { play } = useClip();" },
    { filename, code: "const context = new AudioContext();" },
    { filename, code: 'const canvas = document.createElement("canvas");' },
    { filename, code: "const clip = new recorder.Audio(url);" },
  ],
  invalid: [
    { filename, code: "const clip = new Audio(url);", errors: ["new Audio(url)"] },
    { filename, code: "clip.current = new window.Audio();", errors: ["new window.Audio()"] },
    {
      filename,
      code: "const a = new globalThis.Audio(url);",
      errors: ["new globalThis.Audio(url)"],
    },
    {
      filename,
      code: 'const a = document.createElement("audio");',
      errors: ['document.createElement("audio")'],
    },
  ],
});
