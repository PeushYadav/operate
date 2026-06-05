import Navbar from "../components/navbar";
import { auth } from "@/auth";
import { listBuildsForUser } from "@/app/lib/db/builds";
import HelpClient from "./help-client";

export default async function HelpPage() {
  const session = await auth();
  const builds = session?.user?.id
    ? await listBuildsForUser(session.user.id)
    : [];

  const summaries = builds.map((b) => ({
    id: b.id,
    hostname: b.hostname,
    status: b.status,
    createdAt: b.created_at,
    packageCount: Array.isArray(b.config?.packages)
      ? b.config.packages.length
      : 0,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      <HelpClient builds={summaries} />
    </div>
  );
}
