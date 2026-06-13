"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadSessionRecoveryManager = void 0;
class UploadSessionRecoveryManager {
    /**
     * Retrieves all active resumable upload sessions from client storage
     */
    static getSessions() {
        if (typeof window === "undefined")
            return {};
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        }
        catch (_a) {
            return {};
        }
    }
    /**
     * Saves a resumable upload session state
     */
    static saveSession(session) {
        if (typeof window === "undefined")
            return;
        try {
            const sessions = this.getSessions();
            sessions[session.sessionId] = Object.assign(Object.assign({}, session), { lastUpdated: Date.now() });
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
        }
        catch (e) {
            console.warn("Could not save upload session progress", e);
        }
    }
    /**
     * Deletes a session once it has fully uploaded
     */
    static clearSession(sessionId) {
        if (typeof window === "undefined")
            return;
        try {
            const sessions = this.getSessions();
            delete sessions[sessionId];
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
        }
        catch (e) {
            console.warn("Could not clean upload session", e);
        }
    }
    /**
     * Finds an existing session by name and size to prevent duplicate re-uploads
     */
    static findSession(fileName, fileSize) {
        const sessions = this.getSessions();
        const match = Object.values(sessions).find((s) => s.fileName === fileName && s.fileSize === fileSize);
        return match || null;
    }
}
exports.UploadSessionRecoveryManager = UploadSessionRecoveryManager;
UploadSessionRecoveryManager.STORAGE_KEY = "tracknov_resumable_sessions";
