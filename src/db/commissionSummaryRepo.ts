import { pool } from "./pool.js"
import type { CommissionStatus } from "./commissionDetailsRepo.js"

export type PartyType = "team_member" | "external_agent" | "brokerage"

export type SummaryFilters = {
  after: string // YYYY-MM-DD
  before: string // YYYY-MM-DD
  teamId?: string | null // null => all teams
}

export type SummaryTotalsRow = {
  num_commissions: number
  total_gci_cents: string
}

export type SummaryByStatusRow = {
  status: CommissionStatus
  count: number
  total_gci_cents: string
}

export type SummaryByPartyTypeRow = {
  party_type: PartyType
  count: number
  total_amount_cents: string
}

/**
 * Overall totals (count of commissions + sum of commission totals).
 * Uses commissions table only.
 */
export async function getSummaryTotals(
  f: SummaryFilters,
): Promise<SummaryTotalsRow> {
  const sql = `
    SELECT
      COUNT(*)::int AS num_commissions,
      COALESCE(SUM(c.total_cents), 0)::bigint::text AS total_gci_cents
    FROM commissions c
    WHERE c.close_date >= $1::date
      AND c.close_date <= $2::date
      AND ($3::uuid IS NULL OR c.team_id = $3::uuid)
  `

  const params = [
    f.after,
    f.before,
    f.teamId ?? null,
  ] as const

  const result = await pool.query<SummaryTotalsRow>(sql, params as unknown as any[])
  // COUNT always returns one row, but keep a safe fallback:
  return result.rows[0] ?? { num_commissions: 0, total_gci_cents: "0" }
}

/**
 * Breakdown by commission status.
 * Uses commissions table only (avoids allocation join double-counting totals).
 */
export async function getSummaryByStatus(
  f: SummaryFilters,
): Promise<SummaryByStatusRow[]> {
  const sql = `
    SELECT
      c.status,
      COUNT(*)::int AS count,
      COALESCE(SUM(c.total_cents), 0)::bigint::text AS total_gci_cents
    FROM commissions c
    WHERE c.close_date >= $1::date
      AND c.close_date <= $2::date
      AND ($3::uuid IS NULL OR c.team_id = $3::uuid)
    GROUP BY c.status
  `

  const params = [
    f.after,
    f.before,
    f.teamId ?? null,
  ] as const

  const result = await pool.query<SummaryByStatusRow>(sql, params as unknown as any[])
  return result.rows
}

/**
 * Breakdown by allocation party_type.
 * Joins allocations so totals represent allocation amounts.
 */
export async function getSummaryByPartyType(
  f: SummaryFilters,
): Promise<SummaryByPartyTypeRow[]> {
  const sql = `
    SELECT
      a.party_type,
      COUNT(*)::int AS count,
      COALESCE(SUM(a.amount_cents), 0)::bigint::text AS total_amount_cents
    FROM commissions c
    JOIN allocations a ON a.commission_id = c.id
    WHERE c.close_date >= $1::date
      AND c.close_date <= $2::date
      AND ($3::uuid IS NULL OR c.team_id = $3::uuid)
    GROUP BY a.party_type
  `

  const params = [
    f.after,
    f.before,
    f.teamId ?? null,
  ] as const

  const result = await pool.query<SummaryByPartyTypeRow>(sql, params as unknown as any[])
  return result.rows
}