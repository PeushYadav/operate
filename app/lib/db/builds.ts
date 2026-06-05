import { pool } from "./index";
import type { BuildStatus, OsConfig } from "../os/types";

export type BuildRow = {
  id: string;
  user_id: string;
  hostname: string;
  config: OsConfig;
  iso_name: string | null;
  status: BuildStatus;
  created_at: string;
};

export async function createBuild(input: {
  userId: string;
  hostname: string;
  config: OsConfig;
}): Promise<{ id: string }> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO builds (user_id, hostname, config, status)
     VALUES ($1, $2, $3, 'queued')
     RETURNING id`,
    [input.userId, input.hostname, input.config],
  );
  return rows[0];
}

export async function updateBuildStatus(input: {
  id: string;
  status: BuildStatus;
  isoName?: string | null;
}): Promise<void> {
  await pool.query(
    `UPDATE builds
       SET status = $2,
           iso_name = COALESCE($3, iso_name)
     WHERE id = $1`,
    [input.id, input.status, input.isoName ?? null],
  );
}

export async function listBuildsForUser(userId: string): Promise<BuildRow[]> {
  const { rows } = await pool.query<BuildRow>(
    `SELECT id, user_id, hostname, config, iso_name, status, created_at
       FROM builds
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}

export async function getBuildForUser(input: {
  id: string;
  userId: string;
}): Promise<BuildRow | null> {
  const { rows } = await pool.query<BuildRow>(
    `SELECT id, user_id, hostname, config, iso_name, status, created_at
       FROM builds
      WHERE id = $1 AND user_id = $2`,
    [input.id, input.userId],
  );
  return rows[0] ?? null;
}
