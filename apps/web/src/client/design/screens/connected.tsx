import { ConnectedView } from "../../views/connected-view";
import * as m from "../mock";
import type { Screen } from "../parts/types";
import { PhoneShot } from "../shot";

export const screen: Screen = {
  order: 140,
  slug: "connected",
  name: "Connected",
  source: "views/connected-view.tsx",
  note: "The ending. An MCP client's redirect is usually a custom scheme, so the browser hands off and leaves the tab here; the rail draws across and the flame rises. This is the only choreography outside review.",
  Demo: () => (
    <div className="grid gap-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
        <PhoneShot caption="Connected, read and write" initial="dark" path="/consent" bare>
          <ConnectedView app={m.claude} scopes={{ read: true, write: true }} />
        </PhoneShot>
        <PhoneShot caption="Denied" initial="light" path="/consent" bare>
          <ConnectedView app={m.claude} refused />
        </PhoneShot>
      </div>
    </div>
  ),
};
