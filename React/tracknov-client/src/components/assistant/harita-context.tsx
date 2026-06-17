import { createContext, useContext, useMemo } from "react";
import { GlobalHarita } from "./global-harita";

type HaritaWorkspaceContextValue = {
  projectId?: string;
  title?: string;
  description?: string;
};

const HaritaWorkspaceContext = createContext<HaritaWorkspaceContextValue | null>(null);

export function HaritaContextProvider({
  value,
  children,
}: {
  value: HaritaWorkspaceContextValue;
  children: React.ReactNode;
}) {
  const memoizedValue = useMemo(
    () => value,
    [value.projectId, value.title, value.description],
  );

  return (
    <HaritaWorkspaceContext.Provider value={memoizedValue}>
      {children}
    </HaritaWorkspaceContext.Provider>
  );
}

export function useHaritaWorkspace() {
  const context = useContext(HaritaWorkspaceContext);
  if (!context) {
    throw new Error("useHaritaWorkspace must be used within HaritaContextProvider.");
  }
  return context;
}

export function PersistentHaritaSidebar() {
  const workspace = useHaritaWorkspace();
  return (
    <GlobalHarita
      projectId={workspace.projectId}
      title={workspace.title}
      description={workspace.description}
    />
  );
}
