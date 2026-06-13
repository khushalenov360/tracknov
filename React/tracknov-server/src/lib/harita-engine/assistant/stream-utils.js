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
exports.toGeminiContents = toGeminiContents;
exports.toGeminiMessagesWithFunctionCalls = toGeminiMessagesWithFunctionCalls;
exports.toChatMessages = toChatMessages;
exports.extractText = extractText;
exports.extractFunctionCalls = extractFunctionCalls;
exports.extractOpenAiFunctionCalls = extractOpenAiFunctionCalls;
exports.createTextStream = createTextStream;
exports.createResponseStream = createResponseStream;
const assistant_1 = require("@/lib/harita-engine/assistant");
function toGeminiContents(messages, attachments = []) {
    var _a;
    const lastUserIndex = (_a = [...messages]
        .map((message, index) => ({ message, index }))
        .reverse()
        .find((entry) => entry.message.role === "user")) === null || _a === void 0 ? void 0 : _a.index;
    return messages.map((message, index) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [
            { text: message.content },
            ...(lastUserIndex === index
                ? (attachments !== null && attachments !== void 0 ? attachments : []).slice(0, 3).map((file) => ({
                    inline_data: {
                        mime_type: file.mimeType || "application/octet-stream",
                        data: file.base64,
                    },
                }))
                : []),
        ],
    }));
}
function toGeminiMessagesWithFunctionCalls(messages, functionCalls) {
    const geminiMessages = toGeminiContents(messages);
    const modelPart = {
        role: "model",
        parts: functionCalls.map((fc) => ({
            functionCall: { name: fc.name, args: {} },
        })),
    };
    const functionParts = {
        role: "function",
        parts: functionCalls.map((fc) => ({
            functionResponse: { name: fc.name, response: { result: fc.response } },
        })),
    };
    return [...geminiMessages, modelPart, functionParts];
}
function toChatMessages(context, messages, workspaceSnapshot, role) {
    return [
        {
            role: "system",
            content: (0, assistant_1.buildAssistantSystemPrompt)(context, workspaceSnapshot, role),
        },
        ...messages.map((message) => ({
            role: message.role,
            content: message.content,
        })),
    ];
}
function extractText(responseData) {
    var _a, _b, _c;
    const candidate = (_c = (_b = (_a = responseData === null || responseData === void 0 ? void 0 : responseData.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts;
    if (!Array.isArray(candidate)) {
        return "";
    }
    return candidate
        .map((part) => { var _a; return (_a = part.text) !== null && _a !== void 0 ? _a : ""; })
        .join("")
        .trim();
}
function extractFunctionCalls(responseData) {
    var _a, _b, _c;
    const parts = (_c = (_b = (_a = responseData === null || responseData === void 0 ? void 0 : responseData.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts;
    if (!Array.isArray(parts))
        return [];
    return parts
        .filter((part) => part === null || part === void 0 ? void 0 : part.functionCall)
        .map((part) => {
        var _a;
        return ({
            name: part.functionCall.name,
            args: (_a = part.functionCall.args) !== null && _a !== void 0 ? _a : {},
        });
    });
}
function extractOpenAiFunctionCalls(responseData) {
    var _a, _b, _c;
    const toolCalls = (_c = (_b = (_a = responseData === null || responseData === void 0 ? void 0 : responseData.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.tool_calls;
    if (!Array.isArray(toolCalls))
        return [];
    return toolCalls
        .filter((tc) => tc.type === "function")
        .map((tc) => {
        var _a;
        return ({
            name: tc.function.name,
            args: JSON.parse((_a = tc.function.arguments) !== null && _a !== void 0 ? _a : "{}"),
        });
    });
}
function createTextStream(text) {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(text));
            controller.close();
        },
    });
}
const response_integrity_monitor_1 = require("../runtime/response-integrity-monitor");
function createResponseStream(textStream, navigateTo, queryId) {
    const headers = {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Content-Type-Options": "nosniff",
    };
    if (navigateTo) {
        headers["X-Harita-Navigate"] = navigateTo;
    }
    const monitoredId = queryId || Math.random().toString(36).substring(7);
    response_integrity_monitor_1.ResponseIntegrityMonitor.initializeResponse(monitoredId);
    const decoder = new TextDecoder("utf-8");
    let fullResponse = "";
    const monitoredStream = new ReadableStream({
        start(controller) {
            return __awaiter(this, void 0, void 0, function* () {
                const reader = textStream.getReader();
                try {
                    while (true) {
                        const { done, value } = yield reader.read();
                        if (done) {
                            response_integrity_monitor_1.ResponseIntegrityMonitor.markComplete(monitoredId, fullResponse);
                            controller.close();
                            break;
                        }
                        if (value) {
                            const chunkText = decoder.decode(value, { stream: true });
                            fullResponse += chunkText;
                            response_integrity_monitor_1.ResponseIntegrityMonitor.logChunk(monitoredId, chunkText.length);
                            controller.enqueue(value);
                        }
                    }
                }
                catch (err) {
                    controller.error(err);
                }
                finally {
                    reader.releaseLock();
                }
            });
        }
    });
    return new Response(monitoredStream, { headers });
}
