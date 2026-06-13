// File: lib/harita-engine/compliance-schemas/igbc-manifests.ts
import { z } from 'zod';

export const ChillerExtractionSchema = z.object({
  equipment_tag: z.string().describe("Identifier code of the chiller, e.g., CH-01"),
  cooling_medium: z.enum(['Air-Cooled', 'Water-Cooled']).describe("Heat rejection format"),
  nominal_tr_capacity: z.number().describe("Tons of refrigeration capacity recorded"),
  full_load_cop: z.number().describe("Coefficient of performance measured at 100% capacity loading"),
  refrigerant_ashrae_id: z.string().describe("ASHRAE standard number designating chemical components")
});

export const RainwaterExtractionSchema = z.object({
  total_catchment_area_sqm: z.number().describe("Total plan area of surfaces routed to collection system"),
  impervious_roof_area_sqm: z.number().describe("Area of structural roofs routed to harvesting units"),
  paved_area_sqm: z.number().describe("Area of concrete, asphalt, or stone paving routed to harvesting units"),
  designed_pit_capacity_liters: z.number().describe("Total combined volume capacity of detention or recharge tanks")
});

export const MaterialExtractionSchema = z.object({
  material_description: z.string().describe("Generic identifier name of structural components or products"),
  invoice_total_cost_inr: z.number().describe("Net financial value of materials billed on line items"),
  post_consumer_recycled_pct: z.number().default(0).describe("Percentage of weight derived from post-consumer waste fields"),
  pre_consumer_recycled_pct: z.number().default(0).describe("Percentage of weight derived from pre-consumer or industrial waste loops")
});

export type ChillerExtraction = z.infer<typeof ChillerExtractionSchema>;
export type RainwaterExtraction = z.infer<typeof RainwaterExtractionSchema>;
export type MaterialExtraction = z.infer<typeof MaterialExtractionSchema>;
