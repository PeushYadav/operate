import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
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
  if (job.status !== "done" || !job.isoPath) {
    return NextResponse.json(
      { error: `Job is ${job.status}, ISO not ready` },
      { status: 409 },
    );
  }

  const size = statSync(job.isoPath).size;
  const nodeStream = createReadStream(job.isoPath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/x-iso9660-image",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${job.isoName ?? "operate.iso"}"`,
    },
  });
}
