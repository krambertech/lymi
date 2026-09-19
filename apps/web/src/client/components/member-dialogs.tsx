import { Trans, useLingui } from "@lingui/react/macro";
import { InviteInput } from "@lymi/core";
import { useEffect, useId, useState } from "react";
import type { Invitation, Member } from "../lib/api";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

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

interface TurnOffLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTurnOff: () => void;
  pending?: boolean | undefined;
}

/**
 * Turning the link off kills that URL for good, so it asks. The people who joined stay, which
 * is the part an owner is most likely to fear losing.
 */
export function TurnOffLinkDialog({
  open,
  onOpenChange,
  onTurnOff,
  pending,
}: TurnOffLinkDialogProps) {
  const { t } = useLingui();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t`Turn off the join link?`}</DialogTitle>
          <DialogDescription>
            <Trans>
              The link stops working for good. People who joined stay in the deck, and sharing again
              makes a new link.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Keep sharing</Trans>
          </Button>
          <Button variant="danger" onClick={onTurnOff} loading={pending} aria-disabled={pending}>
            <Trans>Turn off link</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CancelInvitationDialogProps {
  /** The invitation being taken back, or null while the dialog is closed. */
  invitation: Invitation | null;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  pending?: boolean | undefined;
  error?: string | undefined;
}

/**
 * Taking an invitation back kills the link in a message already sent, so it asks. Neither
 * button says "Cancel" on its own: here that word is the action, not the way out.
 */
export function CancelInvitationDialog({
  invitation,
  onOpenChange,
  onCancel,
  pending,
  error,
}: CancelInvitationDialogProps) {
  const { t } = useLingui();
  const email = invitation?.email ?? "";
  return (
    <Dialog open={!!invitation} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t`Cancel the invitation to ${email}?`}</DialogTitle>
          <DialogDescription>
            <Trans>
              The link in the message they were sent stops working. You can invite them again
              whenever you like.
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
            <Trans>Keep invitation</Trans>
          </Button>
          <Button variant="danger" onClick={onCancel} loading={pending} aria-disabled={pending}>
            <Trans>Cancel invitation</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (email: string) => void;
  /** The owner is typing again, so what the server said about the last address can go. */
  onChange?: (() => void) | undefined;
  pending?: boolean | undefined;
  /** What the server refused, which only it can know: already a member, already invited, full. */
  error?: string | undefined;
}

/**
 * Asking somebody in is a small form, so it gets a dialog rather than a field wedged into the
 * list. The button is never disabled: pressing it with nothing typed says what is missing,
 * which teaches more than a control that cannot be pressed.
 */
export function InviteDialog({
  open,
  onOpenChange,
  onInvite,
  onChange,
  pending,
  error,
}: InviteDialogProps) {
  const { t } = useLingui();
  const fieldId = useId();
  const [email, setEmail] = useState("");
  const [refused, setRefused] = useState<string | undefined>(undefined);

  // Each opening starts clean, so an earlier refusal is not the first thing anyone reads.
  useEffect(() => {
    if (!open) return;
    setEmail("");
    setRefused(undefined);
  }, [open]);

  const submit = () => {
    if (pending) return;
    const typed = email.trim();
    if (!typed) {
      setRefused(t`Type the email address you want to invite.`);
      return;
    }
    const parsed = InviteInput.shape.email.safeParse(typed);
    if (!parsed.success) {
      setRefused(t`That does not look like an email address.`);
      return;
    }
    setRefused(undefined);
    onInvite(parsed.data);
  };

  const message = refused ?? error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t`Invite by email`}</DialogTitle>
          <DialogDescription>
            <Trans>
              They get a message from Lymi with a link only their address can use. They can study
              the deck, never change it.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field>
            <FieldLabel htmlFor={fieldId}>{t`Email address`}</FieldLabel>
            <Input
              id={fieldId}
              type="email"
              inputMode="email"
              autoComplete="off"
              autoFocus
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setRefused(undefined);
                onChange?.();
              }}
              placeholder={t`anna@example.com`}
              aria-invalid={message ? true : undefined}
            />
            {message && <FieldError>{message}</FieldError>}
          </Field>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={submit} loading={pending}>
            <Trans>Send invitation</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
