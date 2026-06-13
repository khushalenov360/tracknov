"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enovaitClient = exports.EnovAITClient = void 0;
class EnovAITClient {
    constructor() {
        this.baseUrl = process.env.ENOVAIT_API_URL || "https://api.enovait.local";
    }
    fetchWithContext(endpoint, context, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(`${this.baseUrl}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(Object.assign({ context }, body)),
            });
            if (!response.ok) {
                throw new Error(`EnovAIT API Error: ${response.statusText}`);
            }
            return response.json();
        });
    }
    chat(context, message) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetchWithContext("/chat", context, { message });
        });
    }
    summarizeDocument(context, documentId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetchWithContext("/document-summary", context, { documentId });
        });
    }
    assessReadiness(context, creditId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetchWithContext("/readiness-assessment", context, { creditId });
        });
    }
    draftClarification(context, documentId, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetchWithContext("/clarification-draft", context, { documentId, parameters });
        });
    }
    getRecommendations(context, creditId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetchWithContext("/recommendations", context, { creditId });
        });
    }
}
exports.EnovAITClient = EnovAITClient;
exports.enovaitClient = new EnovAITClient();
