import {
  buildAssistantSystemPrompt,
  type AssistantContext,
  type AssistantMessage,
} from "@tracknov/harita-engine/assistant";

export type AssistantRequest = {
  context?: AssistantContext;
  messages?: AssistantMessage[];
  tone?: "Executive" | "Guided" | "Fast";
  pickedIntent?: "analysis" | "workflow";
  attachments?: Array<{
    name: string;
    mimeType: string;
    size: number;
    base64: string;
  }>;
  idempotencyKey?: string | null;
};

export type AiProvider = "doubleword" | "gemini" | "groq" | "openrouter";

export type ProviderAttempt = {
  provider: AiProvider;
  model: string;
  apiKey: string;
};

export function toGeminiContents(messages: AssistantMessage[], attachments: AssistantRequest["attachments"] = []) {
  const lastUserIndex = [...messages]
    .map((message, index) => ({ message, index }))
    .reverse()
    .find((entry) => entry.message.role === "user")?.index;

  return messages.map((message, index) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [
      { text: message.content },
      ...(lastUserIndex === index
        ? (attachments ?? []).slice(0, 3).map((file) => ({
            inline_data: {
              mime_type: file.mimeType || "application/octet-stream",
              data: file.base64,
            },
          }))
        : []),
    ],
  }));
}

export function toGeminiMessagesWithFunctionCalls(
  messages: AssistantMessage[],
  functionCalls: Array<{ name: string; response: unknown }>,
) {
  const geminiMessages = toGeminiContents(messages);
  const modelPart = {
    role: "model" as const,
    parts: functionCalls.map((fc) => ({
      functionCall: { name: fc.name, args: {} },
    })),
  };
  const functionParts = {
    role: "function" as const,
    parts: functionCalls.map((fc) => ({
      functionResponse: { name: fc.name, response: { result: fc.response } },
    })),
  };
  return [...geminiMessages, modelPart, functionParts];
}

export function toChatMessages(context: AssistantContext, messages: AssistantMessage[], workspaceSnapshot: string, role?: string) {
  return [
    {
      role: "system",
      content: buildAssistantSystemPrompt(context, workspaceSnapshot, role),
    },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

export function extractText(responseData: any) {
  const candidate = responseData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(candidate)) {
    return "";
  }
  return candidate
    .map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();
}

export function extractFunctionCalls(responseData: any): Array<{ name: string; args: Record<string, unknown> }> {
  const parts = responseData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return [];
  return parts
    .filter((part: any) => part?.functionCall)
    .map((part: any) => ({
      name: part.functionCall.name,
      args: part.functionCall.args ?? {},
    }));
}

export function extractOpenAiFunctionCalls(responseData: any): Array<{ name: string; args: Record<string, unknown> }> {
  const toolCalls = responseData?.choices?.[0]?.message?.tool_calls;
  if (!Array.isArray(toolCalls)) return [];
  return toolCalls
    .filter((tc: any) => tc.type === "function")
    .map((tc: any) => ({
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments ?? "{}"),
    }));
}

export function createTextStream(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

export function createResponseStream(textStream: ReadableStream<Uint8Array>, navigateTo?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Content-Type-Options": "nosniff",
  };
  if (navigateTo) {
    headers["X-Harita-Navigate"] = navigateTo;
  }
  return new Response(textStream, { headers });
}
