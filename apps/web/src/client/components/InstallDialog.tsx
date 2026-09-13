import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "./Button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "./ResponsiveDialog";

/**
 * The steps for a browser that has no install prompt of its own. iPhone and iPad only let a
 * web app send reminders once it is on the Home Screen, so the reminder switch opens this too.
 */
export function InstallDialog({
  open,
  onClose,
  ios,
}: {
  open: boolean;
  onClose: () => void;
  ios: boolean;
}) {
  const { t } = useLingui();
  return (
    <ResponsiveDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {ios ? t`Add Lymi to your Home Screen` : t`Install Lymi`}
          </ResponsiveDialogTitle>
          {ios ? (
            <ResponsiveDialogDescription render={<ol className="grid list-decimal gap-2 ps-5" />}>
              <li>
                <Trans>Open Lymi in Safari and tap Share.</Trans>
              </li>
              <li>
                <Trans>Tap Add to Home Screen.</Trans>
              </li>
              <li>
                <Trans>Open Lymi from the new icon.</Trans>
              </li>
            </ResponsiveDialogDescription>
          ) : (
            <ResponsiveDialogDescription>
              <Trans>
                Open your browser menu and choose Install Lymi. Not every browser offers it.
              </Trans>
            </ResponsiveDialogDescription>
          )}
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <Button onClick={onClose}>
            <Trans>Close</Trans>
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
