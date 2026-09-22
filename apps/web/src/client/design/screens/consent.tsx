import { useState } from "react";
import { identifyApp } from "../../components/app-mark";
import { ConsentView } from "../../views/consent-view";
import * as m from "../mock";
import { noop, type Screen } from "../parts/types";
import { PhoneShot } from "../shot";

const NOTEBOOK = identifyApp("https://notes.example.com/mcp/client", "Notebook");

/** The consent screen with its switch live, so the grant dots can be tried on the design page. */
function ConsentDemo({ app }: { app: typeof m.claude }) {
  const [write, setWrite] = useState(true);
  return (
    <ConsentView
      app={app}
      email="kateryna@example.com"
      writeRequested
      allowWrite={write}
      onAllowWrite={setWrite}
      onDecide={noop}
    />
  );
}

export const screen: Screen = {
  order: 130,
  slug: "consent",
  name: "Consent",
  source: "views/consent-view.tsx",
  note: "The stop between an app's sign-in and its first request. Read is stated, because a connector cannot work without it; write is the only decision, so it is the only control. A recognised host is named; anything else is titled by its address, and its own name is shown as a claim.",
  Demo: () => (
    <div className="grid gap-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
        <PhoneShot caption="A recognised app" initial="light" path="/consent" bare>
          <ConsentDemo app={m.claude} />
        </PhoneShot>
        <PhoneShot caption="An app Lymi does not recognise" initial="dark" path="/consent" bare>
          <ConsentDemo app={NOTEBOOK} />
        </PhoneShot>
      </div>
    </div>
  ),
};
