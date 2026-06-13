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
exports.ExtractionPipeline = void 0;
const documentClassifier_1 = require("./documentClassifier");
const metadataExtractor_1 = require("./metadataExtractor");
const tableExtractor_1 = require("./tableExtractor");
const metricExtractor_1 = require("./metricExtractor");
class ExtractionPipeline {
    constructor() {
        this.classifier = new documentClassifier_1.DocumentClassifier();
        this.meta = new metadataExtractor_1.MetadataExtractor();
        this.table = new tableExtractor_1.TableExtractor();
        this.metrics = new metricExtractor_1.MetricExtractor();
    }
    processDocument(fileUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const classification = yield this.classifier.classify(fileUrl);
            const metadata = yield this.meta.extract(fileUrl, classification.category);
            const tables = yield this.table.extract(fileUrl);
            const specificMetrics = yield this.metrics.extract(fileUrl, classification.documentType);
            return {
                classification,
                metadata,
                tables,
                specificMetrics
            };
        });
    }
}
exports.ExtractionPipeline = ExtractionPipeline;
