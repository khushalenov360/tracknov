"use strict";
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
exports.ClarificationParser = void 0;
class ClarificationParser {
    parse(comment) {
        return __awaiter(this, void 0, void 0, function* () {
            // e.g. "Provide HVAC efficiency calculations."
            // In production, this calls OpenAI or similar to extract structured intent.
            return {
                evidenceType: 'HVAC',
                requestType: 'missing_evidence',
                extractedKeywords: ['efficiency', 'calculations']
            };
        });
    }
}
exports.ClarificationParser = ClarificationParser;
