import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useState } from "react";
import { ApiError, joinBeta } from "../lib/api";

const SPRING = { type: "spring", duration: 0.5, bounce: 0.2 } as const;

/**
 * The page's one conversion. Joining captures interest and nothing else: no account is
 * created and no access is granted, which the form says out loud so nobody waits for a
 * password that is never coming.
 *
 * The field and its button share one bordered row rather than sitting as two loose controls
 * of different heights, which is what makes a signup box look considered instead of assembled.
 */
export function JoinBeta() {
  const emailId = "beta-email";
  const still = useReducedMotion();
  const [email, setEmail] = useState("");
  const join = useMutation({ mutationFn: (address: string) => joinBeta(address) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (address) join.mutate(address);
  };

  return (
    <div className="w-full max-w-[480px]">
      <AnimatePresence mode="wait" initial={false}>
        {join.isSuccess ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={still ? { duration: 0 } : SPRING}
            className="bg-plate p-7 text-center edge"
            style={{ borderRadius: 16 }}
          >
            <motion.span
              initial={still ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={still ? { duration: 0 } : { ...SPRING, delay: 0.1 }}
              className="mx-auto flex size-10 items-center justify-center rounded-full bg-good-soft text-good"
            >
              <Check aria-hidden="true" className="size-5" />
            </motion.span>
            <p className="mt-4 text-xl font-medium text-text">
              {join.data.alreadyOn ? "You were already on the list." : "You’re on the list."}
            </p>
            <p className="mt-2 text-base text-text-2">
              We will write to {email.trim()} when there is room. Nothing to do until then.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={submit}
            initial={false}
            exit={{ opacity: 0, y: -10 }}
            transition={still ? { duration: 0 } : { duration: 0.2 }}
          >
            <label htmlFor={emailId} className="text-sm font-medium text-text">
              Email address
            </label>
            <div
              className="mt-2 flex flex-col gap-2 bg-plate p-2 edge focus-within:shadow-[0_0_0_1px_var(--amber)] @xl:flex-row @xl:items-center"
              style={{ borderRadius: 14 }}
            >
              <input
                id={emailId}
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-text outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                disabled={join.isPending}
                className="flex h-11 shrink-0 items-center justify-center gap-1.5 bg-amber px-4 font-medium text-amber-ink transition-[background-color,scale] duration-150 ease-out hoverable:hover:bg-amber-hover active:scale-[0.96] disabled:opacity-60"
                style={{ borderRadius: 10 }}
              >
                {join.isPending ? "Joining…" : "Join the beta"}
                {!join.isPending && <ArrowRight aria-hidden="true" className="size-4" />}
              </button>
            </div>

            {join.isError && (
              <p className="mt-3 text-sm text-danger" role="alert">
                {join.error instanceof ApiError && join.error.status === 400
                  ? "Enter an email address like you@example.com."
                  : "Unable to join the list. Check your connection and try again."}
              </p>
            )}

            <p className="mt-4 text-sm text-muted">
              We save your email only to send an invitation. Joining the list does not create an
              account.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
