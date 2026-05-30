import { createClient } from "@/lib/supabase/server";

export async function createAiStream(
  context: any,
  messages: any[],
  workspaceSnapshot: string,
  role?: string,
  functionResults?: Array<{ name: string; response: unknown }>,
) {
  const supabase = createClient();

  const response = await supabase.functions.invoke('enovait-copilot', {
    body: {
      context,
      messages,
      snapshot: workspaceSnapshot,
      role,
      functionResults
    }
  });

  if (response.error) {
    throw response.error;
  }

  // The supabase-js client automatically buffers the response if we don't pass specific headers
  // But to actually return the ReadableStream, we might need to use the native fetch if supabase.functions doesn't expose the raw stream.
  // Actually, Supabase js client `invoke` buffers the entire response by default.
  // We MUST use raw fetch to proxy the stream!
  
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/enovait-copilot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      context,
      messages,
      snapshot: workspaceSnapshot,
      role,
      functionResults
    })
  });

  if (!res.ok || !res.body) {
    throw new Error(`Edge Function failed: ${res.statusText}`);
  }

  return res.body;
}

export async function tryDetectFunctionCalls(
  context: any,
  messages: any[],
  workspaceSnapshot: string,
  role: string,
) {
  // Edge-ready function calling placeholder
  return null;
}
