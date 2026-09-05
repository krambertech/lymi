import { clsx } from "clsx";
import { AlertCircle, ChevronDown } from "lucide-react";
import {
  createContext,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
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

/** Label, control, hint and error wired together. Put one Input, Textarea or Select inside. */
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

const control =
  "w-full rounded-md bg-plate text-text edge transition-[box-shadow,background-color] duration-150 " +
  "placeholder:text-muted hoverable:hover:edge-2 focus-visible:edge-2 " +
  "disabled:cursor-not-allowed disabled:bg-plate-2 disabled:text-muted " +
  "aria-invalid:shadow-[0_0_0_1px_var(--danger)]";

function useControlProps(props: {
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

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  /** Larger box and type, for the one field that matters on a screen. */
  fieldSize?: "md" | "lg" | undefined;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, fieldSize = "md", ...props },
  ref,
) {
  const a11y = useControlProps(props);
  return (
    <input
      ref={ref}
      className={clsx(
        control,
        fieldSize === "md" ? "h-10 px-3.5 text-[16px] @3xl:text-base" : "h-12 px-4 text-lg",
        className,
      )}
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
        control,
        "min-h-24 resize-y px-3.5 py-2.5 text-[16px] leading-relaxed @3xl:text-base",
        className,
      )}
      {...props}
      {...a11y}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    const a11y = useControlProps(props);
    return (
      <span className="relative block">
        <select
          ref={ref}
          className={clsx(
            control,
            "h-10 appearance-none pl-3.5 pr-9 text-[16px] @3xl:text-base",
            className,
          )}
          {...props}
          {...a11y}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      </span>
    );
  },
);
