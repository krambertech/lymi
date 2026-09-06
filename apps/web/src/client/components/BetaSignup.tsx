import { useMutation } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, joinBeta } from "../lib/api";
import { AuthNotice } from "./AuthNotice";
import { Button } from "./Button";
import { Field, Input } from "./Field";

interface Props {
  /** Kept with the address so we know which front door helped someone join. */
  source: "landing" | "join";
  /** A page gives the form more room than the landing section's compact conversion row. */
  layout?: "inline" | "stacked" | undefined;
  /** A surrounding panel already provides the success state's surface. */
  compact?: boolean | undefined;
}

const enter = { duration: 0.2, ease: [0.22, 1, 0.36, 1] } as const;

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return "Enter an email address like you@example.com.";
    if (error.status === 429) return "Too many attempts. Wait a minute, then try again.";
    if (error.status >= 500) {
      return "The beta list is temporarily unavailable. Your email was not saved. Try again later.";
    }
  }
  return "Unable to reach the beta list. Check your connection and try again.";
}

/**
 * The waiting-list action shared by the public landing page and invitation page. It captures
 * interest only: no account is created and no access is granted.
 */
export function BetaSignup({ source, layout = "inline", compact = false }: Props) {
  const still = useReducedMotion();
  const [email, setEmail] = useState("");
  const success = useRef<HTMLDivElement>(null);
  const join = useMutation({
    mutationFn: (address: string) => joinBeta(address, source),
  });
  const error = join.isError ? messageFor(join.error) : undefined;

  useEffect(() => {
    if (join.isSuccess) success.current?.focus();
  }, [join.isSuccess]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (address) join.mutate(address);
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait" initial={false}>
        {join.isSuccess ? (
          <motion.div
            ref={success}
            tabIndex={-1}
            role="status"
            key="done"
            initial={still ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={still ? { duration: 0 } : enter}
            className={clsx("outline-none", !compact && "edge rounded-lg bg-plate p-7 text-center")}
          >
            {compact ? (
              <AuthNotice
                tone="success"
                title={join.data.alreadyOn ? "You’re already on the list." : "You’re on the list."}
              >
                We’ll email <bdi className="font-medium text-text">{email.trim()}</bdi> when your
                invitation is ready. Nothing to do until then.
              </AuthNotice>
            ) : (
              <>
                <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-good-soft text-good">
                  <Check aria-hidden="true" className="size-5" />
                </span>
                <p className="mt-4 text-xl font-medium text-text">
                  {join.data.alreadyOn ? "You’re already on the list." : "You’re on the list."}
                </p>
                <p className="mt-2 text-base text-text-2">
                  We’ll email <bdi className="font-medium text-text">{email.trim()}</bdi> when your
                  invitation is ready. Nothing to do until then.
                </p>
              </>
            )}
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={submit}
            initial={false}
            exit={still ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={still ? { duration: 0 } : { duration: 0.14, ease: "easeOut" }}
          >
            <Field
              label="Email address"
              error={error}
              hint={
                source === "landing"
                  ? "We’ll only use this address to send your invitation. Joining does not create an account."
                  : undefined
              }
            >
              <div
                className={clsx(
                  "grid gap-3",
                  layout === "inline" && "@xl:grid-cols-[minmax(0,1fr)_auto]",
                )}
              >
                <Input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (join.isError) join.reset();
                  }}
                  className="h-12 min-w-0 md:h-12"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={join.isPending}
                  className={clsx("w-full", layout === "inline" && "@xl:w-auto")}
                >
                  {source === "join" ? "Request invitation" : "Join the beta"}
                </Button>
              </div>
            </Field>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
