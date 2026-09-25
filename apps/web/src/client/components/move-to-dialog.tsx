import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { z } from "zod";
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
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

type NameCheck = (name: string) => { name: string; error?: string | undefined };

/** Checks a new name against its schema, in the words the field shows. */
export function useNameCheck(schema: z.ZodType<string>, missing: string): NameCheck {
  const { t } = useLingui();
  return (name) => {
    const parsed = schema.safeParse(name);
    if (parsed.success) return { name: parsed.data };
    return { name: "", error: name.trim() ? t`Keep the name under 80 characters.` : missing };
  };
}

interface Item {
  id: string;
  name: string;
}

interface Props<T extends Item> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  items: T[];
  /** The item everything moving is in: null when in none, undefined when they differ. */
  current: string | null | undefined;
  /** The row that takes them out of any item. */
  noneLabel: ReactNode;
  /** Names the row that opens the field and the field itself. */
  newLabel: string;
  placeholder: string;
  /** The longest name the schema takes. */
  maxLength: number | undefined;
  /** The name to create, or what is wrong with it. */
  validate: NameCheck;
  onMove: (item: T | null) => void;
  onCreate: (name: string) => Promise<unknown>;
  pending?: boolean | undefined;
  error?: string | undefined;
}

const row =
  "flex min-h-12 w-full items-center gap-3 px-4 text-start text-base transition-[background-color] duration-150 hoverable:hover:bg-hover aria-[current=true]:font-medium";

/** Something picks where it goes from where it is: an existing item, none, or a new one named here. */
export function MoveToDialog<T extends Item>({
  open,
  onOpenChange,
  title,
  description,
  error,
  ...list
}: Props<T>) {
  const key = useOpenKey(open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <MoveToList key={key} onClose={() => onOpenChange(false)} {...list} />
        {error && (
          <p className="text-sm" role="alert">
            <InlineError>{error}</InlineError>
          </p>
        )}
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="ghost">
                <Trans>Cancel</Trans>
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveToList<T extends Item>({
  items,
  current,
  noneLabel,
  newLabel,
  placeholder,
  maxLength,
  validate,
  onMove,
  onCreate,
  onClose,
  pending,
}: Omit<Props<T>, "open" | "onOpenChange" | "title" | "description" | "error"> & {
  onClose: () => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [invalid, setInvalid] = useState<string | undefined>();
  return (
    <ul className="edge max-h-[50dvh] overflow-y-auto rounded-lg bg-plate">
      {items.map((item) => (
        <li key={item.id} className="border-edge not-first:border-t">
          <button
            type="button"
            className={row}
            aria-current={item.id === current}
            onClick={() => (item.id === current ? onClose() : onMove(item))}
          >
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            {item.id === current && <Check className="size-[18px]" aria-hidden="true" />}
          </button>
        </li>
      ))}
      {current !== null && (
        <li className="border-edge not-first:border-t">
          <button type="button" className={clsx(row, "text-text-2")} onClick={() => onMove(null)}>
            <span className="min-w-0 flex-1">{noneLabel}</span>
          </button>
        </li>
      )}
      <li className="border-edge not-first:border-t">
        {naming ? (
          <form
            className="grid gap-2 p-3"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (pending) return;
              const result = validate(name);
              setInvalid(result.error);
              if (!result.error) void onCreate(result.name);
            }}
          >
            <Field>
              <FieldLabel>{newLabel}</FieldLabel>
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setInvalid(undefined);
                  }}
                  placeholder={placeholder}
                  autoComplete="off"
                  enterKeyHint="done"
                  maxLength={maxLength}
                  className="min-w-0 flex-1"
                />
                <Button variant="primary" type="submit" loading={pending}>
                  <Trans>Create and move</Trans>
                </Button>
              </div>
              <FieldError>{invalid}</FieldError>
            </Field>
          </form>
        ) : (
          <button
            type="button"
            className={clsx(row, "text-text-2")}
            onClick={() => setNaming(true)}
          >
            <Plus className="size-[18px]" aria-hidden="true" />
            <span className="min-w-0 flex-1">{newLabel}</span>
          </button>
        )}
      </li>
    </ul>
  );
}
