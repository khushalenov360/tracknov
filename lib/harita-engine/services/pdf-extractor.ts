/**
 * PDF Extractor Service
 *
 * Extracts raw text from a PDF buffer using pdf-parse.
 * Used by the guidebook ingestion pipeline to feed real PDF content into Harita's RAG memory.
 */

let pdfParse: any = null;

async function getPdfParser() {
  if (!pdfParse) {
    // Dynamic import so the module is only loaded server-side
    const mod = (await import("pdf-parse")) as any;
    pdfParse = mod.default ?? mod;
  }
  return pdfParse as (buffer: Buffer, options?: any) => Promise<{ text: string; numpages: number }>;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const parse = await getPdfParser();
    const result = await parse(buffer, {
      // Prevent pdf-parse from trying to load its internal test PDF from disk
      // (causes file-not-found errors in Next.js / serverless environments)
      pagerender: undefined,
      max: 0,
    });
    return result.text ?? "";
  } catch (err) {
    console.error("[pdf-extractor] Failed to extract text from PDF:", err);
    return "";
  }
}

/**
 * Clean and normalise raw PDF text:
 * - Collapse runs of whitespace/newlines into single spaces
 * - Strip null bytes and non-printable control characters
 * - Trim leading/trailing whitespace
 */
export function cleanPdfText(raw: string): string {
  return raw
    .replace(/\x00/g, " ")                      // null bytes
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, " ") // non-printable
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")                     // collapse horizontal whitespace
    .replace(/\n{3,}/g, "\n\n")                  // max 2 consecutive newlines
    .trim();
}
