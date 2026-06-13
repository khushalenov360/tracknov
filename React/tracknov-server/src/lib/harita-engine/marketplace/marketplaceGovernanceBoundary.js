"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceGovernanceBoundary = void 0;
class MarketplaceGovernanceBoundary {
    /**
     * Prevents plugins from modifying the core audit log or bypassing replay contracts
     */
    static assertGovernanceIntact(mutationRequested) {
        if (mutationRequested) {
            throw new Error("[GOVERNANCE BREACH] Marketplace plugins are strictly advisory and are barred from editing system state!");
        }
    }
}
exports.MarketplaceGovernanceBoundary = MarketplaceGovernanceBoundary;
