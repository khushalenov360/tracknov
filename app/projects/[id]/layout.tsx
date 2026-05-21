import Link from "next/link";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, getProjectWorkspace } from "@/lib/data";
import { ProjectTabs } from "@/components/project/ProjectTabs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  
  const user = await getCurrentUser();
  let workspaceError: string | null = null;
  let workspace = null as Awaited<ReturnType<typeof getProjectWorkspace>>;
  
  try {
    workspace = await getProjectWorkspace(projectId);
  } catch (error: any) {
    workspaceError = error?.message ?? "Could not load project workspace.";
  }

  if (workspaceError) {
    return (
      <Shell title="Project Workspace" description="Workspace could not be loaded." role="consultant" notificationCount={0}>
        <div className="surface-card p-8">
          <p className="text-[14px] font-medium text-[var(--color-text-primary)]">Workspace load failed</p>
          <p className="mt-2 text-[12px] text-[var(--color-red)]">{workspaceError}</p>
          <div className="mt-4">
            <Link href="/projects">
              <Button variant="secondary">Back to Projects</Button>
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (!workspace) {
    return (
      <Shell title="Project Not Found" description="The requested project could not be found." role="consultant" notificationCount={0}>
        <div className="surface-card p-8 text-center">
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            Project not found or you do not have access.
          </p>
          <Link href="/dashboard">
            <Button variant="secondary" className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title={
        <span className="flex items-center gap-3">
          {workspace.project.name}
          {["project_admin", "super_admin", "super_user", "L3", "L5"].includes(workspace.userRole) && (
            <Badge
              className={`text-xs px-1.5 py-0 h-5 ${
                workspace.project.health_status === "HEALTHY"
                  ? "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]"
                  : workspace.project.health_status === "AT_RISK"
                    ? "border border-[var(--color-red-light)] bg-[var(--color-red-light)] text-[var(--color-red)]"
                    : "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
              }`}
            >
              {workspace.project.health_status}
            </Badge>
          )}
        </span>
      }
      aiTitle={workspace.project.name}
      description={`${workspace.project.certification_type} / Target ${workspace.project.target_rating}`}
      role={workspace.userRole}
      notificationCount={workspace.notifications.filter((item) => !item.read_at).length}
    >
      <ProjectTabs projectId={projectId} />
      {children}
    </Shell>
  );
}
