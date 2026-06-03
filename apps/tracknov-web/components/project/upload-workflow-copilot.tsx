"use client";

import { useState } from "react";
import { Sparkles, Check, X, FileText, Briefcase, ChevronRight } from "lucide-react";
import { Button } from "@tracknov/ui/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@tracknov/ui/ui/card";
import { acceptCopilotSuggestionsAction, dismissCopilotSuggestionsAction } from "@/app/actions/copilot-actions";
import { toast } from "sonner";

interface CopilotProps {
  documentId: string;
  projectId: string;
  intelligence: {
    evidence_type?: string | null;
    suggested_credits?: Array<{ creditCode: string; creditId: string }>;
    responsible_roles?: Array<{ roleName: string; roleId: string; action: string }>;
    summary?: string | null;
  };
}

export function UploadWorkflowCopilot({ documentId, projectId, intelligence }: CopilotProps) {
  const [isPending, setIsPending] = useState(false);

  if (!intelligence || (!intelligence.suggested_credits?.length && !intelligence.responsible_roles?.length)) {
    return null;
  }

  const handleAccept = async () => {
    setIsPending(true);
    const res = await acceptCopilotSuggestionsAction(
      documentId,
      projectId,
      intelligence.suggested_credits || [],
      intelligence.responsible_roles || [],
      intelligence.evidence_type || "UNKNOWN"
    );
    setIsPending(false);

    if (res.ok) {
      toast.success("Document mapped and roles assigned successfully.");
    } else {
      toast.error(res.error || "Failed to accept suggestions.");
    }
  };

  const handleDismiss = async () => {
    setIsPending(true);
    const res = await dismissCopilotSuggestionsAction(documentId, projectId);
    setIsPending(false);
    
    if (!res.ok) {
      toast.error(res.error || "Failed to dismiss suggestions.");
    }
  };

  return (
    <Card className="mt-2 border border-emerald-500/30 bg-emerald-500/5 shadow-sm">
      <CardHeader className="py-3 pb-2 flex flex-row items-center gap-2">
        <Sparkles className="h-5 w-5 text-emerald-500" />
        <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Harita Copilot Suggestions</CardTitle>
      </CardHeader>
      <CardContent className="py-2 text-sm text-[var(--color-text-secondary)] space-y-4">
        {intelligence.summary && (
          <p className="text-xs italic border-l-2 border-emerald-500/50 pl-2">{intelligence.summary}</p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {intelligence.suggested_credits && intelligence.suggested_credits.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                <FileText className="h-4 w-4" />
                Suggested Credits
              </div>
              <ul className="space-y-1">
                {intelligence.suggested_credits.map((c) => (
                  <li key={c.creditCode} className="flex items-center gap-1 text-xs">
                    <ChevronRight className="h-3 w-3 text-emerald-500" />
                    <span>{c.creditCode}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {intelligence.responsible_roles && intelligence.responsible_roles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                <Briefcase className="h-4 w-4" />
                Responsible Roles
              </div>
              <ul className="space-y-1">
                {intelligence.responsible_roles.map((r) => (
                  <li key={r.roleName} className="flex items-center gap-1 text-xs">
                    <ChevronRight className="h-3 w-3 text-emerald-500" />
                    <span className="capitalize">{r.roleName.toLowerCase()}</span>
                    <span className="text-muted-foreground opacity-70">({r.action.toLowerCase()})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="py-3 pt-2 flex justify-end gap-2 border-t border-emerald-500/10">
        <Button 
          variant="ghost" 
          onClick={handleDismiss} 
          disabled={isPending}
          className="text-muted-foreground hover:text-[var(--color-text-primary)] text-xs h-8"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Dismiss
        </Button>
        <Button 
          variant="default" 
          onClick={handleAccept} 
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          Accept All
        </Button>
      </CardFooter>
    </Card>
  );
}
