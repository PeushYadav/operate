import { NextResponse } from "next/server";
import { groq } from "@/app/lib/ai/groq";
import { templates } from "@/app/lib/os/isoTemplates";
import type {
  RecommendRequest,
  RecommendSuccess,
} from "@/app/lib/os/types";

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: RecommendRequest;
  try {
    body = (await req.json()) as RecommendRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.prompt && !body.purpose) {
    return NextResponse.json(
      { error: "Provide either `prompt` or `purpose`" },
      { status: 400 },
    );
  }

  const systemPrompt = `You are Operate's Linux distro architect. You design custom Arch Linux ISOs by selecting the nearest-neighbor template from a library and then mutating it to match the user.

You will be given:
- The user's requirements (free-form prompt and/or structured form fields).
- A library of base templates, each already containing a validated config.

Your job:
1. Pick the single closest template by purpose. Explain the match in one short sentence.
2. Mutate that template's config to fit the user's specific needs: add/remove packages, switch desktop/kernel/bootloader, toggle GPU drivers, adjust services.
3. Produce a config that an automated archiso build pipeline can consume directly — every field must be a real, current Arch Linux package name (official repos preferred; AUR packages go in aurPackages). Do NOT invent package names. Prefer meta-packages (e.g. "gnome", "plasma-meta", "xfce4") over enumerating dozens of sub-packages.

GPU rules:
- If the user mentions NVIDIA or implies an NVIDIA GPU, include "nvidia" + "nvidia-utils" + "lib32-nvidia-utils".
- If AMD, include "mesa" + "lib32-mesa" + "vulkan-radeon" + "lib32-vulkan-radeon".
- If Intel iGPU, include "mesa" + "lib32-mesa" + "vulkan-intel".
- If unsure but GPU support is requested, default to AMD/Intel open stack.

Experience rules:
- Beginner → desktop = "gnome" or "kde", bootloader = "systemd-boot", include a graphical login manager (gdm/sddm) and its service.
- Advanced → tiling WM (i3/hyprland/sway) is acceptable, fewer GUI defaults.

Always include: "base", "linux-firmware", "networkmanager", "sudo", "nano", and the chosen kernel package in packages. Always include "NetworkManager" in services. Always include a display-manager service if a graphical desktop is selected.

Hostname/username must be lowercase, alphanumeric or hyphen, ≤ 32 chars. Default hostname "operate", default username "operator" unless the user specifies otherwise.

postInstall is an array of bash commands that will run inside the live system's airootfs customize hook (as root). Use it for things like enabling extra repos, writing config files, or creating the user. Keep it minimal and idempotent. Do not include "systemctl enable" for services already listed in "services" — the pipeline handles those.

Return ONLY valid JSON matching this exact shape (no markdown, no commentary):
{
  "selected_template": string,
  "reason": string,
  "config": {
    "base": "arch",
    "desktop": string,
    "kernel": "linux" | "linux-lts" | "linux-zen" | "linux-hardened",
    "bootloader": "systemd-boot" | "grub",
    "hostname": string,
    "username": string,
    "locale": string,
    "timezone": string,
    "keymap": string,
    "packages": string[],
    "aurPackages": string[],
    "services": string[],
    "postInstall": string[]
  }
}`;

  const userPrompt = `User requirements:
${JSON.stringify(body, null, 2)}

Template library:
${JSON.stringify(templates, null, 2)}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as RecommendSuccess;

    if (
      !parsed.config?.base ||
      !parsed.config?.packages?.length ||
      !parsed.config?.hostname ||
      !parsed.config?.username
    ) {
      return NextResponse.json(
        { error: "LLM returned an incomplete config", raw },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate recommendation", details: String(err) },
      { status: 502 },
    );
  }
}
