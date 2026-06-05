import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { startBuild } from "@/app/lib/os/buildIso";
import { createBuild } from "@/app/lib/db/builds";
import type { OsConfig } from "@/app/lib/os/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

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

  const { id } = await createBuild({
    userId: session.user.id,
    hostname: config.hostname,
    config,
  });

  const job = await startBuild(config, id);

  return NextResponse.json({
    id: job.id,
    status: job.status,
    startedAt: job.startedAt,
  });
}
