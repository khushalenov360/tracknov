"use server";

import { createClient } from "@/lib/supabase/server";
import ExcelJS from "exceljs";

export type ParsedCell = {
  value: any;
  formula?: string;
  isHeader?: boolean;
  isClientData?: boolean;
  style?: any;
};

export type ParsedRow = {
  cells: ParsedCell[];
  type: 'title' | 'header' | 'data' | 'empty';
};

export type ParsedSheet = {
  name: string;
  rows: ParsedRow[];
};

export async function fetchAndParseDataTable(projectId: string): Promise<{ success: boolean; data?: ParsedSheet[]; error?: string }> {
  try {
    const supabase = await createClient();

    // Find the latest data table file path
    const { data: dataTable } = await supabase
      .from("project_data_tables")
      .select("file_path")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!dataTable?.file_path) {
      return { success: false, error: "No Data Table uploaded for this project." };
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("project-documents")
      .download(dataTable.file_path);

    if (downloadError || !fileData) {
      throw new Error("Failed to download Data Table file");
    }

    // Read the array buffer into exceljs
    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheets: ParsedSheet[] = [];

    workbook.eachSheet((worksheet, sheetId) => {
      const parsedRows: ParsedRow[] = [];
      let firstDataRowIndex = -1;

      // Pass 1: Parse all cells and find the first data row
      worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const parsedCells: ParsedCell[] = [];
        let hasNumber = false;
        let hasFormula = false;
        let isEmpty = true;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          let value = cell.value;
          let formula: string | undefined = undefined;

          if (cell.type === ExcelJS.ValueType.Formula || (value && typeof value === 'object' && 'formula' in value)) {
            formula = cell.formula || (value as any).formula;
            value = cell.result !== undefined ? cell.result : (value as any).result;
            hasFormula = true;
            isEmpty = false;
          } else if (cell.type === ExcelJS.ValueType.Number) {
            hasNumber = true;
            isEmpty = false;
            value = ""; // Strip the number, leaving it blank for real user input
          } else if (cell.type === ExcelJS.ValueType.String || cell.type === ExcelJS.ValueType.Boolean) {
            if (value && value.toString().trim() !== "") {
              isEmpty = false;
            }
          }

          const style: any = {
            bold: cell.font?.bold || false,
          };
          if (cell.fill && cell.fill.type === 'pattern' && cell.fill.fgColor && cell.fill.fgColor.argb) {
            style.bgColor = `#${cell.fill.fgColor.argb.substring(2)}`;
          }

          // Save the original type to determine if it should be an input later
          const originalType = cell.type;

          parsedCells[colNumber - 1] = {
            value: value !== null && value !== undefined ? value.toString() : "",
            formula,
            style,
            isClientData: originalType === ExcelJS.ValueType.Number || originalType === ExcelJS.ValueType.Null || value === null || value === undefined || value === "",
          };
        });

        // Ensure array is continuous up to its length
        for (let i = 0; i < parsedCells.length; i++) {
          if (!parsedCells[i]) {
            parsedCells[i] = { value: "", isClientData: true };
          }
        }

        if (firstDataRowIndex === -1 && !isEmpty && (hasNumber || hasFormula)) {
          firstDataRowIndex = parsedRows.length;
        }

        parsedRows.push({ cells: parsedCells, type: isEmpty ? 'empty' : 'data' });
      });

      // Pass 2: Categorize rows based on firstDataRowIndex
      let maxHeaderLength = 0;
      parsedRows.forEach((row, idx) => {
        if (row.type === 'empty') return;
        
        if (firstDataRowIndex !== -1 && idx >= firstDataRowIndex) {
          row.type = 'data';
        } else {
          const distinctStrings = new Set(row.cells.map(c => c.value).filter(v => v !== ""));
          if (distinctStrings.size > 1) {
            row.type = 'header';
            maxHeaderLength = Math.max(maxHeaderLength, row.cells.length);
          } else {
            row.type = 'title';
          }
        }
      });

      // Pass 3: Process header flags and trim trailing cells
      parsedRows.forEach((row) => {
        row.cells.forEach((cell) => {
          if (row.type === 'header') {
            cell.isHeader = true;
          }
        });
        
        // Trim padding cells beyond the actual table width (if it's a data row and mostly empty at the end)
        if (row.type === 'data' && maxHeaderLength > 0 && row.cells.length > maxHeaderLength) {
           let canTrim = true;
           for (let i = maxHeaderLength; i < row.cells.length; i++) {
              if (row.cells[i].value !== "" || row.cells[i].formula) {
                 canTrim = false;
                 break;
              }
           }
           if (canTrim) {
              row.cells = row.cells.slice(0, maxHeaderLength);
           }
        }
      });

      // Trim trailing empty rows
      while (parsedRows.length > 0 && parsedRows[parsedRows.length - 1].type === 'empty') {
        parsedRows.pop();
      }

      sheets.push({
        name: worksheet.name,
        rows: parsedRows
      });
    });

    return { success: true, data: sheets };

  } catch (error: any) {
    console.error("Error parsing data table:", error);
    return { success: false, error: error.message || "Unknown error parsing data table." };
  }
}
