"use client";

import { MoonStar, MonitorSmartphone, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "harita-theme";

type ThemeMode = "light" | "dark" | "system";

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: ThemeMode) {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(theme: ThemeMode) {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function themeLabel(theme: ThemeMode) {
  if (theme === "system") {
    return "System";
  }
  return theme === "dark" ? "Dark" : "Light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initialTheme: ThemeMode = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (theme !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  function setThemeMode(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
      {[
        { key: "light" as const, icon: SunMedium, label: "Light" },
        { key: "dark" as const, icon: MoonStar, label: "Dark" },
        { key: "system" as const, icon: MonitorSmartphone, label: "System" },
      ].map((option) => {
        const active = mounted ? theme === option.key : option.key === "system";
        const Icon = option.icon;

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => setThemeMode(option.key)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2 text-[11px] font-medium transition",
              active
                ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            )}
            aria-pressed={active}
            aria-label={`Use ${option.label.toLowerCase()} theme`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{option.label}</span>
          </button>
        );
      })}
      <span className="sr-only">Current theme: {themeLabel(theme)}</span>
    </div>
  );
}
