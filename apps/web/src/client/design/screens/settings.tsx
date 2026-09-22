import type { ReactNode } from "react";
import { SettingsView } from "../../views/settings-view";
import { Sidebar } from "../../views/shell";
import { Desktop } from "../frame";
import * as m from "../mock";
import { noop, type Screen } from "../parts/types";
import { PhoneShot, Shot } from "../shot";

/** The import rows drawn in place, since the design page never leaves itself. */
const staticImportLink = (_source: string, className: string, children: ReactNode) => (
  <span className={className}>{children}</span>
);

export const screen: Screen = {
  order: 70,
  slug: "settings",
  name: "Settings",
  source: "views/settings-view.tsx",
  note: "A reading screen, narrowed to 672. One group per concern, separated by rules rather than boxes. A choice applies when it is made, so nothing here has a Save button.",
  Demo: () => (
    <div className="grid gap-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
        <PhoneShot caption="On the phone" initial="dark" path="/settings">
          <SettingsView
            me={m.me}
            language="en"
            onLanguage={noop}
            theme="system"
            onTheme={noop}
            importLink={staticImportLink}
          />
        </PhoneShot>
      </div>
      <Shot caption="Desktop, Settings" initial="light">
        {(t) => (
          <Desktop theme={t} height={640}>
            <Sidebar
              decks={m.decks}
              name={m.me.name}
              docsUrl="https://lymi.app/docs"
              onAdd={noop}
              static={{ path: "/settings" }}
            />
            <main className="@container flex min-w-0 flex-1 flex-col">
              <SettingsView
                me={m.me}
                language="en"
                onLanguage={noop}
                theme="system"
                onTheme={noop}
                importLink={staticImportLink}
              />
            </main>
          </Desktop>
        )}
      </Shot>
    </div>
  ),
};
