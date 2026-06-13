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
exports.SapConnector = void 0;
class SapConnector {
    /**
     * Fetches procurement data for a specific tenant scope
     */
    static fetchProcurementRecords(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = this.sapRecords.get(tenantId);
            if (existing)
                return existing;
            const mockRecords = [
                {
                    invoiceNumber: "SAP-INV-998812",
                    vendorId: "Daikin Climate Systems",
                    materialCode: "HVAC-VRV-01",
                    quantityMetric: 4,
                    totalCostUsd: 48000,
                    taxRegistrationNumber: "GST-DKN-901"
                },
                {
                    invoiceNumber: "SAP-INV-998815",
                    vendorId: "Tata Structural Steel",
                    materialCode: "STRUCT-STL-450",
                    quantityMetric: 85, // tons
                    totalCostUsd: 98000,
                    taxRegistrationNumber: "GST-TATA-302"
                }
            ];
            this.sapRecords.set(tenantId, mockRecords);
            return mockRecords;
        });
    }
}
exports.SapConnector = SapConnector;
SapConnector.sapRecords = new Map();
