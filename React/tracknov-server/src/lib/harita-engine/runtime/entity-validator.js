"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityValidator = exports.RoutingViolation = void 0;
class RoutingViolation extends Error {
    constructor(message) {
        super(message);
        this.name = "RoutingViolation";
    }
}
exports.RoutingViolation = RoutingViolation;
class EntityValidator {
    static validateCreditCode(code) {
        if (!code)
            return;
        // Check if the code is in the valid set (case-insensitive for practical purposes)
        const upperCode = code.toUpperCase();
        if (!this.validCreditCodes.has(upperCode)) {
            throw new RoutingViolation(`Invalid credit code: ${code}. Unable to assess readiness.`);
        }
    }
    static validateEntity(entity) {
        if (entity && entity.creditCode) {
            this.validateCreditCode(entity.creditCode);
        }
    }
}
exports.EntityValidator = EntityValidator;
EntityValidator.validCreditCodes = new Set([
    "EDA C1", "EDA C2", "EDA C3",
    "WC C1", "WC C2", "WC C3",
    "EA C1", "EA C2", "EA C3",
    "IE C1", "IE C2", "IE C3"
]);
