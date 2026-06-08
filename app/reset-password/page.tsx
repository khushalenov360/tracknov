import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1080px] items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="surface-card w-full p-6 text-[13px] text-[var(--color-text-secondary)]">
        Opening password reset...
      </div>
    </div>
  );
}
