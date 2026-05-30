import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { certificationStrategyEngine } from '../shared/certification-strategy-engine.ts'
import { submissionReadinessEngine } from '../shared/submission-readiness-engine.ts'
import { evidenceGraphEngine } from '../shared/evidence-graph-engine.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildAssistantSystemPrompt(context: any, snapshot: string, role?: string) {
  const isExecutive = role === 'executive' || role === 'client';
  return `You are EnovAIT, an expert IGBC green building consultant AI.
Your goal is to guide the user through their green building certification process.

Current context:
${snapshot}

Instructions:
1. Provide accurate, clear, and actionable advice.
2. If the user asks about something outside the context of green buildings, politely decline.
3. Keep your tone ${isExecutive ? 'professional, executive, and concise' : 'helpful and technical'}.
4. Structure your response using markdown.
`;
}

type ProjectRow = { id: string; name: string; client?: string | null; location?: string | null; certification_type?: string | null; status?: string | null; };
type CreditRow = { id: string; project_id: string; credit_code: string; credit_name?: string; documents_required?: Array<any>; what_to_submit?: string | null; state: string; points?: number; };
type DocumentRow = { id: string; project_id: string; file_name: string; doc_category: string; state: string; uploaded_at: string; credit_id?: string; };

function buildWorkspaceSnapshot(
  projects: ProjectRow[],
  credits: CreditRow[],
  documents: DocumentRow[],
  role: string,
  guidebooks: Array<any>,
) {
  if (!projects.length) {
    return "No accessible projects were found for this user.";
  }

  const creditsByProject = new Map<string, CreditRow[]>();
  const docsByProject = new Map<string, DocumentRow[]>();

  for (const credit of credits) {
    const bucket = creditsByProject.get(credit.project_id) ?? [];
    bucket.push(credit);
    creditsByProject.set(credit.project_id, bucket);
  }

  for (const document of documents) {
    const bucket = docsByProject.get(document.project_id) ?? [];
    bucket.push(document);
    docsByProject.set(document.project_id, bucket);
  }

  const lines: string[] = [];
  lines.push(`Accessible projects: ${projects.length}`);

  for (const project of projects.slice(0, 12)) {
    const projectCredits = creditsByProject.get(project.id) ?? [];
    const projectDocs = docsByProject.get(project.id) ?? [];
    const completeCredits = projectCredits.filter((credit) => credit.state === "APPROVED" || credit.state === "complete").length;
    const blockedCredits = projectCredits.filter((credit) => credit.state === "blocked").length;
    const uploadedCount = projectDocs.filter((doc) => doc.state === "READY" || doc.state === "uploaded").length;
    const ownerReviewCount = projectDocs.filter((doc) => doc.state === "SUBMITTED").length;
    const approvedCount = projectDocs.filter((doc) => doc.state === "APPROVED").length;
    const rejectedCount = projectDocs.filter((doc) => doc.state === "REJECTED" || doc.state === "CLARIFICATION").length;
    const recentFiles = projectDocs
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .slice(0, 5)
      .map((doc) => role === "client" ? `${doc.doc_category}/${doc.state}` : `${doc.file_name} [${doc.doc_category}/${doc.state}]`)
      .join("; ");
    const topPendingCredits = projectCredits
      .filter((credit) => credit.state !== "APPROVED" && credit.state !== "complete")
      .slice(0, 5)
      .map((credit) => `${credit.credit_code}:${credit.state}`)
      .join(", ");

    lines.push(`Project ${project.name} | state=${project.status ?? "unknown"} | certification=${project.certification_type ?? "n/a"} | client=${project.client ?? "n/a"} | location=${project.location ?? "n/a"}`);
    let totalRequiredDocs = 0;
    for (const c of projectCredits) {
      if (Array.isArray(c.documents_required)) {
        totalRequiredDocs += c.documents_required.filter((d: any) => d.required).length;
      }
    }

    lines.push(`Credits: total=${projectCredits.length}, complete=${completeCredits}, blocked=${blockedCredits}. Documents: uploaded=${uploadedCount}, required=${totalRequiredDocs}, owner_review=${ownerReviewCount}, approved=${approvedCount}, rejected=${rejectedCount}.`);
    
    // Inject Certification Strategy Engine
    const strategy = certificationStrategyEngine.getStrategy(projectCredits);
    lines.push(certificationStrategyEngine.generateContextString(strategy));
    
    // Evaluate top pending credits via Submission Readiness Engine
    const topPendingEvaluated = projectCredits
      .filter((credit) => credit.state !== "APPROVED" && credit.state !== "complete")
      .slice(0, 3)
      .map(credit => submissionReadinessEngine.generateContextString(credit, projectDocs))
      .join("\n");
    if (topPendingEvaluated) lines.push(topPendingEvaluated);
    
    // Build evidence graph for recent files
    const recentFilesGraph = projectDocs
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .slice(0, 2)
      .map(doc => evidenceGraphEngine.generateContextString(doc, projectCredits))
      .join("\n");
    if (recentFilesGraph) lines.push(recentFilesGraph);
    
    const projectGuidebooks = guidebooks
      .filter((book) => book.project_id === project.id)
      .filter((book, index, all) => all.findIndex((entry) => entry.file_name === book.file_name) === index)
      .slice(0, 3);
    const latestGuidebook = projectGuidebooks
      .slice()
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0];
    lines.push(`Guidebook: ${projectGuidebooks.length ? projectGuidebooks.map((book) => `${book.title} (${book.file_name})`).join("; ") : "none uploaded"}`);
    lines.push(`Manual version lock: ${latestGuidebook ? `${latestGuidebook.file_name}@${latestGuidebook.created_at ?? "unknown"}` : "none"}`);
    const trackerPreview = projectCredits
      .slice(0, 5)
      .map((credit) => {
        const req = (credit.documents_required ?? []).filter((d) => d.required).map((d) => d.label).slice(0, 3).join(", ");
        return `${credit.credit_code}${credit.credit_name ? ` ${credit.credit_name}` : ""} -> required: ${req || "not set"}`;
      })
      .join(" | ");
    lines.push(`Tracker rows preview: ${trackerPreview || "none"}`);
    lines.push(`Recent files: ${recentFiles || "none"}`);
    lines.push(`Priority credits: ${topPendingCredits || "none"}`);
  }

  return lines.join("\n");
}

