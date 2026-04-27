import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "danger";
  asChild?: boolean;
};

export function Button({
  className,
  variant = "default",
  type = "button",
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex h-8 items-center justify-center rounded-md border px-3 text-[12px] font-medium transition focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
    {
      "border-[var(--color-green)] bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)] hover:border-[var(--color-green-dim)]": variant === "default",
      "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]": variant === "secondary",
      "border-transparent bg-transparent px-0 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]": variant === "ghost",
      "border-[var(--color-red)] bg-[var(--color-red)] text-white hover:border-[#b91c1c] hover:bg-[#b91c1c]": variant === "danger",
    },
    className,
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      className: cn(classes, (children as React.ReactElement<{ className?: string }>).props.className),
    });
  }

  return (
    <button
      type={type}
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
}
