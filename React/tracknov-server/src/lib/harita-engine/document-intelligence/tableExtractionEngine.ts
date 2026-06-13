// File: lib/harita-engine/document-intelligence/tableExtractionEngine.ts

export interface CoordinateBoundedCell {
  text: string;
  xStart: number;
  xEnd: number;
  yRow: number;
}

export interface NormalizedTableMatrix {
  tableName: string;
  headers: string[];
  rows: string[][];
}

export class TableExtractionEngine {
  /**
   * Transforms raw coordinate cells into a structurally aligned Markdown matrix.
   * Eliminates text fragmentation by enforcing hard boundary groupings per cell window.
   */
  public static cellsToMarkdownGrid(cells: CoordinateBoundedCell[]): string {
    if (cells.length === 0) return "";

    // Group cells by their row coordinates, accounting for slight baseline offsets (tolerance threshold of 3 units)
    const rowTolerance = 3;
    const sortedCells = [...cells].sort((a, b) => a.yRow - b.yRow || a.xStart - b.xStart);
    
    const distinctRows: CoordinateBoundedCell[][] = [];
    let currentGroup: CoordinateBoundedCell[] = [];
    let lastY = sortedCells[0].yRow;

    for (const cell of sortedCells) {
      if (Math.abs(cell.yRow - lastY) > rowTolerance) {
        distinctRows.push(currentGroup.sort((a, b) => a.xStart - b.xStart));
        currentGroup = [cell];
        lastY = cell.yRow;
      } else {
        currentGroup.push(cell);
      }
    }
    if (currentGroup.length > 0) {
      distinctRows.push(currentGroup.sort((a, b) => a.xStart - b.xStart));
    }

    // Map rows into clean Markdown pipes
    const markdownLines: string[] = [];
    for (let i = 0; i < distinctRows.length; i++) {
      const rowStrings = distinctRows[i].map(c => c.text.replace(/\|/g, "\\|").trim());
      markdownLines.push(`| ${rowStrings.join(" | ")} |`);
      
      // Inject standard Markdown alignment break after the first header index row
      if (i === 0) {
        const structuralDividers = distinctRows[i].map(() => "---");
        markdownLines.push(`| ${structuralDividers.join(" | ")} |`);
      }
    }

    return markdownLines.join("\n");
  }
}
