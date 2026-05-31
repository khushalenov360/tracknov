import { env } from "@/lib/env";
import { buildAssistantSystemPrompt } from "../assistant";

export async function createAiStream(
  context: any,
  messages: any[],
  workspaceSnapshot: string,
  role?: string,
  functionResults?: Array<{ name: string; response: unknown }>,
) {
  const geminiApiKey = env.geminiApiKeys[0];
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment.");
  }

  const systemPrompt = buildAssistantSystemPrompt(context, workspaceSnapshot, role);
  const geminiContents: any[] = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  if (functionResults?.length) {
     geminiContents.push({
         role: "model",
         parts: functionResults.map((fc: any) => ({ functionCall: { name: fc.name, args: {} } }))
     });
     geminiContents.push({
         role: "function",
         parts: functionResults.map((fc: any) => ({ functionResponse: { name: fc.name, response: { result: fc.response } } }))
     });
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": geminiApiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: geminiContents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1200,
      }
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API Error: ${err}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = response.body?.getReader();
  
  if (!reader) throw new Error("No response body from Gemini");

  return new ReadableStream({
    async start(controller) {
      let buffer = "";
      let lastText = "";

      const emitText = (currentText: string) => {
        const nextChunk = currentText.startsWith(lastText) ? currentText.slice(lastText.length) : currentText;
        if (nextChunk) {
          let safeChunk = nextChunk.replace(/\[\[.*\]\]/g, "");
          if (safeChunk) controller.enqueue(encoder.encode(safeChunk));
        }
        lastText = currentText;
      }

      const processEvent = (eventBlock: string) => {
        const dataLines = eventBlock.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith("data:")).map(l => l.slice(5).trim());
        for (const line of dataLines) {
          if (!line || line === "[DONE]") continue;
          try {
            const parsed = JSON.parse(line);
            const parts = parsed.candidates?.[0]?.content?.parts;
            if (Array.isArray(parts)) {
              const currentText = parts.map((p: any) => p.text ?? "").join("");
              if (currentText) emitText(currentText);
            }
          } catch {
            // ignore malformed
          }
        }
      }

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let separatorIndex = buffer.indexOf("\n\n");
          while (separatorIndex !== -1) {
            const eventBlock = buffer.slice(0, separatorIndex).trim();
            buffer = buffer.slice(separatorIndex + 2);
            if (eventBlock) processEvent(eventBlock);
            separatorIndex = buffer.indexOf("\n\n");
          }
        }
        const tail = buffer.trim();
        if (tail) processEvent(tail);
        controller.close();
      } catch (e) {
        controller.error(e);
      } finally {
        reader.releaseLock();
      }
    }
  });
}

export async function tryDetectFunctionCalls(
  context: any,
  messages: any[],
  workspaceSnapshot: string,
  role: string,
) {
  const { toGeminiTools } = await import("../assistant-tools");
  const geminiApiKey = env.geminiApiKeys[0];
  if (!geminiApiKey) return null;

  const systemPrompt = buildAssistantSystemPrompt(context, workspaceSnapshot, role);
  const geminiContents = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": geminiApiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: geminiContents,
      tools: toGeminiTools(),
      generationConfig: {
        temperature: 0.1,
      }
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts;
  
  if (Array.isArray(parts)) {
    const functionCalls = parts
      .filter((p: any) => p.functionCall)
      .map((p: any) => ({
        name: p.functionCall.name,
        args: p.functionCall.args || {}
      }));
    if (functionCalls.length > 0) return functionCalls;
  }
  return null;
}
