import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { rating_system_name, credits } = await req.json();

    if (!rating_system_name || !credits || !Array.isArray(credits)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Ensure Rating System exists
    let { data: rsData } = await adminClient
      .from("rating_systems")
      .select("id")
      .eq("name", rating_system_name)
      .maybeSingle();

    if (!rsData) {
      const { data: newRs } = await adminClient
        .from("rating_systems")
        .insert({ name: rating_system_name, version: "v1" })
        .select("id")
        .single();
      rsData = newRs;
    }

    if (!rsData) {
      return NextResponse.json({ error: "Failed to create or find rating system" }, { status: 500 });
    }

    const rsId = rsData.id;

    // 2. Insert Categories uniquely
    const uniqueCategories = Array.from(new Set(credits.map((c: any) => c.category).filter(Boolean)));
    const categoryMap: Record<string, string> = {};

    for (let i = 0; i < uniqueCategories.length; i++) {
      const catName = uniqueCategories[i] as string;
      const { data: catData } = await adminClient
        .from("credit_categories")
        .upsert(
          { rating_system_id: rsId, name: catName, display_order: i + 1 },
          { onConflict: 'rating_system_id,name' }
        )
        .select("id")
        .single();
      
      if (catData) {
        categoryMap[catName] = catData.id;
      }
    }

    // 3. Upsert Credits
    for (const c of credits) {
      const catId = categoryMap[c.category];
      if (!catId) continue;

      const { error: upsertError } = await adminClient
        .from("credit_templates")
        .upsert(
          {
            rating_system_id: rsId,
            category_id: catId,
            code: c.credit_code,
            name: c.credit_name,
            is_mandatory: c.is_mandatory || false,
            max_points: c.max_points || 0,
            documentation_summary: c.documentation_summary || ""
          },
          { onConflict: 'rating_system_id,code' }
        );
      
      if (upsertError) {
        throw new Error("Failed to upsert credit: " + upsertError.message);
      }
    }

    return NextResponse.json({ success: true, count: credits.length });

  } catch (error: any) {
    console.error("Commit Framework Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
