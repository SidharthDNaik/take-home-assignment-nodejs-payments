import { describe, it, expect } from "vitest"
import {
  getSummaryTotals,
  getSummaryByStatus,
  getSummaryByPartyType,
} from "../../../src/db/commissionSummaryRepo.js" // adjust path if needed

const TEAM_ALPHA = "a1a1a1a1-0000-4000-8000-000000000001"

function rowsToMap<T extends Record<string, any>>(
  rows: T[],
  key: keyof T,
): Map<string, T> {
  const m = new Map<string, T>()
  for (const r of rows) m.set(String(r[key]), r)
  return m
}

describe("commissionSummaryRepo (integration)", () => {
  it("getSummaryTotals returns March 2025 totals (all teams)", async () => {
    const totals = await getSummaryTotals({
      after: "2025-03-01",
      before: "2025-03-31",
      teamId: null,
    })

    expect(totals.num_commissions).toBe(9)
    expect(totals.total_gci_cents).toBe("5220000")
  })

  it("getSummaryByStatus returns March 2025 status breakdown (all teams)", async () => {
    const rows = await getSummaryByStatus({
      after: "2025-03-01",
      before: "2025-03-31",
      teamId: null,
    })

    const m = rowsToMap(rows, "status")

    expect(m.get("draft")).toMatchObject({
      status: "draft",
      count: 2,
      total_gci_cents: "650000",
    })
    expect(m.get("pending_approval")).toMatchObject({
      status: "pending_approval",
      count: 1,
      total_gci_cents: "400000",
    })
    expect(m.get("approved")).toMatchObject({
      status: "approved",
      count: 2,
      total_gci_cents: "930000",
    })
    expect(m.get("finalized")).toMatchObject({
      status: "finalized",
      count: 4,
      total_gci_cents: "3240000",
    })
  })

  it("getSummaryByPartyType returns March 2025 party breakdown (all teams)", async () => {
    const rows = await getSummaryByPartyType({
      after: "2025-03-01",
      before: "2025-03-31",
      teamId: null,
    })

    const m = rowsToMap(rows, "party_type")

    expect(m.get("team_member")).toMatchObject({
      party_type: "team_member",
      count: 9,
      total_amount_cents: "2815500",
    })
    expect(m.get("external_agent")).toMatchObject({
      party_type: "external_agent",
      count: 5,
      total_amount_cents: "1051000",
    })
    expect(m.get("brokerage")).toMatchObject({
      party_type: "brokerage",
      count: 9,
      total_amount_cents: "1353500",
    })
  })

  it("getSummaryTotals returns March 2025 totals (team_alpha)", async () => {
    const totals = await getSummaryTotals({
      after: "2025-03-01",
      before: "2025-03-31",
      teamId: TEAM_ALPHA,
    })

    expect(totals.num_commissions).toBe(5)
    expect(totals.total_gci_cents).toBe("2850000")
  })

  it("getSummaryByStatus returns Feb 2025 and omits draft row (repo-level)", async () => {
    const rows = await getSummaryByStatus({
      after: "2025-02-01",
      before: "2025-02-28",
      teamId: null,
    })

    // Repo returns only statuses that exist; service layer is responsible for zero-filling.
    const statuses = new Set(rows.map((r) => r.status))
    expect(statuses.has("draft")).toBe(false)
  })

  it("getSummaryTotals returns zeros for a period with no data", async () => {
    const totals = await getSummaryTotals({
      after: "2024-01-01",
      before: "2024-01-31",
      teamId: null,
    })

    expect(totals.num_commissions).toBe(0)
    expect(totals.total_gci_cents).toBe("0")
  })
})