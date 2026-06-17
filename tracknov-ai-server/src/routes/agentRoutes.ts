import { Router } from "express";
import { chatWithAgent, getAgentStatus } from "../controllers/agentController";

const router = Router();

router.get("/status", getAgentStatus);
router.post("/chat", chatWithAgent);

export default router;
