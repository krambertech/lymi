import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Button } from "../components/Button";
import { ApiError, joinBeta } from "../lib/api";

/**
 * The page's one conversion. Joining captures interest and nothing else: no account is
 * created and no access is granted, which the form says out loud so nobody waits for a
 * password that is never coming.
 */
export function JoinBeta() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const join = useMutation({
    mutationFn: (address: string) => joinBeta(address),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!address) return;
    join.mutate(address);
  };

  if (join.isSuccess) {
    return (
      <div className="mx-auto max-w-[420px] rounded-md bg-plate p-6 text-center edge">
        <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-good-soft text-good">
          <Check aria-hidden="true" className="size-5" />
        </span>
        <p className="mt-3 text-lg font-medium text-text">
          {join.data.alreadyOn ? "You were already on the list." : "You are on the list."}
        </p>
        <p className="mt-1.5 text-sm text-text-2">
          We will write to {email.trim()} when there is room. Nothing to do until then.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-[420px]">
      <label htmlFor={emailId} className="block text-sm font-medium text-text">
        Your email
      </label>
      <div className="mt-2 flex flex-col gap-2 @sm:flex-row">
        <input
          id={emailId}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-sm bg-plate px-3.5 text-text edge placeholder:text-faint"
        />
        <Button type="submit" variant="primary" size="lg" loading={join.isPending}>
          Join the beta
        </Button>
      </div>
      {join.isError && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {join.error instanceof ApiError && join.error.status === 400
            ? "That does not look like an email address. Check it and try again."
            : "That did not go through. Try again in a moment."}
        </p>
      )}
      <p className="mt-3 text-sm text-muted">
        Joining the list saves your address and nothing else. It does not create an account, and
        access to the app stays invitation only.
      </p>
    </form>
  );
}
