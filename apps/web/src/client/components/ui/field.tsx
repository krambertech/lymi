import { cn } from "cn";
import { AlertCircle } from "lucide-react";
import * as React from "react";

/*
 * shadcn's Field parts, wired by context instead of by hand: the label points at the control, the
 * control is described by whatever description and error are rendered, and an error on screen marks
 * the field and its control invalid together. Validation stays with the caller.
 */

type Kind = "description" | "error";

interface Describer {
  register: (id: string, kind: Kind) => () => void;
}

interface FieldContextValue {
  controlId: string;
  describedBy: string | undefined;
  invalid: boolean;
  disabled: boolean;
  /** A control that brings its own id; the label follows it. */
  claimId: (id: string) => () => void;
}

const DescriberContext = React.createContext<Describer | null>(null);
const FieldContext = React.createContext<FieldContextValue | null>(null);

function useDescribers() {
  const [parts, setParts] = React.useState<readonly { id: string; kind: Kind }[]>([]);
  const register = React.useCallback((id: string, kind: Kind) => {
    setParts((current) => [...current.filter((part) => part.id !== id), { id, kind }]);
    return () => setParts((current) => current.filter((part) => part.id !== id));
  }, []);
  // The error first, so a screen reader says what is wrong before how the field works.
  const ordered = [
    ...parts.filter((part) => part.kind === "error"),
    ...parts.filter((part) => part.kind === "description"),
  ];
  return {
    describer: React.useMemo(() => ({ register }), [register]),
    describedBy: ordered.map((part) => part.id).join(" ") || undefined,
    hasError: parts.some((part) => part.kind === "error"),
  };
}

function useDescribe(id: string | null, kind: Kind) {
  const describer = React.useContext(DescriberContext);
  React.useLayoutEffect(() => {
    if (describer && id) return describer.register(id, kind);
  }, [describer, id, kind]);
}

const joinIds = (...ids: (string | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

/** The nearest Field, or null for a control that stands alone. */
function useField() {
  return React.useContext(FieldContext);
}

interface ControlProps {
  id?: string | undefined;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

/**
 * The id, description and invalid state a control inside a Field takes from it. Outside a Field the
 * control's own props pass through unchanged.
 */
function useFieldControl(props: ControlProps) {
  const field = useField();
  const claimId = field?.claimId;
  React.useLayoutEffect(() => {
    if (claimId && props.id) return claimId(props.id);
  }, [claimId, props.id]);
  if (!field) {
    return {
      id: props.id,
      "aria-describedby": props["aria-describedby"],
      "aria-invalid": props["aria-invalid"],
    };
  }
  return {
    id: props.id ?? field.controlId,
    "aria-describedby": joinIds(props["aria-describedby"], field.describedBy),
    // The Field decides, so `data-invalid` on it and `aria-invalid` here can never disagree.
    "aria-invalid": field.invalid || undefined,
  };
}

function FieldSet({
  className,
  "aria-describedby": describedByProp,
  ...props
}: React.ComponentProps<"fieldset">) {
  const { describer, describedBy } = useDescribers();
  return (
    <DescriberContext.Provider value={describer}>
      <fieldset
        data-slot="field-set"
        aria-describedby={joinIds(describedByProp, describedBy)}
        className={cn("flex min-w-0 flex-col gap-4", className)}
        {...props}
      />
    </DescriberContext.Provider>
  );
}

interface FieldLegendProps extends React.ComponentProps<"legend"> {
  /** `label` reads like a field's label, for a set that stands in for one field. */
  variant?: "legend" | "label" | undefined;
}

function FieldLegend({ className, variant = "legend", ...props }: FieldLegendProps) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-1.5 p-0 font-medium",
        variant === "legend" ? "text-base text-text" : "text-sm text-text-2",
        className,
      )}
      {...props}
    />
  );
}

/** Fields stacked with the form's rhythm. */
function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
    />
  );
}

