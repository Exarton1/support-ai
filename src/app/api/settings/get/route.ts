import { supabase } from "@/lib/db";
import { SETTINGS_TABLE } from "@/model/settings.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { ownerId } = await req.json()
    if (!ownerId) {
      return NextResponse.json(
        { message: "owner id is required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select("*")
      .eq("owner_id", ownerId)
      .maybeSingle()

    if (error) {
      console.error("Supabase select error:", error)
      return NextResponse.json(
        { message: `database error: ${error.message}` },
        { status: 503 }
      )
    }

    if (!data) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      ownerId: data.owner_id,
      businessName: data.business_name,
      supportEmail: data.support_email,
      knowledge: data.knowledge,
    })
  } catch (error) {
    return NextResponse.json(
      { message: `get setting error ${error}` },
      { status: 500 }
    )
  }
}