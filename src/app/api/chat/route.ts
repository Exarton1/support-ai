import { supabase } from "@/lib/db";
import { SETTINGS_TABLE } from "@/model/settings.model";
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { message, ownerId } = await req.json()
        if (!message || !ownerId) {
            return NextResponse.json(
                { message: "message and owner id is required" },
                { status: 400 }
            )
        }

        const { data: setting, error: dbErr } = await supabase
          .from(SETTINGS_TABLE)
          .select("*")
          .eq("owner_id", ownerId)
          .maybeSingle()

        if (dbErr) {
            const response = NextResponse.json(
                { message: `database unavailable: ${dbErr.message}` },
                { status: 503 }
            )
            response.headers.set("Access-Control-Allow-Origin", "*")
            response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
            response.headers.set("Access-Control-Allow-Headers", "Content-Type")
            return response
        }
        if (!setting) {
            return NextResponse.json(
                { message: "chat bot is not configured yet." },
                { status: 400 }
            )
        }

        const KNOWLEDGE=`
        business name- ${setting.business_name || "not provided"}
        supportEmail- ${setting.support_email || "not provided"}
        knowledge- ${setting.knowledge ||" not provided"}
        `
     

       const prompt = `
You are a professional customer support assistant for this business.

Use ONLY the information provided below to answer the customer's question.
You may rephrase, summarize, or interpret the information if needed.
Do NOT invent new policies, prices, or promises.



--------------------
BUSINESS INFORMATION
--------------------
${KNOWLEDGE}

--------------------
CUSTOMER QUESTION
--------------------
${message}

--------------------
ANSWER
--------------------
`;

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
    const resp = NextResponse.json({ message: "Gemini API key not configured" }, { status: 500 })
    resp.headers.set("Access-Control-Allow-Origin", "*")
    resp.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
    resp.headers.set("Access-Control-Allow-Headers", "Content-Type")
    return resp
}

const ai = new GoogleGenAI({ apiKey })
let genResult: any
try {
    genResult = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt })
} catch (genErr: any) {
    console.error("Gemini generate error:", genErr)
    const resp = NextResponse.json({ message: `AI generation error: ${genErr?.message || genErr}` }, { status: 500 })
    resp.headers.set("Access-Control-Allow-Origin", "*")
    resp.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
    resp.headers.set("Access-Control-Allow-Headers", "Content-Type")
    return resp
}

// Inspect common response shapes and pick the best candidate
let text: string | undefined
try {
    if (typeof genResult === "string") text = genResult
    if (!text && genResult?.output_text) text = genResult.output_text
    if (!text && Array.isArray(genResult?.candidates) && genResult.candidates[0]) text = genResult.candidates[0].content
    if (!text && Array.isArray(genResult?.output) && genResult.output[0]?.content) {
        const content = genResult.output[0].content
        if (typeof content === "string") text = content
        else if (Array.isArray(content)) {
            const first = content.find((c: any) => typeof c.text === "string")
            if (first) text = first.text
        }
    }
} catch (e) {
    console.error("Error extracting text from Gemini result", e, genResult)
}

if (!text) {
    console.warn("Gemini returned no text", genResult)
    const resp = NextResponse.json({ message: "AI returned no text", raw: genResult }, { status: 502 })
    resp.headers.set("Access-Control-Allow-Origin", "*")
    resp.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
    resp.headers.set("Access-Control-Allow-Headers", "Content-Type")
    return resp
}

const response = NextResponse.json({ answer: text })
response.headers.set("Access-Control-Allow-Origin", "*")
response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
response.headers.set("Access-Control-Allow-Headers", "Content-Type")
return response

    } catch (error) {
 const response= NextResponse.json(
                { message:`chat error ${error}` },
                { status: 500 }
            )
  response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return response
    }
}

export const OPTIONS=async ()=>{
   return NextResponse.json(null,{
status:201,
headers:{
     "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
}
   })
}