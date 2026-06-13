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
exports.registerAIValidatorConsumers = registerAIValidatorConsumers;
const event_bus_1 = require("../event-bus");
function registerAIValidatorConsumers() {
    event_bus_1.eventBus.subscribe((event) => __awaiter(this, void 0, void 0, function* () {
        switch (event.type) {
            case "DOCUMENT_UPLOADED": {
                const { documentId, projectId } = event.payload;
                // Mocking AI validation delay
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    // In a real implementation, we would update the document metadata or risk score here
                }), 2000);
                break;
            }
            case "DOCUMENT_REJECTED": {
                const { documentId, reason } = event.payload;
                // Capture rejection pattern logic here
                break;
            }
        }
    }));
}
