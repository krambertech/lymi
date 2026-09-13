import { clsx } from "clsx";
import { AlertCircle } from "lucide-react";
import {
  createContext,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useContext,
  useId,
} from "react";

interface FieldCtx {
  id: string;
  hintId?: string | undefined;
  errorId?: string | undefined;
  invalid: boolean;
}
const Ctx = createContext<FieldCtx | null>(null);
type AriaInvalid = boolean | "true" | "false" | "grammar" | "spelling" | undefined;

interface FieldProps {
  label: ReactNode;
  /** Short help under the control. */
  hint?: ReactNode | undefined;
  /** Error text. Presence marks the control invalid. Shown with an icon, never colour alone. */
  error?: ReactNode | undefined;
  /** Small text at the end of the label row, e.g. "Optional". */
  aside?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
}

/** Label, control, hint and error wired together. Put one Input, Textarea, Select or Combobox inside. */
export function Field({ label, hint, error, aside, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <Ctx.Provider value={{ id, hintId, errorId, invalid: !!error }}>
      <div className={clsx("grid gap-1.5", className)}>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-sm font-medium text-text-2">
            {label}
          </label>
          {aside && <span className="text-xs text-muted">{aside}</span>}
        </div>
        {children}
        {error ? (
          <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger" role="alert">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : hint ? (
          <p id={hintId} className="text-sm text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </Ctx.Provider>
  );
}

export const controlBase =
  "w-full rounded-md bg-plate text-text edge transition-[box-shadow,background-color] duration-150 " +
  "placeholder:text-muted hoverable:hover:edge-2 focus-visible:edge-2 " +
  "disabled:cursor-not-allowed disabled:bg-plate-2 disabled:text-muted " +
  "aria-invalid:shadow-[0_0_0_1px_var(--danger)]";

/**
 * Every control is the same box, so a form reads as one row repeated rather than a pile of
 * different objects: 44 px on the phone, 40 on the desktop, 16 px text so iOS does not zoom
 * on focus. Sized by the viewport rather than the container, because a phone is a phone
 * whatever it sits in — and because a sheet renders in a portal, where a container query has
 * nothing to measure and would silently never fire.
 */
export const controlSize = "h-11 text-[1rem] md:h-10 md:text-base";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  const a11y = useControlProps(props);
  return (
    <input
      ref={ref}
      className={clsx(controlBase, controlSize, "px-3.5", className)}
      {...props}
      {...a11y}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  const a11y = useControlProps(props);
  return (
    <textarea
      ref={ref}
      className={clsx(
        controlBase,
        "min-h-24 resize-y px-3.5 py-2.5 text-[1rem] leading-relaxed md:text-base",
        className,
      )}
      {...props}
      {...a11y}
    />
  );
});

/** Wires a control to its Field's id, hint, error and invalid state. Exported for Combobox and Select. */
export function useControlProps(props: {
  id?: string | undefined;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: AriaInvalid;
}) {
  const ctx = useContext(Ctx);
  const described = [props["aria-describedby"], ctx?.errorId ?? ctx?.hintId]
    .filter(Boolean)
    .join(" ");
  return {
    id: props.id ?? ctx?.id,
    "aria-describedby": described || undefined,
    "aria-invalid": props["aria-invalid"] ?? (ctx?.invalid ? true : undefined),
  };
}
