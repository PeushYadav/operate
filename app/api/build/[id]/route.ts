import { NextResponse } from "next/server";
import { getJob } from "@/app/lib/os/buildIso";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: job.id,
    status: job.status,
    log: job.log,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    // server clock, so the client can show elapsed time without trusting
    // (or polling) its own clock
    now: Date.now(),
    isoName: job.isoName,
    error: job.error,
  });
}
