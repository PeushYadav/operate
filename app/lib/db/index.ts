import { Pool } from "@neondatabase/serverless"

const connectionString =
  process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL (or STORAGE_DATABASE_URL) is not set")
}

export const pool = new Pool({ connectionString })
