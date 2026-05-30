// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

/**
 * 06_REPOSITORY_REFACTOR_PLAN
 * EnovAIT Copilot Edge Function
 * 
 * Target Architecture:
 * This Deno edge function will soon ingest the heavy LLM streaming and orchestration
 * logic extracted from the `app/api/assistant/route.ts` Next.js monolith.
 */

serve(async (req: Request) => {
  const { name } = await req.json()
  const data = {
    message: `Hello ${name}! Welcome to the EnovAIT Edge Copilot.`,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})
