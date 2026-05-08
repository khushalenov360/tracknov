import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { documentService } from "@/lib/services/document-service";
import { projectService } from "@/lib/services/project-service";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const throttled = checkRateLimit(request, {
    key: "api:assistant:project-upload",
    limit: 20,
    windowMs: 60_000,
  });
  if (throttled) return throttled;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Session expired." }, { status: 401 });
    }

    const formData = await request.formData();
    const projectId = String(formData.get("project_id") ?? "").trim();
    const file = formData.get("file");
    const title = String(formData.get("title") ?? "").trim();
    const mode = String(formData.get("mode") ?? "auto").trim().toLowerCase();
    const creditId = String(formData.get("credit_id") ?? "").trim();
    const docCategory = String(formData.get("doc_category") ?? "").trim();

    if (!projectId || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Project and file are required." }, { status: 400 });
    }

    const lower = file.name.toLowerCase();

    if (mode === "document") {
      if (!creditId || !docCategory) {
        return NextResponse.json(
          { ok: false, error: "Select a target credit and document type before upload." },
          { status: 400 },
        );
      }
      const result = await documentService.uploadDocument(user, {
        projectId,
        creditId,
        projectCreditId: creditId,
        docCategory,
        file,
      });
      return NextResponse.json({ ok: true, mode: "document", documentId: result.id });
    }

    if (mode === "guidebook") {
      await projectService.uploadProjectGuidebook(user, {
        projectId,
        file,
        title: title || undefined,
      });
      return NextResponse.json({ ok: true, mode: "guidebook" });
    }

    if (mode === "tracker") {
      await projectService.importTrackerBaseline(user, {
        projectId,
        file,
      });
      return NextResponse.json({ ok: true, mode: "tracker" });
    }

    if (lower.endsWith(".pdf")) {
      await projectService.uploadProjectGuidebook(user, {
        projectId,
        file,
        title: title || undefined,
      });
      return NextResponse.json({ ok: true, mode: "guidebook" });
    }

    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      await projectService.importTrackerBaseline(user, {
        projectId,
        file,
      });
      return NextResponse.json({ ok: true, mode: "tracker" });
    }

    return NextResponse.json(
      { ok: false, error: "Unsupported file type. Use PDF for guidebook, XLS/XLSX for tracker baseline." },
      { status: 400 },
    );
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Upload failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Session expired." }, { status: 401 });
    }

    const url = new URL(request.url);
    const projectId = String(url.searchParams.get("project_id") ?? "").trim();
    if (!projectId) {
      return NextResponse.json({ ok: false, error: "Missing project id." }, { status: 400 });
    }

    const workspace = await (await import("@/lib/data")).getProjectWorkspace(projectId);
    if (!workspace) {
      return NextResponse.json({ ok: false, error: "Project workspace not found." }, { status: 404 });
    }

    const credits = (workspace.credits ?? []).map((credit: any) => ({
      id: credit.id,
      code: credit.credit_code,
      name: credit.credit_name,
    }));

    return NextResponse.json({ ok: true, credits });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Failed to fetch credits." }, { status: 500 });
  }
}
