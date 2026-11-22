import { testRule } from "../test/run.mjs";

const filename = "action-menu.tsx";

testRule("fixed-host", {
  message:
    "Give a SwiftUI Host a fixed width and height: one that measures itself keeps a stale place " +
    "when the list around it moves, and its button drifts off its row (#714).",
  valid: [
    {
      filename,
      code: 'import { Host } from "@expo/ui/swift-ui"; const a = <Host style={{ width: 40, height: 40 }} />;',
    },
    {
      filename,
      code: 'import { Host } from "@expo/ui/jetpack-compose"; const b = <Host matchContents />;',
    },
    { filename, code: "const c = <RNHostView matchContents />;" },
  ],
  invalid: [
    {
      filename,
      code: 'import { Host } from "@expo/ui/swift-ui"; const a = <Host matchContents colorScheme={room} />;',
      errors: ["matchContents"],
    },
  ],
});
