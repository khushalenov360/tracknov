"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiReplayValidator = void 0;
class ApiReplayValidator {
    /**
     * Asserts that a unique transaction nonce has not been processed previously
     */
    static validateNonce(nonce) {
        if (this.processedNonces.has(nonce)) {
            return false; // Suspected replay mutation attempt
        }
        this.processedNonces.add(nonce);
        return true;
    }
    static clearNonces() {
        this.processedNonces.clear();
    }
}
exports.ApiReplayValidator = ApiReplayValidator;
ApiReplayValidator.processedNonces = new Set();
