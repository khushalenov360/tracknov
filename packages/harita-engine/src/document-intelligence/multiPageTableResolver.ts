/**
 * Tracknov Document Intelligence - Multi-Page Table Resolver
 * Identifies and stitches together single tables that split across physical page breaks.
 */

import { ExtractedTable } from "../types";

export class MultiPageTableResolver {
  /**
   * Evaluates sequential tables and stitches them if they share structure, columns, and type context.
   */
  public static resolve(tables: ExtractedTable[]): ExtractedTable[] {
    if (tables.length <= 1) return tables;

    const resolved: ExtractedTable[] = [];
    let currentTable = { ...tables[0] };

    for (let i = 1; i < tables.length; i++) {
      const nextTable = tables[i];

      // Stitches tables if they:
      // 1. Have identical columns counts
      // 2. Share the same semantic type
      // 3. Or have high similarity in header names or follow immediately sequentially
      const colMismatch = currentTable.headers.length !== nextTable.headers.length;
      const typeMismatch = currentTable.semanticType !== nextTable.semanticType;

      if (colMismatch || typeMismatch) {
        resolved.push(currentTable);
        currentTable = { ...nextTable };
      } else {
        // Stitch tables together!
        currentTable.rows = [...currentTable.rows, ...nextTable.rows];
        currentTable.pageReferences = [
          ...currentTable.pageReferences,
          ...nextTable.pageReferences,
        ];
        
        // Average the confidence score
        currentTable.confidenceScore = (currentTable.confidenceScore + nextTable.confidenceScore) / 2;
      }
    }

    resolved.push(currentTable);
    return resolved;
  }
}