interface FieldProps extends React.ComponentProps<"div"> {
  orientation?: "vertical" | "horizontal" | undefined;
  /** Marks the field invalid without a `FieldError` inside it. A rendered error already does. */
  invalid?: boolean | undefined;
  /** Disables the control inside as well. */
  disabled?: boolean | undefined;
}

function Field({
  className,
  orientation = "vertical",
  invalid: invalidProp = false,
  disabled = false,
  ...props
}: FieldProps) {
  const generatedId = React.useId();
  const [claimedId, setClaimedId] = React.useState<string | null>(null);
  const claimId = React.useCallback((id: string) => {
    setClaimedId(id);
    return () => setClaimedId((current) => (current === id ? null : current));
  }, []);
  const { describer, describedBy, hasError } = useDescribers();
  const invalid = invalidProp || hasError;
  const context = React.useMemo(
    () => ({ controlId: claimedId ?? generatedId, describedBy, invalid, disabled, claimId }),
    [claimedId, generatedId, describedBy, invalid, disabled, claimId],
  );
  return (
    <DescriberContext.Provider value={describer}>
      <FieldContext.Provider value={context}>
        {/* biome-ignore lint/a11y/useSemanticElements: one control and its text, which a fieldset is not */}
        <div
          role="group"
          data-slot="field"
          data-orientation={orientation}
          data-invalid={invalid || undefined}
          data-disabled={disabled || undefined}
          className={cn(
            "group/field flex w-full min-w-0",
            orientation === "vertical"
              ? "flex-col gap-1.5"
              : "flex-row items-center gap-3 has-[>[data-slot=field-content]]:items-start",
            className,
          )}
          {...props}
        />
      </FieldContext.Provider>
    </DescriberContext.Provider>
  );
}

/** The control's side of a horizontal field, holding it with its description and error. */
function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-1.5", className)}
      {...props}
    />
  );
}

function FieldLabel({ className, htmlFor, ...props }: React.ComponentProps<"label">) {
  const field = useField();
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Field supplies htmlFor.
    <label
      data-slot="field-label"
      htmlFor={htmlFor ?? field?.controlId}
      className={cn("w-fit text-sm font-medium text-text-2", className)}
      {...props}
    />
  );
}

function FieldDescription({ className, id, ...props }: React.ComponentProps<"p">) {
  const generatedId = React.useId();
  const ownId = id ?? generatedId;
  useDescribe(ownId, "description");
  return (
    <p
      id={ownId}
      data-slot="field-description"
      className={cn(
        "text-sm text-muted [&>a]:underline [&>a]:underline-offset-4 hoverable:[&>a:hover]:text-text",
        className,
      )}
      {...props}
    />
  );
}

interface FieldErrorProps extends React.ComponentProps<"div"> {
  /** Issues from a form library; repeats of one message show once. `children` wins when given. */
  errors?: readonly ({ message?: string | undefined } | undefined)[] | undefined;
}

/** Renders nothing without a message, so it can sit in the field before anything is wrong. */
function FieldError({ className, id, children, errors, ...props }: FieldErrorProps) {
  const generatedId = React.useId();
  const ownId = id ?? generatedId;
  const messages = [
    ...new Set((errors ?? []).map((error) => error?.message).filter((message) => !!message)),
  ];
  const hasChildren =
    children !== undefined && children !== null && children !== false && children !== "";
  const lines = hasChildren ? [children] : messages;
  useDescribe(lines.length > 0 ? ownId : null, "error");
  if (lines.length === 0) return null;
  return (
    <div
      id={ownId}
      role="alert"
      data-slot="field-error"
      className={cn("flex flex-col gap-1 text-sm text-danger", className)}
      {...props}
    >
      {lines.map((line) => (
        <div
          key={typeof line === "string" ? line : "children"}
          className="flex items-start gap-1.5"
        >
          {/* Never colour alone: the icon marks each line as an error in any palette. */}
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">{line}</div>
        </div>
      ))}
    </div>
  );
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  useField,
  useFieldControl,
};