async function getWorkspaceSnapshot(supabase: any) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    throw new Error("Unauthorized user session for context extraction.");
  }

  const { data: profile } = await supabase.from("profiles").select("global_role").eq("user_id", user.id).maybeSingle();
  const metadataRole = typeof user.user_metadata?.role === "string" ? user.user_metadata.role : "";
  const resolvedRole = (profile?.global_role ?? metadataRole ?? "consultant") as string;

  const { data: projectsData, error: projError } = await supabase
    .from("projects")
    .select("id, name, client, location, certification_type, status")
    .order("created_at", { ascending: false })
    .limit(20);

  if (projError) throw new Error("Failed to fetch projects: " + projError.message);

  const projects = (projectsData ?? []) as ProjectRow[];
  const projectIds = projects.map((project: any) => project.id);

  if (!projectIds.length) {
    return { role: resolvedRole, projectIds, snapshot: "No projects currently available in the workspace." };
  }

  const [creditsRes, documentsRes, guidebooksRes] = await Promise.all([
    supabase.from("project_credits").select("id, project_id, credit_code, credit_name, documents_required, what_to_submit, state, points").in("project_id", projectIds).order("credit_code"),
    supabase.from("project_document").select("id, project_id, file_name, doc_category, state, uploaded_at, credit_id").in("project_id", projectIds).order("uploaded_at", { ascending: false }).limit(400),
    supabase.from("project_guidebooks").select("project_id, title, file_name, created_at").in("project_id", projectIds).order("created_at", { ascending: false })
  ]);

  const credits = (creditsRes.data ?? []) as CreditRow[];
  const documents = (documentsRes.data ?? []) as DocumentRow[];
  const guidebooks = (guidebooksRes.data ?? []) as any[];

  // Fetch recent intelligence for these documents
  const { data: intelligence } = await supabase
    .from("document_intelligence")
    .select("*")
    .in("document_id", documents.slice(0, 5).map(d => d.id));

  let snapshot = buildWorkspaceSnapshot(projects, credits, documents, resolvedRole, guidebooks);
  
  if (intelligence?.length) {
    snapshot += "\n\nRecent Document Intelligence:\n";
    for (const intel of intelligence) {
      const doc = documents.find(d => d.id === intel.document_id);
      snapshot += `- ${doc?.file_name}: ${intel.summary} [Relevance: ${intel.relevance_score}%] Risks: ${intel.risks?.join(", ") || "None"}\n`;
    }
  }

  return { role: resolvedRole, projectIds, snapshot };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, context, functionResults, snapshot: nextJsContext } = await req.json()

    // 1. Fetch AI Provider Secret
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not set in Edge secrets.")
    }

    // 2. Instantiate Supabase Client using the passed Authorization header JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const authHeader = req.headers.get('Authorization')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // 3. Extract Context directly from Edge (Zero serialization overhead to Next.js!)
    const { role, snapshot: dbSnapshot, projectIds } = await getWorkspaceSnapshot(supabase);
    const combinedSnapshot = [dbSnapshot, nextJsContext || ""].join("\n\n");

    // Build the payload
    const systemPrompt = buildAssistantSystemPrompt(context, combinedSnapshot, role)
    const geminiContents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    if (functionResults?.length) {
       geminiContents.push({
           role: "model",
           parts: functionResults.map((fc: any) => ({ functionCall: { name: fc.name, args: {} } }))
       });
       geminiContents.push({
           role: "function",
           parts: functionResults.map((fc: any) => ({ functionResponse: { name: fc.name, response: { result: fc.response } } }))
       });
    }

    // 4. Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: geminiContents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1200,
        }
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Gemini API Error: ${err}`)
    }

    // 5. Stream Response Governance and Piping
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const reader = response.body?.getReader()
    
    if (!reader) throw new Error("No response body from Gemini")

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = ""
        let lastText = ""

        const emitText = (currentText: string) => {
          const nextChunk = currentText.startsWith(lastText) ? currentText.slice(lastText.length) : currentText
          if (nextChunk) {
            let safeChunk = nextChunk.replace(/\[\[.*\]\]/g, "")
            if (safeChunk) controller.enqueue(encoder.encode(safeChunk))
          }
          lastText = currentText
        }

        const processEvent = (eventBlock: string) => {
          const dataLines = eventBlock.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith("data:")).map(l => l.slice(5).trim())
          for (const line of dataLines) {
            if (!line || line === "[DONE]") continue
            try {
              const parsed = JSON.parse(line)
              const parts = parsed.candidates?.[0]?.content?.parts
              if (Array.isArray(parts)) {
                const currentText = parts.map((p: any) => p.text ?? "").join("").trim()
                if (currentText) emitText(currentText)
              }
            } catch {
              // ignore malformed
            }
          }
        }

        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let separatorIndex = buffer.indexOf("\n\n")
            while (separatorIndex !== -1) {
              const eventBlock = buffer.slice(0, separatorIndex).trim()
              buffer = buffer.slice(separatorIndex + 2)
              if (eventBlock) processEvent(eventBlock)
              separatorIndex = buffer.indexOf("\n\n")
            }
          }
          const tail = buffer.trim()
          if (tail) processEvent(tail)
          controller.close()
        } catch (e) {
          controller.error(e)
        } finally {
          reader.releaseLock()
        }
      }
    })

    const payloadResponse = new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      }
    });

    // Send Project IDs as a custom header so the proxy can enforce security
    payloadResponse.headers.set('X-Edge-Project-Ids', projectIds.join(','));
    payloadResponse.headers.set('X-Edge-Role', role);

    return payloadResponse;

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
