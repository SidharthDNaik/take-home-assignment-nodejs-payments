import { pool } from "./pool.js"

export type CommissionStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "finalized"

export type CommissionRow = {
  id: string
  team_id: string
  status: CommissionStatus
  close_date: string // pg returns DATE as string 'YYYY-MM-DD'
  total_cents: string // BIGINT comes back as string by default
  currency: string
  created_at: string
  updated_at: string
}

export type AllocationRow = {
  id: string
  commission_id: string
  party_id: string
  party_type: "team_member" | "external_agent" | "brokerage"
  percentage: string // NUMERIC comes back as string
  amount_cents: string // BIGINT as string
  created_at: string
}

export type CommissionCursor = { close_date: string; id: string }

export type ListCommissionsArgs = {
  teamId: string
  status: CommissionStatus
  after: string // 'YYYY-MM-DD'
  before: string // 'YYYY-MM-DD'
  limit: number
  cursor?: CommissionCursor | null
}

export async function listCommissions(
  args: ListCommissionsArgs,
): Promise<CommissionRow[]> {
  const baseParams: unknown[] = [
    args.teamId,
    args.status,
    args.after,
    args.before,
  ]

  const hasCursor = Boolean(args.cursor)

  const cursorClause = hasCursor
    ? `AND (c.close_date, c.id) < ($5::date, $6::uuid)`
    : ""

  const limitParamPosition = hasCursor ? 7 : 5
  const params = hasCursor
    ? [...baseParams, args.cursor!.close_date, args.cursor!.id, args.limit]
    : [...baseParams, args.limit]

  const sql = `
    SELECT
      c.id,
      c.team_id,
      c.status,
      c.close_date,
      c.total_cents,
      c.currency,
      c.created_at,
      c.updated_at
    FROM commissions c
    WHERE c.team_id = $1::uuid
      AND c.status = $2::text
      AND c.close_date >= $3::date
      AND c.close_date <= $4::date
      ${cursorClause}
    ORDER BY c.close_date DESC, c.id DESC
    LIMIT $${limitParamPosition}::int
  `

  const result = await pool.query<CommissionRow>(sql, params)
  return result.rows
}

export async function listAllocationsByCommissionIds(
  commissionIds: string[],
): Promise<AllocationRow[]> {
  if (commissionIds.length === 0) return []

  const sql = `
    SELECT
      a.id,
      a.commission_id,
      a.party_id,
      a.party_type,
      a.percentage,
      a.amount_cents,
      a.created_at
    FROM allocations a
    WHERE a.commission_id = ANY($1::uuid[])
    ORDER BY a.commission_id ASC, a.created_at ASC, a.id ASC
  `

  const result = await pool.query<AllocationRow>(sql, [commissionIds])
  return result.rows
}