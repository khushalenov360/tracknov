import { NavigationRail } from "./navigation-rail";
import { ResizableWorkspace } from "./resizable-workspace";

export function Shell({
  title,
  description,
  email,
  notificationCount,
  children,
  harita,
  workspaceLabel,
}: {
  title: React.ReactNode;
  description: string;
  email?: string;
  notificationCount?: number;
  children: React.ReactNode;
  harita: React.ReactNode;
  workspaceLabel?: string;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] font-sans antialiased overflow-hidden">
      <NavigationRail />
      <ResizableWorkspace 
        harita={harita}
        title={title}
        description={description}
        notificationCount={notificationCount}
        email={email}
        workspaceLabel={workspaceLabel}
      >
        {children}
      </ResizableWorkspace>
    </div>
  );
}
