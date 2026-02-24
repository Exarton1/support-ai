import { supabase } from "@/lib/db";
import { SETTINGS_TABLE } from "@/model/settings.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { ownerId, businessName, supportEmail, knowledge } = await req.json()
    if (!ownerId) {
      return NextResponse.json(
        { message: "owner id is required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert(
        {
          owner_id: ownerId,
          business_name: businessName,
          support_email: supportEmail,
          knowledge: knowledge,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id" }
      )
      .select()
      .single()

    if (error) {
      console.error("Supabase upsert error:", error)
      return NextResponse.json(
        { message: `database error: ${error.message}` },
        { status: 503 }
      )
    }

    // Map snake_case back to camelCase for the frontend
    return NextResponse.json({
      ownerId: data.owner_id,
      businessName: data.business_name,
      supportEmail: data.support_email,
      knowledge: data.knowledge,
    })
  } catch (error) {
    return NextResponse.json(
      { message: `settings error ${error}` },
      { status: 500 }
    )
  }
}
