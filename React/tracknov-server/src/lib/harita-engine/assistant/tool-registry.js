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
exports.toGeminiTools = exports.toOpenAiTools = exports.TOOLS = exports.executeTool = void 0;
exports.executeEdgeTool = executeEdgeTool;
var assistant_tools_1 = require("../assistant-tools");
Object.defineProperty(exports, "executeTool", { enumerable: true, get: function () { return assistant_tools_1.executeTool; } });
Object.defineProperty(exports, "TOOLS", { enumerable: true, get: function () { return assistant_tools_1.TOOLS; } });
Object.defineProperty(exports, "toOpenAiTools", { enumerable: true, get: function () { return assistant_tools_1.toOpenAiTools; } });
Object.defineProperty(exports, "toGeminiTools", { enumerable: true, get: function () { return assistant_tools_1.toGeminiTools; } });
/**
 * 06_REPOSITORY_REFACTOR_PLAN
 * Edge-compatible tool registry abstraction layer.
 */
function executeEdgeTool(name, args) {
    return __awaiter(this, void 0, void 0, function* () {
        // Edge-ready function calling placeholder
        throw new Error("Migrated to Edge Tool Executor - Not yet implemented");
    });
}
