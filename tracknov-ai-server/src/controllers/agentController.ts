import type { Request, Response } from "express";
import {
  checkProviderStatus,
  streamHaritaResponse,
  type AgentChatRequest,
} from "../services/vertexService";
import { routeIntent } from "../skills/intentRouter";
import { buildSequenceDirective } from "../skills/sequenceEngine";
import { analyzeAttachmentForProject } from "../services/attachmentAnalysisService";

function writeEvent(res: Response, payload: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function detectTaskCreationConfirmation(message: string) {
  return /\b(confirm|confirmed|yes create|go ahead|proceed|create it|do it)\b/i.test(message);
}

export async function getAgentStatus(_req: Request, res: Response) {
  try {
    const status = await checkProviderStatus();
    res.status(200).json(status);
  } catch (error) {
    res.status(200).json({
      cloud: false,
      local: false,
      active: "offline",
      error: error instanceof Error ? error.message : "status_check_failed",
    });
  }
}

export async function chatWithAgent(req: Request, res: Response) {
  const body = req.body as AgentChatRequest;
  const attachment = body?.attachment || null;
  const message = String(body?.message || "").trim() || (attachment ? "Analyze attached document." : "");

  if (!message) {
    return res.status(400).json({
      error: "MESSAGE_REQUIRED",
      message: "A message is required to start Harita streaming.",
      retryable: false,
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const abortController = new AbortController();
  req.on("aborted", () => abortController.abort());

  try {
    if (attachment) {
      writeEvent(res, { type: "ready" });
      const providerStatus = await checkProviderStatus();
      writeEvent(res, { type: "status", ...providerStatus });

      const analysis = await analyzeAttachmentForProject(
        message,
        body?.context,
        attachment,
        body?.attachmentTargetId,
      );

      writeEvent(res, { type: "token", content: analysis.markdown });
      writeEvent(res, {
        type: "done",
        provider: providerStatus.cloud ? "cloud" : providerStatus.local ? "local" : "offline",
        meta: analysis.meta,
      });
      return;
    }

    const intentSignal = routeIntent(message);
    const sequenceDirective = buildSequenceDirective(intentSignal, body?.context);
    const writePermission = {
      taskCreationConfirmed: detectTaskCreationConfirmation(message),
    };
    writeEvent(res, { type: "ready" });

    const result = await streamHaritaResponse({
      message,
      context: body?.context,
      history: body?.history,
      intentSignal,
      sequenceDirective,
      writePermission,
      signal: abortController.signal,
      onStatus: (status) => writeEvent(res, { type: "status", ...status }),
      onToken: (content) => writeEvent(res, { type: "token", content }),
    });

    writeEvent(res, { type: "done", provider: result.provider });
  } catch (error) {
    writeEvent(res, {
      type: "error",
      message: error instanceof Error ? error.message : "Harita streaming failed.",
    });
  } finally {
    res.end();
  }
}
