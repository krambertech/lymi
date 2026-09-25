import { Trans, useLingui } from "@lingui/react/macro";
import { InviteInput } from "@lymi/core";
import { useId, useState } from "react";
import type { Invitation, Member } from "../lib/api";
import { useDesktop } from "../lib/device";
import { useOpenKey } from "../lib/use-open-key";
import { Button } from "./button";
import { ConfirmDialog } from "./confirm-dialog";
import {
  Dialog,
  DialogClose,
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
  return (
    <ConfirmDialog
      subject={member}
      onOpenChange={onOpenChange}
      title={({ name }) => t`Remove ${name}?`}
      description={
        <Trans>
          They lose this deck and can’t rejoin, by link or invitation. Their reviews are kept.
        </Trans>
      }
      dismiss={<Trans>Keep member</Trans>}
      confirm={<Trans>Remove member</Trans>}
      onConfirm={onRemove}
      pending={pending}
      error={error}
    />
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
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t`Turn off the join link?`}
      description={
        <Trans>
          The link stops working for good. People who joined stay in the deck, and sharing again
          makes a new link.
        </Trans>
      }
      dismiss={<Trans>Keep sharing</Trans>}
      confirm={<Trans>Turn off link</Trans>}
      onConfirm={onTurnOff}
      pending={pending}
    />
  );
}

interface CancelInvitationDialogProps {
  /** The invitation being taken back, or null while the dialog is closed. */
  invitation: Invitation | null;
  onOpenChange: (open: boolean) => void;
  onCancelInvitation: () => void;
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
  onCancelInvitation,
  pending,
  error,
}: CancelInvitationDialogProps) {
  const { t } = useLingui();
  return (
    <ConfirmDialog
      subject={invitation}
      onOpenChange={onOpenChange}
      title={({ email }) => t`Cancel the invitation to ${email}?`}
      description={
        <Trans>Their invitation link stops working. You can invite them again any time.</Trans>
      }
      dismiss={<Trans>Keep invitation</Trans>}
      confirm={<Trans>Cancel invitation</Trans>}
      onConfirm={onCancelInvitation}
      pending={pending}
      error={error}
    />
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
export function InviteDialog({ open, onOpenChange, ...body }: InviteDialogProps) {
  const { t } = useLingui();
  const key = useOpenKey(open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t`Invite by email`}</DialogTitle>
          <DialogDescription>
            <Trans>
              They get an email with a link only they can use. They can study the deck but not
              change it.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <InviteForm key={key} {...body} />
      </DialogContent>
    </Dialog>
  );
}

function InviteForm({
  onInvite,
  onChange,
  pending,
  error,
}: Omit<InviteDialogProps, "open" | "onOpenChange">) {
  const { t } = useLingui();
  const desktop = useDesktop();
  const fieldId = useId();
  const [email, setEmail] = useState("");
  const [refused, setRefused] = useState<string | undefined>(undefined);

  const submit = () => {
    if (pending) return;
    const typed = email.trim();
    if (!typed) {
      setRefused(t`Enter an email address.`);
      return;
    }
    const parsed = InviteInput.shape.email.safeParse(typed);
    if (!parsed.success) {
      setRefused(t`Enter a full email address, like anna@example.com.`);
      return;
    }
    setRefused(undefined);
    onInvite(parsed.data);
  };

  const message = refused ?? error;

  return (
    <>
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
            // On touch the drawer settles first and the keyboard waits for a tap on the field.
            autoFocus={desktop}
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
        <DialogClose
          render={
            <Button variant="ghost">
              <Trans>Cancel</Trans>
            </Button>
          }
        />
        <Button onClick={submit} loading={pending}>
          <Trans>Send invitation</Trans>
        </Button>
      </DialogFooter>
    </>
  );
}
