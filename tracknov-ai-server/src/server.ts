import "dotenv/config";
import cors from "cors";
import express from "express";
import agentRoutes from "./routes/agentRoutes";

const app = express();
const port = Number(process.env.PORT || 5001);
const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({
  origin,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, port });
});

app.use("/api/v1/agent", agentRoutes);

app.listen(port, () => {
  console.log(`[TRACKNOV AI] Streaming server listening on http://localhost:${port}`);
});
