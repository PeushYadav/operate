import { NextResponse } from "next/server";
import { startBuild } from "@/app/lib/os/buildIso";
import type { OsConfig } from "@/app/lib/os/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let config: OsConfig;
  try {
    const body = await req.json();
    config = body.config as OsConfig;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!config?.packages?.length || !config?.hostname || !config?.kernel) {
    return NextResponse.json(
      { error: "config must include kernel, hostname, and packages" },
      { status: 400 },
    );
  }

  const job = await startBuild(config);
  return NextResponse.json({
    id: job.id,
    status: job.status,
    startedAt: job.startedAt,
  });
}
