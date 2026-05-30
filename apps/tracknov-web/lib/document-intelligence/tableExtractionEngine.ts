/**
 * Tracknov Document Intelligence - Table Extraction Engine
 * Parses tabular content from text, capturing headers, cells, units, and structural alignments.
 */

import { ExtractedTable, SemanticType } from "../types";

export class TableExtractionEngine {
  /**
   * Identifies and extracts table grids from text using layout alignment and delimiter heuristics.
   */
  public static extractTables(text: string): ExtractedTable[] {
    if (!text) return [];

    const tables: ExtractedTable[] = [];
    const lines = text.split("\n");
    let currentRows: string[][] = [];
    let inTable = false;
    let headerLine: string[] = [];
    let startPage = 1;

    let pageNum = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes("[PAGE_BREAK]")) {
        pageNum++;
        continue;
      }

      // Check for Markdown table or multi-column spacing indicators
      const isMarkdownRow = (line.startsWith("|") && line.endsWith("|")) ||
                            (line.startsWith("I ") && line.endsWith(" I")) ||
                            (line.startsWith("I-") && line.endsWith("-I")) ||
                            (line.startsWith("I") && line.endsWith("I") && line.split("I").length > 3);
      const isMultiColumnRow = line.split(/[ \t]{2,}/).length > 2;

      if (isMarkdownRow || isMultiColumnRow) {
        if (!inTable) {
          inTable = true;
          startPage = pageNum;
          currentRows = [];
          
          // Split the header row
          headerLine = isMarkdownRow 
            ? line.split(/[|I]/).map(s => s.trim()).filter(Boolean)
            : line.split(/[ \t]{2,}/).map(s => s.trim());
        } else {
          // Parse data row
          const columns = isMarkdownRow
            ? line.split(/[|I]/).map(s => s.trim()).filter(Boolean)
            : line.split(/[ \t]{2,}/).map(s => s.trim());

          // Skip separators like |---|---| or I---I---I
          const isSeparator = columns.every(col => /^-+$/.test(col));
          if (!isSeparator) {
            currentRows.push(columns);
          }
        }
      } else {
        if (inTable) {
          // Table concluded
          if (currentRows.length > 0) {
            tables.push(this.compileTable(headerLine, currentRows, startPage));
          }
          inTable = false;
        }
      }
    }

    // Capture trailing table if document ends on a table row
    if (inTable && currentRows.length > 0) {
      tables.push(this.compileTable(headerLine, currentRows, startPage));
    }

    return tables;
  }

  private static compileTable(headers: string[], rows: string[][], page: number): ExtractedTable {
    const tableId = `tbl-${Math.random().toString(36).substr(2, 9)}`;
    
    // Categorize table using semantic keyword matching
    const headerStr = headers.join(" ").toLowerCase();
    const rowStr = rows.map(r => r.join(" ")).join(" ").toLowerCase();
    const combined = `${headerStr} ${rowStr}`;

    let semanticType: SemanticType = "UNKNOWN";
    if (/hvac|chiller|cfm|cop|compressor|fan|cooling/i.test(combined)) {
      semanticType = "HVAC";
    } else if (/light|lux|lamp|fixture|ballast|lumens/i.test(combined)) {
      semanticType = "LIGHTING";
    } else if (/concrete|steel|wood|cement|recycle|voc/i.test(combined)) {
      semanticType = "MATERIAL";
    } else if (/kwh|energy|power|solar|photovoltaic|demand/i.test(combined)) {
      semanticType = "ENERGY";
    }

    return {
      tableId,
      headers,
      rows,
      pageReferences: [page],
      confidenceScore: 0.95,
      semanticType,
    };
  }
}
