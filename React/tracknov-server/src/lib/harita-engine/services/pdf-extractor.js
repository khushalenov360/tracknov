"use strict";
/**
 * PDF Extractor Service
 *
 * Extracts raw text from a PDF buffer using pdf-parse.
 * Used by the guidebook ingestion pipeline to feed real PDF content into Harita's RAG memory.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromPdf = extractTextFromPdf;
exports.cleanPdfText = cleanPdfText;
let pdfParse = null;
function getPdfParser() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!pdfParse) {
            // Dynamic import so the module is only loaded server-side
            const mod = (yield Promise.resolve().then(() => __importStar(require("pdf-parse"))));
            pdfParse = (_a = mod.default) !== null && _a !== void 0 ? _a : mod;
        }
        return pdfParse;
    });
}
function extractTextFromPdf(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const parse = yield getPdfParser();
            const result = yield parse(buffer, {
                // Prevent pdf-parse from trying to load its internal test PDF from disk
                // (causes file-not-found errors in Next.js / serverless environments)
                pagerender: undefined,
                max: 0,
            });
            return (_a = result.text) !== null && _a !== void 0 ? _a : "";
        }
        catch (err) {
            console.error("[pdf-extractor] Failed to extract text from PDF:", err);
            return "";
        }
    });
}
/**
 * Clean and normalise raw PDF text:
 * - Collapse runs of whitespace/newlines into single spaces
 * - Strip null bytes and non-printable control characters
 * - Trim leading/trailing whitespace
 */
function cleanPdfText(raw) {
    return raw
        .replace(/\x00/g, " ") // null bytes
        .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, " ") // non-printable
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ") // collapse horizontal whitespace
        .replace(/\n{3,}/g, "\n\n") // max 2 consecutive newlines
        .trim();
}
