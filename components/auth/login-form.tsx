"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function safeNextPath(value: string | null) {
  return value && value.startsWith("/") ? value : "/dashboard";
}

function normalizeAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return "Email or password is incorrect.";
  }

  if (/email not confirmed/i.test(message)) {
    return "Check your email and confirm the account before signing in.";
  }

  return "Could not sign in right now.";
}

export function LoginForm({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const nextPath = safeNextPath(searchParams.get("next"));
  const authError = searchParams.get("error");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      setError("Live workspace credentials are not configured in this local app yet.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError(normalizeAuthError(signInError.message || ""));
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function onResetPassword() {
    if (disabled) {
      setError("Password recovery is unavailable until the live workspace is configured.");
      return;
    }

    if (!email.trim()) {
      setError("Enter your email first so we know where to send the reset link.");
      return;
    }

    setResettingPassword(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", "/reset-password");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectTo.toString(),
    });

    setResettingPassword(false);

    if (resetError) {
      setError(resetError.message || "Could not send the password reset email.");
      return;
    }

    setMessage("Password reset email sent. Open the link in your email to choose a new password.");
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {authError ? (
        <div className="rounded-lg border border-[var(--color-red-light)] bg-[var(--color-red-light)] p-3 text-[11px] text-[var(--color-red)]">
          Sign-in could not finish. Try again with your email and password.
        </div>
      ) : null}
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-[11px] font-medium text-[var(--color-text-secondary)]">
          Email
        </label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="consultant@company.com"
          disabled={disabled}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-[11px] font-medium text-[var(--color-text-secondary)]">
          Password
        </label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="........"
          disabled={disabled}
        />
      </div>
      {error ? <p className="text-[11px] text-[var(--color-red)]">{error}</p> : null}
      {message ? <p className="text-[11px] text-[var(--color-green)]">{message}</p> : null}
      {!disabled ? (
        <Button
          type="button"
          variant="ghost"
          className="h-auto justify-start rounded-none py-0 text-[11px]"
          disabled={resettingPassword || loading}
          onClick={() => void onResetPassword()}
        >
          {resettingPassword ? "Sending reset link..." : "Forgot password?"}
        </Button>
      ) : null}
      <Button type="submit" className="h-8 w-full rounded-md" disabled={loading || resettingPassword}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Sign in
      </Button>
    </form>
  );
}
