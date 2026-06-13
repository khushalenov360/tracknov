"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.eventBus = void 0;
exports.initEventBus = initEventBus;
const admin_1 = require("@/lib/supabase/admin");
class EventBus {
    constructor() {
        this.handlers = [];
        this.initialized = false;
        this.MAX_RETRIES = 3;
    }
    subscribe(handler) {
        this.handlers.push(handler);
    }
    emit(event) {
        return __awaiter(this, void 0, void 0, function* () {
            // We only initialize once
            if (!this.initialized) {
                yield initEventBus();
            }
            // Persist event for audit trail (Epic C2)
            yield this.persistEvent(event);
            // Execute all handlers concurrently with individual retry logic
            const results = yield Promise.allSettled(this.handlers.map(handler => this.executeWithRetry(handler, event)));
            results.forEach((result, index) => {
                if (result.status === "rejected") {
                    console.error(`[EventBus] Permanent failure in handler ${index} for event ${event.type}:`, result.reason);
                    this.logToDeadLetter(event, result.reason);
                }
            });
        });
    }
    persistEvent(event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = (0, admin_1.createAdminClient)();
                const entityTypeMap = {
                    DOCUMENT_UPLOADED: "document",
                    DOCUMENT_METADATA_UPDATED: "document",
                    DOCUMENT_DELETED: "document",
                    REVIEW_COMPLETED: "document",
                    DOCUMENT_REJECTED: "document",
                    TOKEN_DEDUCTED: "billing",
                    TOKEN_CREDITED: "billing",
                    PROJECT_CREATED: "project",
                };
                const payload = event.payload;
                yield admin.from("system_activity_logs").insert({
                    project_id: payload.projectId,
                    entity_type: entityTypeMap[event.type] || "project",
                    entity_id: payload.documentId || payload.projectId,
                    action: event.type.toLowerCase(),
                    actor_id: payload.userId,
                    summary: `EventBus: ${event.type}`,
                    details: event.payload,
                });
            }
            catch (err) {
                console.error("[EventBus] Failed to persist event:", err);
            }
        });
    }
    executeWithRetry(handler_1, event_1) {
        return __awaiter(this, arguments, void 0, function* (handler, event, attempt = 1) {
            try {
                yield handler(event);
            }
            catch (error) {
                if (attempt < this.MAX_RETRIES) {
                    const delay = Math.pow(2, attempt) * 100; // Exponential backoff
                    console.warn(`[EventBus] Handler failed (attempt ${attempt}/${this.MAX_RETRIES}). Retrying in ${delay}ms...`);
                    yield new Promise(resolve => setTimeout(resolve, delay));
                    return this.executeWithRetry(handler, event, attempt + 1);
                }
                throw error; // Max retries exhausted
            }
        });
    }
    logToDeadLetter(event, reason) {
        console.error(`[DLQ] EVENT_FAILURE: ${event.type} | REASON: ${JSON.stringify(reason)} | PAYLOAD: ${JSON.stringify(event.payload)}`);
    }
    setInitialized() {
        this.initialized = true;
    }
    isInitialized() {
        return this.initialized;
    }
}
exports.eventBus = new EventBus();
// Registry for consumers to avoid circular dependencies
function initEventBus() {
    return __awaiter(this, void 0, void 0, function* () {
        if (exports.eventBus.isInitialized())
            return;
        try {
            // We use a safe check to see if we are in a browser or test environment that might fail dynamic imports
            // In Next.js this works fine, but in some test runners it can be tricky
            const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
            if (!isTest) {
                const { registerBillingConsumers } = yield Promise.resolve().then(() => __importStar(require("./consumers/billing-consumer")));
                const { registerNotificationConsumers } = yield Promise.resolve().then(() => __importStar(require("./consumers/notification-consumer")));
                const { registerAIValidatorConsumers } = yield Promise.resolve().then(() => __importStar(require("./consumers/ai-validator-consumer")));
                registerBillingConsumers();
                registerNotificationConsumers();
                registerAIValidatorConsumers();
            }
        }
        catch (err) {
            console.warn("[EventBus] Dynamic initialization of consumers skipped or failed:", err);
        }
        exports.eventBus.setInitialized();
    });
}
