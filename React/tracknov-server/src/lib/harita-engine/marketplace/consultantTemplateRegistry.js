"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultantTemplateRegistry = void 0;
class ConsultantTemplateRegistry {
    static getTemplates() {
        return this.registeredTemplates;
    }
    static cloneTemplate(templateId, targetTenantId) {
        const found = this.registeredTemplates.find((t) => t.templateId === templateId);
        if (!found)
            throw new Error("Template not found in registry");
        return Object.assign(Object.assign({}, found), { templateId: `CLONE-${templateId}-${Math.floor(Math.random() * 900 + 100)}`, creatorTenantId: targetTenantId });
    }
}
exports.ConsultantTemplateRegistry = ConsultantTemplateRegistry;
ConsultantTemplateRegistry.registeredTemplates = [
    {
        templateId: "WFLOW-TEMP-01",
        title: "Commercial High-Rise IGBC Baseline",
        creatorTenantId: "tenant-alpha",
        targetRating: "IGBC Commercial",
        isActive: true
    }
];
