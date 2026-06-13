"use strict";
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
exports.stageGateService = exports.StageGateService = void 0;
const MILESTONE_DEFINITIONS = [
    {
        id: "foundation",
        name: "Foundation",
        categories: ["Soil Erosion Control", "Excavation Safety"],
        criteria: [
            "Soil erosion control measures documented",
            "Excavation safety compliance verified",
        ],
    },
    {
        id: "structure",
        name: "Structure",
        categories: ["RMC Invoices", "Steel Recycled Content"],
        criteria: [
            "RMC sourcing distance verified (< 160km)",
            "Steel recycled content > 15%",
        ],
    },
    {
        id: "finishing",
        name: "Finishing",
        categories: ["VOC Content", "FSC Wood"],
        criteria: [
            "VOC content labels scanned & matched",
            "FSC wood certification verified",
        ],
    },
];
function deriveStatus(docs, requiredCategories) {
    const matchingDocs = docs.filter((d) => { var _a; return requiredCategories.includes((_a = d.doc_category) !== null && _a !== void 0 ? _a : ""); });
    if (matchingDocs.length === 0)
        return "LOCKED";
    const allApproved = matchingDocs.length >= requiredCategories.length &&
        matchingDocs.every((d) => d.state === "APPROVED" || d.state === "complete");
    return allApproved ? "COMPLETED" : "IN_PROGRESS";
}
class StageGateService {
    /**
     * Pure in-memory version — pass docs already loaded from getProjectWorkspace.
     * Use this on the Overview page to avoid a redundant DB round-trip.
     */
    getMilestonesFromDocs(docs) {
        return MILESTONE_DEFINITIONS.map((def) => ({
            id: def.id,
            name: def.name,
            status: deriveStatus(docs, def.categories),
            criteria: def.criteria,
        }));
    }
    /**
     * DB version — kept for contexts where workspace docs are unavailable.
     * Prefer getMilestonesFromDocs when you already have the workspace.
     */
    getMilestones(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { createAdminClient } = yield Promise.resolve().then(() => __importStar(require("@/lib/supabase/admin")));
            const admin = createAdminClient();
            const { data: documents } = yield admin
                .from("project_document")
                .select("doc_category, state")
                .eq("project_id", projectId);
            return this.getMilestonesFromDocs(documents !== null && documents !== void 0 ? documents : []);
        });
    }
}
exports.StageGateService = StageGateService;
exports.stageGateService = new StageGateService();
