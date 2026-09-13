import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "./Button";
import { Kbd } from "./Kbd";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "./ResponsiveDialog";

export const SHORTCUTS: [string, MessageDescriptor][] = [
  ["N", msg`Add a card`],
  ["R", msg`Start review`],
  ["/", msg`Search`],
  ["Space", msg`Show the meaning, then Good`],
  ["1 – 4", msg`Forgot, Hard, Good, Easy`],
  ["Esc", msg`Leave review or close a sheet`],
];

/** The keys, on the machines that have them. Opened from the learner menu in the rail. */
export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useLingui();
  return (
    <ResponsiveDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t`Keyboard shortcuts`}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 text-base">
          {SHORTCUTS.map(([k, what]) => (
            <div key={k} className="contents">
              <dt>
                <Kbd className="h-6 px-2 text-xs">{k}</Kbd>
              </dt>
              <dd className="text-text-2">{i18n._(what)}</dd>
            </div>
          ))}
        </dl>
        <ResponsiveDialogFooter>
          <Button onClick={onClose}>
            <Trans>Close</Trans>
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
