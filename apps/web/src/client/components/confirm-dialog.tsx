import { type ComponentProps, type ReactNode, useRef, useState } from "react";
import { useOpenKey } from "../lib/use-open-key";
import { Button } from "./button";
import { InlineError } from "./inline-error";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type Slot<S> = ReactNode | ((subject: S) => ReactNode);

interface Shared<S, V> {
  onOpenChange: (open: boolean) => void;
  title: Slot<S>;
  description: Slot<S>;
  /** The way out, which closes the dialog and changes nothing. */
  dismiss: ReactNode;
  confirm: Slot<S>;
  tone?: "danger" | "primary" | undefined;
  onConfirm: (value: V) => void;
  pending?: boolean | undefined;
  error?: string | undefined;
  /** Where the body's value starts on every opening. */
  defaultValue?: V | undefined;
  /** An extra body between the description and the actions, such as a choice or a list. */
  children?: ((subject: S, value: V, setValue: (value: V) => void) => ReactNode) | undefined;
  /** The centred dialog's width. */
  size?: ComponentProps<typeof DialogContent>["size"];
  /** Where focus lands on closing, when the control that opened it is gone. */
  finalFocus?: ComponentProps<typeof DialogContent>["finalFocus"];
}

type Props<S, V> = Shared<S, V> &
  (
    | {
        /** Open while set, and still shown while the dialog closes. */
        subject: S | null | undefined;
        open?: undefined;
      }
    | { open: boolean; subject?: undefined }
  );

/**
 * A question before an action: a title, what happens, a way out and the action. The body starts
 * clean on every opening, and the subject stays named while the dialog closes.
 */
export function ConfirmDialog<S, V = undefined>({
  subject: given,
  open: openProp,
  onOpenChange,
  title,
  description,
  size,
  finalFocus,
  ...body
}: Props<S, V>) {
  const open = openProp ?? given != null;
  const last = useRef(given);
  if (given != null) last.current = given;
  const subject = given ?? last.current;
  const key = useOpenKey(open);
  const fill = (slot: Slot<S>) =>
    typeof slot === "function" ? subject != null && slot(subject) : slot;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={size} finalFocus={finalFocus}>
        <DialogHeader>
          <DialogTitle>{fill(title)}</DialogTitle>
          <DialogDescription>{fill(description)}</DialogDescription>
        </DialogHeader>
        <ConfirmBody key={key} subject={subject} fill={fill} {...body} />
      </DialogContent>
    </Dialog>
  );
}

function ConfirmBody<S, V>({
  subject,
  fill,
  dismiss,
  confirm,
  tone = "danger",
  onConfirm,
  pending,
  error,
  defaultValue,
  children,
}: Omit<Shared<S, V>, "onOpenChange" | "title" | "description" | "size" | "finalFocus"> & {
  subject: S | null | undefined;
  fill: (slot: Slot<S>) => ReactNode;
}) {
  // A body without a value never reads it, so `undefined` stands in for V there.
  const [value, setValue] = useState(defaultValue as V);
  return (
    <>
      {children && subject != null && children(subject, value, setValue)}
      {error && (
        <p className="text-sm" role="alert">
          <InlineError>{error}</InlineError>
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="ghost">{dismiss}</Button>} />
        <Button
          variant={tone}
          onClick={() => onConfirm(value)}
          loading={pending}
          aria-disabled={pending}
        >
          {fill(confirm)}
        </Button>
      </DialogFooter>
    </>
  );
}
