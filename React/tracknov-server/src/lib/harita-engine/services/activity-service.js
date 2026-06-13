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
exports.logDocumentActivity = logDocumentActivity;
exports.logSystemActivity = logSystemActivity;
function logDocumentActivity(writer_1, _a) {
    return __awaiter(this, arguments, void 0, function* (writer, { documentId, projectId, action, actorId, actorRole, summary, details = {}, }) {
        yield writer.from("document_activity_logs").insert({
            document_id: documentId !== null && documentId !== void 0 ? documentId : null,
            project_id: projectId,
            action,
            actor_id: actorId !== null && actorId !== void 0 ? actorId : null,
            actor_role: actorRole !== null && actorRole !== void 0 ? actorRole : null,
            summary,
            details,
        });
    });
}
function logSystemActivity(writer_1, _a) {
    return __awaiter(this, arguments, void 0, function* (writer, { projectId, entityType, entityId, action, actorId, actorRole, summary, details = {}, }) {
        yield writer.from("system_activity_logs").insert({
            project_id: projectId !== null && projectId !== void 0 ? projectId : null,
            entity_type: entityType,
            entity_id: entityId !== null && entityId !== void 0 ? entityId : null,
            action,
            actor_id: actorId !== null && actorId !== void 0 ? actorId : null,
            actor_role: actorRole !== null && actorRole !== void 0 ? actorRole : null,
            summary,
            details,
        });
    });
}
