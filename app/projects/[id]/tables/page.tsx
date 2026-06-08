import { Metadata } from "next";
import { getCurrentUser, getProjectWorkspace } from "@/lib/data";
import { fetchAndParseDataTable } from "@/lib/actions/table-actions";
import { DataTableView } from "@/components/project/DataTableView";

export const metadata: Metadata = {
  title: "Data Tables | Tracknov",
};

export default async function ProjectTablesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const user = await getCurrentUser();
  const workspace = await getProjectWorkspace(projectId);

  if (!user || !workspace) {
    return null; // Layout handles auth/404
  }

  const { success, data, error } = await fetchAndParseDataTable(projectId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
          Data Tables Template
        </h2>
        <p className="text-[14px] text-[var(--color-text-secondary)]">
          This is the extracted data table format. Client data has been stripped, preserving headers and calculation formulas.
        </p>
      </div>

      {!success || !data ? (
        <div className="p-8 text-center border border-dashed border-[var(--color-border)] rounded-md bg-[var(--color-surface-2)]">
          <p className="text-[var(--color-text-secondary)]">
            {error || "No Data Table uploaded for this project."}
          </p>
        </div>
      ) : (
        <DataTableView sheets={data} workspace={workspace} user={user} />
      )}
    </div>
  );
}
