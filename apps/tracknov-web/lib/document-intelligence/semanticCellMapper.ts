/**
 * Tracknov Document Intelligence - Semantic Cell Mapper
 * Extracts high-level engineering metrics and validates cell values against sustainability bounds.
 */

export interface SemanticCellMapping {
  cellValue: string;
  mappedConcept: "CAPACITY" | "EFFICIENCY" | "POWER" | "FLOW" | "UNRECOGNIZED";
  numericValue?: number;
  unit?: string;
  isValid: boolean;
}

export class SemanticCellMapper {
  /**
   * Translates a cell value into its clean physical meaning and handles range bounds checking.
   */
  public static mapCell(value: string, header: string): SemanticCellMapping {
    const rawClean = value.trim();
    
    // Extract numerical segment
    const numMatch = rawClean.match(/([0-9]+(?:\.[0-9]+)?)/);
    const numericValue = numMatch ? parseFloat(numMatch[1]) : undefined;

    // Detect unit
    const unitMatch = rawClean.match(/\b(cfm|kw|tr|cop|w\/sq\.ft|lps|gpm|%)\b/i);
    const unit = unitMatch ? unitMatch[1] : undefined;

    let mappedConcept: "CAPACITY" | "EFFICIENCY" | "POWER" | "FLOW" | "UNRECOGNIZED" = "UNRECOGNIZED";
    const headerLower = header.toLowerCase();

    if (/capacity|cooling|heating|tr\b|tonnage/i.test(headerLower)) {
      mappedConcept = "CAPACITY";
    } else if (/efficiency|cop\b|eer|seer|kw\/tr/i.test(headerLower)) {
      mappedConcept = "EFFICIENCY";
    } else if (/power|kw\b|watt|demand|electricity/i.test(headerLower)) {
      mappedConcept = "POWER";
    } else if (/flow|cfm|gpm|lps|air/i.test(headerLower)) {
      mappedConcept = "FLOW";
    }

    // Determine validity bounds
    let isValid = true;
    if (numericValue !== undefined) {
      if (mappedConcept === "EFFICIENCY" && unit?.toLowerCase() === "cop" && (numericValue < 2.0 || numericValue > 10.0)) {
        isValid = false; // COPs for standard sustainable buildings typically fall between 2.0 and 10.0
      }
      if (mappedConcept === "POWER" && numericValue < 0.0) {
        isValid = false; // Power cannot be negative
      }
    }

    return {
      cellValue: rawClean,
      mappedConcept,
      numericValue,
      unit,
      isValid,
    };
  }
}
