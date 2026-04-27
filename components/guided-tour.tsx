"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GuidedTourStep = {
  selector?: string;
  title: string;
  body: string;
};

type GuidedTourProps = {
  storageKey: string;
  steps: GuidedTourStep[];
  startOnMount?: boolean;
  label?: string;
};

export function GuidedTour({ storageKey, steps, startOnMount = false, label = "Show tour" }: GuidedTourProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setMounted(true);
    const seen = window.localStorage.getItem(storageKey) === "1";
    if (startOnMount && !seen) {
      setOpen(true);
    }
  }, [storageKey, startOnMount]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const step = steps[index];
    const updateTarget = () => {
      if (!step?.selector) {
        setTargetRect(null);
        return;
      }

      const element = document.querySelector(step.selector) as HTMLElement | null;
      if (!element) {
        setTargetRect(null);
        return;
      }

      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      requestAnimationFrame(() => {
        setTargetRect(element.getBoundingClientRect());
      });
    };

    updateTarget();
    const handleResize = () => updateTarget();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [index, open, steps]);

  const panelStyle = useMemo(() => {
    if (!mounted) {
      return {};
    }

    if (!targetRect || window.innerWidth < 960) {
      return {
        left: "16px",
        right: "16px",
        bottom: "16px",
      } as const;
    }

    const panelWidth = 360;
    const left = Math.min(window.innerWidth - panelWidth - 16, Math.max(16, targetRect.right + 20));
    const top = Math.min(window.innerHeight - 220, Math.max(16, targetRect.top));

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${panelWidth}px`,
    } as const;
  }, [mounted, targetRect]);

  const spotlightStyle = useMemo(() => {
    if (!targetRect || !mounted) {
      return null;
    }

    return {
      top: `${Math.max(8, targetRect.top - 8)}px`,
      left: `${Math.max(8, targetRect.left - 8)}px`,
      width: `${targetRect.width + 16}px`,
      height: `${targetRect.height + 16}px`,
    } as const;
  }, [mounted, targetRect]);

  const currentStep = steps[index];

  function closeTour() {
    setOpen(false);
    setIndex(0);
    window.localStorage.setItem(storageKey, "1");
  }

  function nextStep() {
    if (index >= steps.length - 1) {
      closeTour();
      return;
    }
    setIndex((value) => value + 1);
  }

  function previousStep() {
    setIndex((value) => Math.max(0, value - 1));
  }

  if (!mounted) {
    return null;
  }

  return (
    <>
      {!open ? (
        <Button
          type="button"
          variant="secondary"
          className="fixed bottom-4 right-4 z-40 h-9 rounded-full px-4 text-[12px] shadow-lg shadow-black/10"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {label}
        </Button>
      ) : null}

      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close tour"
                className="fixed inset-0 z-50 cursor-default bg-[rgba(7,10,13,0.72)]"
                onClick={closeTour}
              />
              {spotlightStyle ? (
                <div
                  className="pointer-events-none fixed z-[51] rounded-[28px] border-2 border-[var(--color-green)] shadow-[0_0_0_9999px_rgba(7,10,13,0.72)] transition-all duration-300"
                  style={spotlightStyle}
                />
              ) : null}
              <div
                className="fixed z-[52] rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[var(--color-text-primary)] shadow-2xl shadow-black/20"
                style={panelStyle}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="dense-label">Guided tour</p>
                    <h2 className="mt-2 text-[15px] font-medium leading-tight">{currentStep.title}</h2>
                  </div>
                  <Button type="button" variant="secondary" className="h-8 w-8 rounded-full p-0" onClick={closeTour}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-3 text-[12px] leading-6 text-[var(--color-text-secondary)]">{currentStep.body}</p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-[var(--color-text-tertiary)]">
                    Step {index + 1} of {steps.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" className="h-8 rounded-full px-3 text-[11px]" onClick={previousStep} disabled={index === 0}>
                      <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                      Back
                    </Button>
                    <Button type="button" className="h-8 rounded-full px-3 text-[11px]" onClick={nextStep}>
                      {index === steps.length - 1 ? "Finish" : "Next"}
                      {index === steps.length - 1 ? null : <ArrowRight className="ml-1 h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
