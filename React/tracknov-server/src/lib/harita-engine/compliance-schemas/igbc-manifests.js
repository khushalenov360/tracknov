"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialExtractionSchema = exports.RainwaterExtractionSchema = exports.ChillerExtractionSchema = void 0;
// File: lib/harita-engine/compliance-schemas/igbc-manifests.ts
const zod_1 = require("zod");
exports.ChillerExtractionSchema = zod_1.z.object({
    equipment_tag: zod_1.z.string().describe("Identifier code of the chiller, e.g., CH-01"),
    cooling_medium: zod_1.z.enum(['Air-Cooled', 'Water-Cooled']).describe("Heat rejection format"),
    nominal_tr_capacity: zod_1.z.number().describe("Tons of refrigeration capacity recorded"),
    full_load_cop: zod_1.z.number().describe("Coefficient of performance measured at 100% capacity loading"),
    refrigerant_ashrae_id: zod_1.z.string().describe("ASHRAE standard number designating chemical components")
});
exports.RainwaterExtractionSchema = zod_1.z.object({
    total_catchment_area_sqm: zod_1.z.number().describe("Total plan area of surfaces routed to collection system"),
    impervious_roof_area_sqm: zod_1.z.number().describe("Area of structural roofs routed to harvesting units"),
    paved_area_sqm: zod_1.z.number().describe("Area of concrete, asphalt, or stone paving routed to harvesting units"),
    designed_pit_capacity_liters: zod_1.z.number().describe("Total combined volume capacity of detention or recharge tanks")
});
exports.MaterialExtractionSchema = zod_1.z.object({
    material_description: zod_1.z.string().describe("Generic identifier name of structural components or products"),
    invoice_total_cost_inr: zod_1.z.number().describe("Net financial value of materials billed on line items"),
    post_consumer_recycled_pct: zod_1.z.number().default(0).describe("Percentage of weight derived from post-consumer waste fields"),
    pre_consumer_recycled_pct: zod_1.z.number().default(0).describe("Percentage of weight derived from pre-consumer or industrial waste loops")
});
