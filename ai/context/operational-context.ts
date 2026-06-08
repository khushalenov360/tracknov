import { getUserActionQueue, getUserBlockerQueue, getUserReviewQueue } from "@/lib/data";

export async function getOperationalContext(userId: string) {
  void userId;
  const [actionQueue, reviewQueue, blockerQueue] = await Promise.all([
    getUserActionQueue(),
    getUserReviewQueue(),
    getUserBlockerQueue(),
  ]);
  return {
    actionQueue,
    reviewQueue,
    blockerQueue,
  };
}
