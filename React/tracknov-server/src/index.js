"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const PORT = 5101;
// Tighten CORS constraints to explicitly permit frontend handshakes
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// Main Verification Handshake Route
app.post('/api/harita/verify-project', (req, res) => {
    try {
        const { projectPath, organizationId } = req.body;
        const targetPath = projectPath || '.tmp-bhavarkua-igbc';
        const targetOrg = organizationId || 'default-org-id';
        console.log(`[HARITA ENGINE] Validating workspace path target: ${targetPath}`);
        return res.status(200).json({
            initialized: true,
            resolvedAbsolutePath: `C:\\Users\\91922\\Documents\\Codex\\tracknov\\React\\${targetPath}`,
            status: "Ready",
            meta: { targetOrg }
        });
    }
    catch (error) {
        console.error('[SERVER ERROR INTERCEPT]', error);
        return res.status(500).json({ error: error.message || 'Path verification thread failed' });
    }
});
// Stubs for your structural math endpoints so they are ready for Phase 3 evaluation calls
app.post('/api/harita/evaluate-credit', (req, res) => {
    try {
        const { creditCode, extractionPayload } = req.body;
        console.log(`[HARITA ENGINE] Evaluating credit: ${creditCode}`);
        let evaluationResult = null;
        if (creditCode === 'EE_Credit1') {
            const { IgbcScoreAuthority } = require('./services/igbc-score-authority');
            evaluationResult = IgbcScoreAuthority.verifyChillerEfficiency(extractionPayload);
        }
        else {
            return res.status(400).json({ success: false, message: "Unsupported credit code" });
        }
        // Artificial delay to simulate processing
        setTimeout(() => {
            return res.status(200).json({ success: true, evaluationResult });
        }, 1000);
    }
    catch (error) {
        console.error('[SERVER ERROR INTERCEPT]', error);
        return res.status(500).json({ error: error.message || 'Evaluation thread failed' });
    }
});
// Harita AI Chat Endpoint
app.post('/api/harita/chat', (req, res) => {
    try {
        const { message } = req.body;
        console.log(`[HARITA ENGINE] Received message: ${message}`);
        // Simulated AI Logic
        let reply = "I am Harita, your IGBC assistant. I can help analyze your building documentation.";
        const lowerMsg = (message === null || message === void 0 ? void 0 : message.toLowerCase()) || "";
        if (lowerMsg.includes("audit") || lowerMsg.includes("document")) {
            reply = "To audit a document, navigate to the Document Audit section and upload your invoice or calculation sheet. I will automatically extract the required parameters.";
        }
        else if (lowerMsg.includes("matrix") || lowerMsg.includes("compliance")) {
            reply = "The Compliance Matrix tracks your target credits, points awarded, and overall IGBC certification progress.";
        }
        else if (lowerMsg.includes("chiller") || lowerMsg.includes("efficiency")) {
            reply = "For Chiller Efficiency, ensure your Full Load COP meets the mandatory baseline. Air-Cooled systems generally require a COP of 2.90.";
        }
        else if (lowerMsg.includes("hello") || lowerMsg.includes("hi")) {
            reply = "Hello! How can I assist you with your project today?";
        }
        // Artificial delay to simulate thinking
        setTimeout(() => {
            return res.status(200).json({ success: true, reply });
        }, 1500);
    }
    catch (error) {
        console.error('[SERVER ERROR INTERCEPT]', error);
        return res.status(500).json({ error: error.message || 'Chat thread failed' });
    }
});
app.listen(PORT, () => {
    console.log(`[SERVER ACTIVE] Harita engine listening cleanly on http://localhost:${PORT}`);
});
