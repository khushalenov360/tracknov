export interface ResumableSession {
  sessionId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  lastUpdated: number;
}

export class UploadSessionRecoveryManager {
  private static STORAGE_KEY = "tracknov_resumable_sessions";

  /**
   * Retrieves all active resumable upload sessions from client storage
   */
  static getSessions(): Record<string, ResumableSession> {
    if (typeof window === "undefined") return {};
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  /**
   * Saves a resumable upload session state
   */
  static saveSession(session: ResumableSession): void {
    if (typeof window === "undefined") return;
    try {
      const sessions = this.getSessions();
      sessions[session.sessionId] = {
        ...session,
        lastUpdated: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn("Could not save upload session progress", e);
    }
  }

  /**
   * Deletes a session once it has fully uploaded
   */
  static clearSession(sessionId: string): void {
    if (typeof window === "undefined") return;
    try {
      const sessions = this.getSessions();
      delete sessions[sessionId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn("Could not clean upload session", e);
    }
  }

  /**
   * Finds an existing session by name and size to prevent duplicate re-uploads
   */
  static findSession(fileName: string, fileSize: number): ResumableSession | null {
    const sessions = this.getSessions();
    const match = Object.values(sessions).find(
      (s) => s.fileName === fileName && s.fileSize === fileSize
    );
    return match || null;
  }
}
