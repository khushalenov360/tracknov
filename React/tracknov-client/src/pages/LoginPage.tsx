import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { Button } from "../components/ui-lib/ui/button";

function normalizeAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return "Email or password is incorrect.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Check your email and confirm the account before signing in.";
  }
  return "Could not sign in right now.";
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nextPath = searchParams.get("next") || "/";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError(normalizeAuthError(signInError.message || ""));
      return;
    }

    navigate(nextPath);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-4 lg:grid-cols-[1.1fr_420px]">
        <div className="overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl">
          <div className="flex h-full flex-col justify-between gap-10 p-6 lg:p-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center font-bold text-white text-xl">
                T
              </div>
            </div>

            <div className="max-w-[560px] space-y-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                IGBC Documentation Operations
              </p>
              <h1 className="text-[15px] font-medium leading-6 text-[var(--color-text-primary)]">
                Structured project controls for certification teams managing evidence, reviews, and submissions.
              </h1>
              <p className="text-[13px] leading-6 text-[var(--color-text-secondary)]">
                Track credits, review uploads, resolve remarks, and prepare submission packs without
                running parallel spreadsheets and chat threads.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                "Role-based access for platform and project teams",
                "Project-level and credit-level document workflows",
                "Tracker XLSX, PDF summary, and submission ZIP exports",
              ].map((item) => (
                <div key={item} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-xs text-[var(--color-text-secondary)]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="self-center border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">Sign in</h2>
            <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
              Sign in to open your live project workspace.
            </p>
          </div>
          
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-[var(--color-text-secondary)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="consultant@company.com"
                className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-text-tertiary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-[var(--color-text-secondary)]">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="........"
                className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-text-tertiary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {error ? <p className="text-xs text-[var(--color-red)]">{error}</p> : null}
            <Button type="submit" className="h-9 w-full rounded-md mt-4" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
