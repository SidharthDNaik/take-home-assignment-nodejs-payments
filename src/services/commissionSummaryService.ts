import type { CommissionStatus } from "../db/commissionDetailsRepo.js"
import {
  getSummaryByPartyType,
  getSummaryByStatus,
  getSummaryTotals,
} from "../db/commissionSummaryRepo.js"
import { toUtcDateString, addDaysUtc } from "../lib/helpers.js"

type PartyType = "team_member" | "external_agent" | "brokerage"

export type GetSummaryInput = {
  team_id?: string // optional => all teams
  after?: string // YYYY-MM-DD
  before?: string // YYYY-MM-DD
}

export type SummaryBucket = { count: number; total_cents: string }

export type GetSummaryResult = {
  period: { after: string; before: string }
  team_id: string | null
  num_commissions: number
  total_gci_cents: string
  by_status: Record<CommissionStatus, SummaryBucket>
  by_party_type: Record<PartyType, SummaryBucket>
}

const ALL_STATUSES: CommissionStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "finalized",
]

const ALL_PARTY_TYPES: PartyType[] = [
  "team_member",
  "external_agent",
  "brokerage",
]

export async function getPeriodSummary(
  input: GetSummaryInput,
): Promise<GetSummaryResult> {
  // Defaults: last 30 days inclusive
  const now = new Date()
  const before = input.before ?? toUtcDateString(now)
  const after = input.after ?? toUtcDateString(addDaysUtc(now, -30))

  const teamIdOrNull = input.team_id ?? null

  const totals = await getSummaryTotals({
    after,
    before,
    teamId: teamIdOrNull,
  })

  const byStatusRows = await getSummaryByStatus({
    after,
    before,
    teamId: teamIdOrNull,
  })

  const byPartyRows = await getSummaryByPartyType({
    after,
    before,
    teamId: teamIdOrNull,
  })

  // Zero-filled status buckets
  const by_status = Object.fromEntries(
    ALL_STATUSES.map((s) => [s, { count: 0, total_cents: "0" }]),
  ) as Record<CommissionStatus, SummaryBucket>

  for (const r of byStatusRows) {
    by_status[r.status] = { count: r.count, total_cents: r.total_gci_cents }
  }

  // Zero-filled party buckets
  const by_party_type = Object.fromEntries(
    ALL_PARTY_TYPES.map((p) => [p, { count: 0, total_cents: "0" }]),
  ) as Record<PartyType, SummaryBucket>

  for (const r of byPartyRows) {
    by_party_type[r.party_type] = {
      count: r.count,
      total_cents: r.total_amount_cents,
    }
  }

  return {
    period: { after, before },
    team_id: teamIdOrNull,
    num_commissions: totals.num_commissions,
    total_gci_cents: totals.total_gci_cents,
    by_status,
    by_party_type,
  }
}