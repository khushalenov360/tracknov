import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, metadata } = body;

  if (!type) {
    return NextResponse.json({ error: "Interaction type is required" }, { status: 400 });
  }

  // Log raw interaction
  const { error: insertError } = await supabase
    .from("user_interactions")
    .insert({
      user_id: user.id,
      interaction_type: type,
      metadata: metadata || {},
    });

  if (insertError) {
    console.error("Failed to log interaction", insertError);
    return NextResponse.json({ error: "Failed to log interaction" }, { status: 500 });
  }

  // Update behavior aggregates
  if (type === "query") {
    const queryLength = typeof metadata?.query === "string" ? metadata.query.length : 0;
    
    // Check if behavior record exists
    const { data: behavior } = await supabase
      .from("user_behavior")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!behavior) {
      await supabase.from("user_behavior").insert({
        user_id: user.id,
        query_count: 1,
        total_query_length: queryLength,
        usage_score: 5, // Initial score for first query
        last_active: new Date().toISOString(),
      });
    } else {
      // Incrementally update
      await supabase.rpc("increment_user_behavior", {
        p_user_id: user.id,
        p_query_length: queryLength,
      });
    }
  } else if (type === "rejection") {
    await supabase.rpc("increment_user_rejection", {
      p_user_id: user.id,
    });
  }

  return NextResponse.json({ success: true });
}
