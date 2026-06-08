import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordFallback() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1080px] items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="surface-card w-full p-6 text-[13px] text-[var(--color-text-secondary)]">
        Opening password recovery...
      </div>
    </div>
  );
}
