"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter the email address for your Tracknov account.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", "/reset-password");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectTo.toString(),
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message || "Could not send the password reset email.");
      return;
    }

    setMessage("Password reset email sent. Open the link in your email to choose a new password.");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1080px] items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-4 lg:grid-cols-[1.1fr_420px]">
        <Card className="surface-card overflow-hidden">
          <CardContent className="flex h-full flex-col justify-between gap-10 p-6 lg:p-8">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                Account recovery
              </p>
              <h1 className="max-w-[16ch] text-[28px] font-medium leading-tight text-[var(--color-text-primary)] sm:text-[34px]">
                Reset access without changing project permissions.
              </h1>
              <p className="max-w-[60ch] text-[13px] leading-6 text-[var(--color-text-secondary)]">
                Tracknov sends a secure email link that opens the password reset screen for the same workspace account.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {["Email verification", "Same role access", "Secure reset session"].map((item) => (
                <div key={item} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-xs text-[var(--color-text-secondary)]">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card self-center">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-green-light)] text-[var(--color-green)]">
                {message ? <CheckCircle2 className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
              </div>
              <div>
                <p className="dense-label">Password reset</p>
                <h2 className="mt-1 text-[15px] font-medium text-[var(--color-text-primary)]">Send reset link</h2>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-[var(--color-text-secondary)]">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="consultant@company.com"
                  autoComplete="email"
                />
              </div>

              {error ? <p className="text-xs text-[var(--color-red)]">{error}</p> : null}
              {message ? <p className="text-xs text-[var(--color-green)]">{message}</p> : null}

              <Button type="submit" className="h-9 w-full rounded-md" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send reset link
              </Button>
            </form>

            <Link
              href="/login"
              className="inline-flex h-9 w-full items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]"
            >
              Back to login
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
