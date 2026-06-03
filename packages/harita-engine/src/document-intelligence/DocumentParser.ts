// packages/harita-engine/src/document-intelligence/DocumentParser.ts
import * as ExcelJS from "exceljs";
import * as JSZip from "jszip";

export interface ParsedDocument {
  text: string;
  metadata: Record<string, any>;
  tables: any[];
}

export class DocumentParser {
  /**
   * Parses an uploaded file buffer based on its filename/extension.
   */
  public async parse(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    const ext = filename.split(".").pop()?.toLowerCase() || "";

    switch (ext) {
      case "pdf":
        return this.parsePdf(buffer);
      case "docx":
        return this.parseDocx(buffer);
      case "xlsx":
        return this.parseXlsx(buffer);
      case "png":
      case "jpg":
      case "jpeg":
        return this.parseImage(filename);
      case "txt":
      case "csv":
        return this.parseText(buffer);
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  private async parsePdf(buffer: Buffer): Promise<ParsedDocument> {
    try {
      // @ts-ignore
      const pdfParseModule = require("pdf-parse");
      const Uint8ArrayBuffer = new Uint8Array(buffer);
      const parser = new pdfParseModule.PDFParse(Uint8ArrayBuffer, {});
      const data = await parser.getText();
      return {
        text: data.text || "",
        metadata: {
          numpages: data.total || 1,
        },
        tables: [],
      };
    } catch (error) {
      console.error("PDF Parsing failed:", error);
      return { text: "", metadata: {}, tables: [] };
    }
  }

  private async parseDocx(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file("word/document.xml")?.async("string");
      
      if (!documentXml) {
        return { text: "", metadata: {}, tables: [] };
      }

      // Simple regex to extract text from XML tags
      const textMatches = documentXml.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
      const text = textMatches 
        ? textMatches.map(t => t.replace(/<[^>]+>/g, '')).join(" ") 
        : "";

      return {
        text,
        metadata: { format: "docx" },
        tables: [],
      };
    } catch (error) {
      console.error("DOCX Parsing failed:", error);
      return { text: "", metadata: {}, tables: [] };
    }
  }

  private async parseXlsx(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      
      let text = "";
      const tables: any[] = [];

      workbook.eachSheet((worksheet) => {
        const sheetData: any[] = [];
        worksheet.eachRow((row) => {
          const rowData = row.values as any[];
          sheetData.push(rowData);
          text += rowData.filter(Boolean).join(" ") + "\n";
        });
        tables.push({ sheetName: worksheet.name, data: sheetData });
      });

      return {
        text,
        metadata: { format: "xlsx", sheetCount: workbook.worksheets.length },
        tables,
      };
    } catch (error) {
      console.error("XLSX Parsing failed:", error);
      return { text: "", metadata: {}, tables: [] };
    }
  }

  private async parseImage(filename: string): Promise<ParsedDocument> {
    // No OCR yet, just return metadata
    return {
      text: "",
      metadata: { format: "image", filename },
      tables: [],
    };
  }

  private async parseText(buffer: Buffer): Promise<ParsedDocument> {
    return {
      text: buffer.toString("utf-8"),
      metadata: { format: "text" },
      tables: [],
    };
  }
}
