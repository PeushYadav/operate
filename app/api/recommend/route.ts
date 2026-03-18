import { NextResponse } from "next/server";
import { groq } from "@/app/lib/ai/groq";        // ✅ updated path
import { templates } from "@/app/lib/os/isoTemplates"; // ✅ updated path

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const prompt = `
You are an expert Linux system designer.

User requirements:
${JSON.stringify(body)}

Available templates:
${JSON.stringify(templates)}

Tasks:
1. Identify the closest matching template
2. Modify it if needed
3. If user is unique → create a custom config

STRICT RULES:
- Return ONLY valid JSON
- No markdown
- No explanation text

FORMAT:
{
  "selected_template": "",
  "reason": "",
  "config": {
    "base": "",
    "desktop": "",
    "packages": [],
    "services": []
  }
}
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0].message.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        error: "Invalid JSON from LLM",
        raw,
      };
    }

    return NextResponse.json(parsed);

  } catch (err) {
    return NextResponse.json({
      error: "Server error",
      details: String(err),
    });
  }
}
