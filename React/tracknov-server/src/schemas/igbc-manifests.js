"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialExtractionSchema = exports.RainwaterExtractionSchema = exports.ChillerExtractionSchema = void 0;
const zod_1 = require("zod");
exports.ChillerExtractionSchema = zod_1.z.object({
    equipment_tag: zod_1.z.string(),
    cooling_medium: zod_1.z.enum(['Air-Cooled', 'Water-Cooled']),
    nominal_tr_capacity: zod_1.z.number(),
    full_load_cop: zod_1.z.number(),
    refrigerant_ashrae_id: zod_1.z.string()
});
exports.RainwaterExtractionSchema = zod_1.z.object({
    total_catchment_area_sqm: zod_1.z.number(),
    impervious_roof_area_sqm: zod_1.z.number(),
    paved_area_sqm: zod_1.z.number(),
    designed_pit_capacity_liters: zod_1.z.number()
});
exports.MaterialExtractionSchema = zod_1.z.object({
    material_description: zod_1.z.string(),
    invoice_total_cost_inr: zod_1.z.number(),
    post_consumer_recycled_pct: zod_1.z.number(),
    pre_consumer_recycled_pct: zod_1.z.number()
});
