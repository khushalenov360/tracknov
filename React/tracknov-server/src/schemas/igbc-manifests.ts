import { z } from 'zod';

export const ChillerExtractionSchema = z.object({
  equipment_tag: z.string(),
  cooling_medium: z.enum(['Air-Cooled', 'Water-Cooled']),
  nominal_tr_capacity: z.number(),
  full_load_cop: z.number(),
  refrigerant_ashrae_id: z.string()
});

export type ChillerExtraction = z.infer<typeof ChillerExtractionSchema>;

export const RainwaterExtractionSchema = z.object({
  total_catchment_area_sqm: z.number(),
  impervious_roof_area_sqm: z.number(),
  paved_area_sqm: z.number(),
  designed_pit_capacity_liters: z.number()
});

export type RainwaterExtraction = z.infer<typeof RainwaterExtractionSchema>;

export const MaterialExtractionSchema = z.object({
  material_description: z.string(),
  invoice_total_cost_inr: z.number(),
  post_consumer_recycled_pct: z.number(),
  pre_consumer_recycled_pct: z.number()
});

export type MaterialExtraction = z.infer<typeof MaterialExtractionSchema>;
