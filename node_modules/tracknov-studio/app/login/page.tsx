import { Suspense } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { env } from "@/lib/env";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-4 lg:grid-cols-[1.1fr_420px]">
        <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="flex h-full flex-col justify-between gap-10 p-6 lg:p-8">
            <div className="flex items-center gap-3">
              <Image
                src="/tracknov-logo.svg"
                alt="Tracknov"
                width={308}
                height={60}
                className="h-12 w-auto"
              />
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
          </CardContent>
        </Card>

        <Card className="self-center">
          <CardHeader>
            <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">Sign in</h2>
            {env.isConfigured ? (
              <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                Sign in to open your live project workspace.
              </p>
            ) : (
              <div className="mt-1 rounded-lg border border-[var(--color-amber-light)] bg-[var(--color-amber-light)] px-3 py-2 text-xs text-[var(--color-amber)]">
                Live workspace credentials are not configured in this local app yet. Add Supabase connection values to enable real sign-in and user provisioning.
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <Suspense fallback={<LoginFormFallback />}>
              <LoginForm disabled={!env.isConfigured} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">Email</p>
        <div className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">Password</p>
        <div className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]" />
      </div>
      <div className="h-8 rounded-md border border-[var(--color-green)] bg-[var(--color-green)] opacity-70" />
    </div>
  );
}
