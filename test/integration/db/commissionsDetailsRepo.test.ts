import { describe, it, expect } from "vitest"
import {
  listCommissions,
  listAllocationsByCommissionIds,
  type CommissionCursor,
} from "../../../src/db/commissionDetailsRepo.js" // adjust path/name to your actual file
import {
    toUtcDateString
} from "../../../src/lib/helpers.js"

const TEAM_ALPHA = "a1a1a1a1-0000-4000-8000-000000000001"

describe("commissionsDetailsRepo (integration)", () => {
  it("listCommissions returns team commissions in date range ordered desc", async () => {
    const rows = await listCommissions({
      teamId: TEAM_ALPHA,
      status: "finalized",
      after: "2025-03-01",
      before: "2025-03-31",
      limit: 50,
    })

    // From seed: team_alpha finalized in March are C12 (3/12) and C11 (3/05)
    expect(rows.map((r) => r.id)).toEqual([
      "10000000-0000-4000-8000-000000000012",
      "10000000-0000-4000-8000-000000000011",
    ])

    const ymd = (d: Date) => d.toISOString().slice(0, 10)

    expect(ymd(rows[0]!.close_date as unknown as Date)).toBe("2025-03-12")
    expect(ymd(rows[1]!.close_date as unknown as Date)).toBe("2025-03-05")
  })

  it("listCommissions cursor paginates using (close_date, id)", async () => {
    // First page: limit 1
    const page1 = await listCommissions({
      teamId: TEAM_ALPHA,
      status: "finalized",
      after: "2025-03-01",
      before: "2025-03-31",
      limit: 1,
    })

    expect(page1).toHaveLength(1)
    expect(page1[0]!.id).toBe("10000000-0000-4000-8000-000000000012")

    // Cursor should be based on last row of previous page
    const cursor: CommissionCursor = {
      close_date: page1[0]!.close_date,
      id: page1[0]!.id,
    }

    const page2 = await listCommissions({
      teamId: TEAM_ALPHA,
      status: "finalized",
      after: "2025-03-01",
      before: "2025-03-31",
      limit: 10,
      cursor,
    })

    expect(page2.map((r) => r.id)).toEqual([
      "10000000-0000-4000-8000-000000000011",
    ])
  })

  it("listAllocationsByCommissionIds returns allocations for multiple commissions", async () => {
    const commissionIds = [
      "10000000-0000-4000-8000-000000000011", // has 3 allocations
      "10000000-0000-4000-8000-000000000012", // has 2 allocations
    ]

    const allocs = await listAllocationsByCommissionIds(commissionIds)

    // 3 + 2 = 5 allocations total for those commissions
    expect(allocs).toHaveLength(5)

    // Ensure all allocations belong to one of the requested commissions
    const allocCommissionIds = new Set(allocs.map((a) => a.commission_id))
    expect(allocCommissionIds).toEqual(new Set(commissionIds))
  })

  it("listAllocationsByCommissionIds returns [] for empty input", async () => {
    const allocs = await listAllocationsByCommissionIds([])
    expect(allocs).toEqual([])
  })
})