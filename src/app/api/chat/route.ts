import { supabase } from "@/lib/db";
import { SETTINGS_TABLE } from "@/model/settings.model";
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const addCors = (res: NextResponse) => {
    // For testing allow all origins. In production set a specific origin.
    res.headers.set("Access-Control-Allow-Origin", "*")
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    res.headers.set("Access-Control-Allow-Headers", "Content-Type")
    return res
}

export async function POST(req: NextRequest) {
    try {
        const { message, ownerId } = await req.json()
        if (!message || !ownerId) {
            const r = NextResponse.json(
                { message: "message and owner id is required" },
                { status: 400 }
            )
            return addCors(r)
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
            return addCors(response)
        }
        if (!setting) {
            const r = NextResponse.json(
                { message: "chat bot is not configured yet." },
                { status: 400 }
            )
            return addCors(r)
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
    return addCors(resp)
}

const ai = new GoogleGenAI({ apiKey })
let genResult: any
try {
    genResult = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt })
} catch (genErr: any) {
    console.error("Gemini generate error:", genErr)
    const resp = NextResponse.json({ message: `AI generation error: ${genErr?.message || genErr}` }, { status: 500 })
    return addCors(resp)
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

// Normalize text when SDK returns structured object
if (text && typeof text === "object") {
    try {
        // common shape: { parts: [{ text: '...' }], role: 'model' }
        if (Array.isArray(text.parts)) {
            text = text.parts.map((p: any) => p?.text || p?.content || JSON.stringify(p)).join("\n")
        } else {
            // try to stringify
            text = JSON.stringify(text)
        }
    } catch (e) {
        console.error("Failed to normalize AI text object", e, text)
        text = String(text)
    }
}

if (!text) {
    console.warn("Gemini returned no text", genResult)
    const resp = NextResponse.json({ message: "AI returned no text", raw: genResult }, { status: 502 })
    return addCors(resp)
}

const response = NextResponse.json({ answer: text })
return addCors(response)

    } catch (error) {
    const response= NextResponse.json(
                { message:`chat error ${error}` },
                { status: 500 }
            )
    return addCors(response)
    }
}

export const OPTIONS=async ()=>{
     const res = NextResponse.json(null, { status: 204 })
     return addCors(res)
}