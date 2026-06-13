import { GraphCache } from "./graph-cache";
import { GraphRepository } from "./repositories/graph-repository";

export class GraphInvalidator {
  public static invalidateProject(projectId: string) {
    GraphCache.invalidate(projectId);
  }

  public static invalidateCredit(projectId: string, creditId: string) {
    GraphCache.invalidate(projectId);
    GraphRepository.deleteNode(projectId, creditId);
  }

  public static invalidateDocument(projectId: string, documentId: string) {
    GraphCache.invalidate(projectId);
    GraphRepository.deleteNode(projectId, documentId);
  }
}
