"use client";

import { useState, useEffect } from "react";
import { ParsedSheet } from "@/lib/actions/table-actions";
import { Badge } from "@/components/ui/badge";
import { HyperFormula, CellError } from "hyperformula";

export function DataTableView({ sheets, workspace, user }: { sheets: ParsedSheet[], workspace?: any, user?: any }) {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  
  // Filter sheets based on assignments
  const getVisibleSheets = () => {
    if (!workspace || !user) return sheets;
    
    // L5, L3, Admins can see everything
    const role = workspace.userRole;
    if (["super_admin", "project_admin", "super_user", "L5", "L3"].includes(role)) {
      return sheets;
    }

    const normalizeCode = (code: string) => {
      return code.toLowerCase().replace(/credit/g, 'c').replace(/[^a-z0-9]/g, '');
    };

    // Individual contributors can only see sheets assigned to them
    return sheets.filter(sheet => {
      // Find matching credit by sheet name (e.g. "IE Credit 1" matches "IE C1")
      const sheetNameClean = normalizeCode(sheet.name);
      
      const matchedCredit = workspace.credits.find((c: any) => {
        const creditCodeClean = normalizeCode(c.credit_code);
        return creditCodeClean === sheetNameClean || sheetNameClean.includes(creditCodeClean);
      });

      if (!matchedCredit) return false; // Hide if no matching credit found

      // Find the requirement that likely represents the table
      const isAssigned = matchedCredit.documents_required.some((req: any) => {
        // Match requirement type/label for table/calculation
        const isTableReq = req.type?.toLowerCase().includes('table') || 
                           req.type?.toLowerCase().includes('calculat') ||
                           req.label?.toLowerCase().includes('table') || 
                           req.label?.toLowerCase().includes('calculat');
        
        return isTableReq && req.assigned_user_id === user.id;
      });

      return isAssigned;
    });
  };

  const visibleSheets = getVisibleSheets();
  const [gridState, setGridState] = useState<ParsedSheet[]>(visibleSheets);
  const [hfInstance, setHfInstance] = useState<HyperFormula | null>(null);

  useEffect(() => {
    const hf = HyperFormula.buildEmpty({ licenseKey: "gpl-v3" });
    sheets.forEach((sheet) => {
      hf.addSheet(sheet.name);
      const sheetId = hf.getSheetId(sheet.name) as number;
      const hfData = sheet.rows.map((row) =>
        row.cells.map((c) => (c.formula ? "=" + c.formula : c.value === undefined ? "" : c.value))
      );
      hf.setSheetContent(sheetId, hfData);
    });
    setHfInstance(hf);
  }, []);

  if (!gridState || gridState.length === 0) {
    return <div className="p-4 text-[var(--color-text-secondary)]">No tables found.</div>;
  }

  const activeSheet = gridState[activeSheetIndex];
  
  // Extract titles to show outside the table
  const titleRows = activeSheet.rows.filter(r => r.type === 'title');
  const otherRows = activeSheet.rows.filter(r => r.type !== 'title' && r.type !== 'empty');

  const handleCellChange = (rowIndex: number, colIndex: number, newValue: string) => {
    const newGridState = [...gridState];
    newGridState[activeSheetIndex].rows[rowIndex].cells[colIndex].value = newValue;
    setGridState(newGridState);
    if (hfInstance) {
      const sheetId = hfInstance.getSheetId(activeSheet.name) as number;
      hfInstance.setCellContents({ sheet: sheetId, col: colIndex, row: rowIndex }, [[newValue]]);
    }
  };

  return (
    <div className="flex flex-col border border-[var(--color-border)] rounded-xl overflow-hidden bg-white shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] ring-1 ring-black/5">
      {/* Premium Segmented Control Tabs */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[#fafafa] flex overflow-x-auto gap-2 scrollbar-hide">
        {gridState.map((sheet, index) => (
          <button
            key={index}
            className={`px-4 py-2 text-[13px] font-semibold whitespace-nowrap rounded-full transition-all duration-300 ${
              activeSheetIndex === index
                ? "bg-white text-[var(--color-green)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] ring-1 ring-black/5 scale-100"
                : "text-[var(--color-text-secondary)] hover:bg-black/5 scale-95 hover:scale-100"
            }`}
            onClick={() => setActiveSheetIndex(index)}
          >
            {sheet.name}
          </button>
        ))}
      </div>

      <div className="p-8 bg-gradient-to-b from-white to-[#fafafa]/50 min-h-[400px]">
        {/* Extracted Titles */}
        {titleRows.length > 0 && (
          <div className="mb-8 space-y-1">
            {titleRows.map((row, rIdx) => {
              const texts = row.cells.map(c => c.value).filter(v => v !== "");
              const titleText = texts.join(" - ");
              return titleText ? (
                <h3 key={rIdx} className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] bg-clip-text">
                  {titleText}
                </h3>
              ) : null;
            })}
          </div>
        )}

        {/* Structured Table */}
        <div className="overflow-x-auto bg-white rounded-xl border border-[var(--color-border)] shadow-sm">
          <table className="w-full border-collapse text-sm text-left">
            <thead>
              {activeSheet.rows.filter(r => r.type === 'header').map((row, actualRowIndex) => (
                <tr key={actualRowIndex} className="bg-[#fcfcfc] border-b border-[var(--color-border)]">
                  {row.cells.map((cell, colIndex) => (
                    <th key={colIndex} className="px-6 py-4 font-bold text-[12px] text-[var(--color-text-secondary)] tracking-wider uppercase whitespace-normal break-words align-bottom">
                      {cell.value}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {activeSheet.rows.map((row, actualRowIndex) => {
                if (row.type !== 'data') return null;

                return (
                  <tr 
                    key={actualRowIndex} 
                    className="group border-b border-[var(--color-border)] last:border-0 hover:bg-[#f8fcf9] transition-all duration-300"
                  >
                    {row.cells.map((cell, colIndex) => {
                      const isFormula = !!cell.formula;
                      const isEditableInput = cell.isClientData;
                      const isStaticLabel = !cell.isClientData && !isFormula;

                      let displayValue = cell.value;
                      if (isFormula && hfInstance) {
                        const sheetId = hfInstance.getSheetId(activeSheet.name) as number;
                        const hfVal = hfInstance.getCellValue({ sheet: sheetId, col: colIndex, row: actualRowIndex });
                        displayValue = hfVal instanceof CellError ? hfVal.message : (hfVal !== null && hfVal !== undefined ? hfVal.toString() : "");
                      }

                      return (
                        <td key={colIndex} className="p-3 align-middle min-w-[150px]">
                          {isEditableInput ? (
                            <div className="relative group/input">
                              <input 
                                type="text"
                                value={cell.value || ""}
                                onChange={(e) => handleCellChange(actualRowIndex, colIndex, e.target.value)}
                                className="w-full min-h-[42px] px-4 py-2 bg-transparent border border-transparent rounded-lg focus:bg-white focus:border-[var(--color-green)] focus:ring-4 focus:ring-[var(--color-green)]/10 hover:border-black/10 hover:bg-black/[0.02] text-[14px] font-medium text-[var(--color-text-primary)] transition-all duration-300 placeholder:text-black/20"
                                placeholder="Enter value"
                              />
                            </div>
                          ) : isFormula ? (
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-[var(--color-green)]/5 to-transparent rounded-lg border border-[var(--color-green)]/20 shadow-sm relative overflow-hidden group-hover:from-[var(--color-green)]/10 transition-colors">
                              <div className="absolute inset-y-0 left-0 w-1 bg-[var(--color-green)]/40 rounded-l-lg"></div>
                              <span className="font-mono font-semibold text-[15px] text-[var(--color-text-primary)] pl-1">{displayValue || "-"}</span>
                              <Badge className="text-[9px] px-2 py-0.5 font-extrabold uppercase tracking-widest bg-[var(--color-green)]/10 text-[var(--color-green)] border-none">fx</Badge>
                            </div>
                          ) : (
                            <div className="px-3 py-2 text-[14px] text-[var(--color-text-primary)] font-medium whitespace-normal break-words leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity">
                              {displayValue}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
