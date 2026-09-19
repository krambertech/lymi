import { Trans, useLingui } from "@lingui/react/macro";
import type { Member } from "../lib/api";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface RemoveMemberDialogProps {
  /** The member being removed, or null while the dialog is closed. */
  member: Member | null;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
  pending?: boolean | undefined;
  error?: string | undefined;
}

/**
 * Removal is the one membership action with no way back: the join link refuses the account
 * afterwards, and nothing else readmits them yet. So it asks, and says that plainly.
 */
export function RemoveMemberDialog({
  member,
  onOpenChange,
  onRemove,
  pending,
  error,
}: RemoveMemberDialogProps) {
  const { t } = useLingui();
  const name = member?.name ?? "";
  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t`Remove ${name}?`}</DialogTitle>
          <DialogDescription>
            <Trans>
              They lose this deck and the join link will not let them back. Their reviews stay, but
              there is no way to add them again yet.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button variant="danger" onClick={onRemove} loading={pending} aria-disabled={pending}>
            <Trans>Remove member</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
