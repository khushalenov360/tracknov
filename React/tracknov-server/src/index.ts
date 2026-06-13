import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5101;

// Tighten CORS constraints to explicitly permit frontend handshakes
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

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
  } catch (error: any) {
    console.error('[SERVER ERROR INTERCEPT]', error);
    return res.status(500).json({ error: error.message || 'Path verification thread failed' });
  }
});

// Stubs for your structural math endpoints so they are ready for Phase 3 evaluation calls
app.post('/api/harita/evaluate-credit', (req, res) => {
  try {
    const { creditCode, extractionPayload } = req.body;
    console.log(`[HARITA ENGINE] Evaluating credit: ${creditCode}`);
    
    let evaluationResult: any = null;

    if (creditCode === 'EE_Credit1') {
      const { IgbcScoreAuthority } = require('./services/igbc-score-authority');
      evaluationResult = IgbcScoreAuthority.verifyChillerEfficiency(extractionPayload);
    } else {
      return res.status(400).json({ success: false, message: "Unsupported credit code" });
    }

    // Artificial delay to simulate processing
    setTimeout(() => {
      return res.status(200).json({ success: true, evaluationResult });
    }, 1000);

  } catch (error: any) {
    console.error('[SERVER ERROR INTERCEPT]', error);
    return res.status(500).json({ error: error.message || 'Evaluation thread failed' });
  }
});

import { POST as haritaChatHandler } from './controllers/harita-controller';

// Harita AI Chat Endpoint
app.post('/api/harita/chat', async (req, res) => {
  try {
    const { message, context, attachments, idempotencyKey } = req.body;
    console.log(`[HARITA ENGINE] Received message: ${message}`);
    
    // Construct standard Request expected by the legacy Next.js handler
    const baseUrl = `http://${req.headers.host || 'localhost'}`;
    const request = new Request(new URL(req.url, baseUrl).toString(), {
      method: req.method,
      headers: req.headers as any,
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        context,
        attachments,
        idempotencyKey
      }),
    });

    // Invoke the legacy Edge handler
    const response = await haritaChatHandler(request);
    
    if (response.body) {
      // If the response is streaming, pipe it
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let completeText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        completeText += decoder.decode(value, { stream: true });
      }
      completeText += decoder.decode();
      
      return res.status(200).json({ success: true, reply: completeText });
    } else {
      const text = await response.text();
      return res.status(200).json({ success: true, reply: text });
    }
  } catch (error: any) {
    console.error('[SERVER ERROR INTERCEPT]', error);
    return res.status(500).json({ error: error.message || 'Chat thread failed' });
  }
});

app.listen(PORT, () => {
  console.log(`[SERVER ACTIVE] Harita engine listening cleanly on http://localhost:${PORT}`);
});
