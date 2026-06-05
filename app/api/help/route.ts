import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { groq } from "@/app/lib/ai/groq";
import { getBuildForUser } from "@/app/lib/db/builds";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { buildId?: string; question?: string };
  try {
    body = (await req.json()) as { buildId?: string; question?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const buildId = body.buildId?.trim();
  const question = body.question?.trim();
  if (!buildId || !question) {
    return NextResponse.json(
      { error: "buildId and question are required" },
      { status: 400 },
    );
  }

  const build = await getBuildForUser({ id: buildId, userId: session.user.id });
  if (!build) {
    return NextResponse.json({ error: "Build not found" }, { status: 404 });
  }

  const cfg = build.config;
  const packageList = (cfg.packages ?? []).join(", ") || "(none)";

  const systemPrompt = `You are Operate's help assistant for a custom Arch-based Linux ISO the user built.

Their installed packages are:
${packageList}

Desktop: ${cfg.desktop || "(unspecified)"}
Kernel: ${cfg.kernel || "(unspecified)"}
Hostname: ${cfg.hostname || "(unspecified)"}

Answer the user's question assuming these (and standard baseline Arch utilities like systemd, pacman, bash, coreutils) are the only tools available. If a needed tool is missing, suggest installing it with \`pacman -S <name>\` (official repo) or note if it is AUR-only. Keep answers concise, terminal-friendly, and Arch-Linux-specific. Prefer command-line examples in fenced code blocks.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    });

    const answer = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ answer });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to generate help response",
        details: String(err),
      },
      { status: 502 },
    );
  }
}
