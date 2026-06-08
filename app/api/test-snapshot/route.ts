import { assembleRuntimeContext, formatRuntimeContext } from "@/lib/harita-engine/lib/runtime/runtime-context-assembler";

export async function GET(req: Request) {
  try {
    const ctx = await assembleRuntimeContext();
    const res = ctx ? formatRuntimeContext(ctx) : null;
    return Response.json({ res });
  } catch(e) {
    return Response.json({ error: String(e) });
  }
}
