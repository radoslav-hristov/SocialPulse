"use client";

import { useTransition } from "react";
import { signIn } from "next-auth/react";

type SignInButtonProps = {
  large?: boolean;
};

export function SignInButton({ large = false }: SignInButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(() => {
          void signIn("facebook", { callbackUrl: "/my-profile" });
        });
      }}
      className={`inline-flex items-center justify-center rounded-full bg-[var(--brand)] text-white transition hover:bg-[var(--brand-strong)] ${large ? "px-6 py-3 text-sm font-semibold" : "px-5 py-2.5 text-sm font-semibold"}`}
      disabled={isPending}
    >
      {isPending ? "Connecting..." : "Sign in with Facebook"}
    </button>
  );
}