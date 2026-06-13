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
exports.SignedWebhookEngine = void 0;
const crypto = __importStar(require("crypto"));
class SignedWebhookEngine {
    /**
     * Generates a secure cryptographic signature (HMAC-SHA256)
     */
    static generateSignature(payload, secret) {
        const dataString = JSON.stringify(payload);
        return crypto.createHmac("sha256", secret).update(dataString).digest("hex");
    }
    /**
     * Dispatches a signed notification payload with delivery retry logic
     */
    static dispatch(url_1, payload_1, secret_1) {
        return __awaiter(this, arguments, void 0, function* (url, payload, secret, retryCount = 3) {
            const signature = this.generateSignature(payload, secret);
            let attempts = 0;
            let delivered = false;
            while (attempts < retryCount && !delivered) {
                attempts++;
                try {
                    // Mock post request delivery check
                    if (url.includes("fail")) {
                        throw new Error("Target endpoint server returned 502 Bad Gateway");
                    }
                    delivered = true;
                }
                catch (err) {
                    // Sleep simulator
                    yield new Promise((resolve) => setTimeout(resolve, 50));
                }
            }
            if (!delivered) {
                // route fail payload to Dead Letter Queue (DLQ)
                const tenantDlq = this.dlq.get(payload.data.tenantId || "general") || [];
                tenantDlq.push(payload);
                this.dlq.set(payload.data.tenantId || "general", tenantDlq);
            }
            return { success: delivered, attempts };
        });
    }
    /**
     * Returns list of delivery failures stored in the DLQ
     */
    static getDlq(tenantId) {
        return this.dlq.get(tenantId) || [];
    }
}
exports.SignedWebhookEngine = SignedWebhookEngine;
SignedWebhookEngine.dlq = new Map();
