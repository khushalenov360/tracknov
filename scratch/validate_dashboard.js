
import { getProjectWorkspace } from './lib/data';

async function validateDashboard() {
  const projectId = 'b73d7310-df16-4d26-b6c8-61bebb197410';
  console.log(`Validating dashboard data for project: ${projectId}`);
  
  try {
    const workspace = await getProjectWorkspace(projectId);
    if (!workspace) {
      console.error("CRITICAL: Workspace is null. User has no access or project missing.");
      return;
    }
    
    if (!workspace.project) {
      console.error("CRITICAL: workspace.project is null. This will cause a dashboard crash.");
    } else {
      console.log(`SUCCESS: Dashboard data loaded. Project Name: ${workspace.project.name}`);
    }
  } catch (error) {
    console.error("CRITICAL: getProjectWorkspace crashed with error:", error.message);
  }
}

validateDashboard();
