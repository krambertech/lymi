import assert from "node:assert/strict";
import { test } from "node:test";
import {
  handOver,
  phoneHandOver,
  returnPath,
} from "../.agents/skills/verify/scripts/hand-over.mjs";

test("the hand-over gives a sign-in link for the end and the start, and every step", () => {
  const given = {
    origin: "http://localhost:5242",
    persona: "learner",
    feature: "Add a card",
    start: "/library",
    end: "/library/d1?sort=recent",
    steps: ["Open Lezione 12", "Add it"],
  };
  assert.deepEqual(handOver(given), [
    "Look at Add a card:",
    "  As the run left it: http://localhost:5242/api/dev/sign-in?as=learner&returnTo=%2Flibrary%2Fd1%3Fsort%3Drecent",
    "  From the start: http://localhost:5242/api/dev/sign-in?as=learner&reset=1&returnTo=%2Flibrary",
    "    1. Open Lezione 12",
    "    2. Add it",
  ]);
  assert.equal(
    handOver({ ...given, entry: "https://preview.example/?key=secret" })
      .join("\n")
      .includes("secret"),
    false,
  );
});

test("the way back keeps the product's query and drops the preview link's key", () => {
  const entry = "https://pr-1-lymi.workers.dev/_preview?key=aB3_secret-key";
  const back = (path, link) => returnPath(`https://pr-1-lymi.workers.dev${path}`, link);
  assert.equal(back("/library/d1?card=c1", entry), "/library/d1?card=c1");
  assert.equal(
    back("/review?deck=d1&cards=%5B%22c1%22%5D", entry),
    "/review?deck=d1&cards=%5B%22c1%22%5D",
  );
  assert.equal(back("/library/d1?key=aB3_secret-key&card=c1", entry), "/library/d1?card=c1");
  assert.equal(back("/login?returnTo=%2F_preview%3Fkey%3DaB3_secret-key", entry), "/login");
  assert.equal(back("/review?deck=d1", undefined), "/review?deck=d1");
});

test("the phone's hand-over names the Simulator and keeps only what a learner does", () => {
  assert.deepEqual(
    phoneHandOver({
      simulator: "stim-lymi-mobile",
      udid: "U-1",
      metroPort: 8090,
      persona: "learner",
      feature: "Add a card",
      flow: [
        'Assert that "Today" is visible...  COMPLETED',
        'Tap on "Add"...  COMPLETED',
        "Input text il collaudo...  COMPLETED",
        "Take screenshot 01-form...  COMPLETED",
      ],
    }),
    [
      "Look at Add a card in the Simulator named stim-lymi-mobile, signed in as learner:",
      "  Show it: xcrun simctl boot U-1; open -a Simulator --args -CurrentDeviceUDID U-1",
      '  Open Lymi: xcrun simctl openurl U-1 "exp+lymi://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8090"',
      '    1. Tap on "Add"',
      "    2. Input text il collaudo",
    ],
  );
});
