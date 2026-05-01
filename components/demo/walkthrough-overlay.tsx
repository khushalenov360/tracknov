"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { demoService, DemoStep } from "@/lib/services/demo-service";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function WalkthroughOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";
  
  const [activeStep, setActiveStep] = useState(0);
  const [steps, setSteps] = useState<DemoStep[]>([]);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    setSteps(demoService.getDemoWalkthrough());
  }, []);

  const updateCoords = useCallback(() => {
    if (!steps.length) return;
    const step = steps[activeStep];
    const el = document.getElementById(step.highlightId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setCoords({ top: 0, left: 0, width: 0, height: 0 });
    }
  }, [activeStep, steps]);

  useEffect(() => {
    if (isDemoMode) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      return () => window.removeEventListener("resize", updateCoords);
    }
  }, [isDemoMode, activeStep, steps, updateCoords, pathname]);

  if (!isDemoMode || !steps.length) return null;

  const currentStep = steps[activeStep];
  const isLast = activeStep === steps.length - 1;

  const next = () => {
    if (isLast) {
      router.push(pathname); // Clear search params
      return;
    }
    const nextStep = steps[activeStep + 1];
    if (nextStep.target !== pathname && !nextStep.target.includes("[id]")) {
       router.push(`${nextStep.target}?demo=true`);
    }
    setActiveStep(prev => prev + 1);
  };

  const prev = () => {
    if (activeStep > 0) setActiveStep(prev => prev - 1);
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dim Overlay with Hole */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" 
           style={{ 
             clipPath: coords.width > 0 
               ? `polygon(0% 0%, 0% 100%, ${coords.left}px 100%, ${coords.left}px ${coords.top}px, ${coords.left + coords.width}px ${coords.top}px, ${coords.left + coords.width}px ${coords.top + coords.height}px, ${coords.left}px ${coords.top + coords.height}px, ${coords.left}px 100%, 100% 100%, 100% 0%)`
               : "none"
           }} 
      />

      {/* Tooltip Card */}
      <div 
        className="absolute bg-[var(--color-surface)] border border-[var(--color-border-strong)] p-5 rounded-xl shadow-2xl pointer-events-auto transition-all duration-300 w-[320px]"
        style={{
          top: coords.top + coords.height + 20,
          left: Math.max(20, Math.min(window.innerWidth - 340, coords.left + (coords.width/2) - 160)),
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-green)]">Step {activeStep + 1} of {steps.length}</span>
          <button onClick={() => router.push(pathname)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">✕</button>
        </div>
        <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-2">{currentStep.title}</h3>
        <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-6">
          {currentStep.instruction}
        </p>
        
        <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
          <Button variant="secondary" size="sm" onClick={prev} disabled={activeStep === 0} className="h-8 text-[12px]">Back</Button>
          <Button onClick={next} size="sm" className="h-8 bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)] text-[12px]">
            {isLast ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
