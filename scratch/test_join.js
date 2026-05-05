
import { projectService } from './lib/services/project-service';
import { getCurrentUser } from './lib/data';

async function testJoin() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log("No user found in session.");
      return;
    }
    console.log(`Testing join for user: ${user.email} with code: TN-BHAV-319`);
    const project = await projectService.joinProjectByCode(user, "TN-BHAV-319");
    console.log("Success! Joined project:", project.name);
  } catch (error) {
    console.error("Join failed with error:", error.message);
  }
}

testJoin();
