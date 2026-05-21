// src/db/pool.ts
import pg from "pg"
const { Pool } = pg

function envInt(name: string, fallback: number): number {
  const v = process.env[name]
  if (!v) return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${name}: ${v}`)
  return n
}

function requiredEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export const pool = new Pool({
  host: process.env.PGHOST ?? "localhost",
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? "commissions",
  password: process.env.PGPASSWORD ?? "commissions",
  database: process.env.PGDATABASE ?? "commissions",
})

export async function closePool(): Promise<void> {
  await pool.end()
}