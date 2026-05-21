import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../../src/app.js" // adjust if your export/path differs

const TEAM_ALPHA = "a1a1a1a1-0000-4000-8000-000000000001"

describe("commissions routes (HTTP integration)", () => {
  const app = buildApp({ logger: false })

  beforeAll(async () => {
    // Ensures plugins/routes are ready before inject
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it("GET /api/v1/commissions/summary returns March 2025 totals (all teams)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/commissions/summary?after=2025-03-01&before=2025-03-31",
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()

    expect(body).toMatchObject({
      period: { after: "2025-03-01", before: "2025-03-31" },
      team_id: null,
      num_commissions: 9,
      total_gci_cents: "5220000",
    })

    // By status buckets (service should zero-fill, but March has all statuses)
    expect(body.by_status).toMatchObject({
      draft: { count: 2, total_cents: "650000" },
      pending_approval: { count: 1, total_cents: "400000" },
      approved: { count: 2, total_cents: "930000" },
      finalized: { count: 4, total_cents: "3240000" },
    })

    // By party type buckets
    expect(body.by_party_type).toMatchObject({
      team_member: { count: 9, total_cents: "2815500" },
      external_agent: { count: 5, total_cents: "1051000" },
      brokerage: { count: 9, total_cents: "1353500" },
    })
  })

  it("GET /api/v1/commissions/summary returns March 2025 totals (team_alpha)", async () => {
    const res = await app.inject({
      method: "GET",
      url:
        "/api/v1/commissions/summary" +
        `?team_id=${TEAM_ALPHA}` +
        "&after=2025-03-01&before=2025-03-31",
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()

    expect(body).toMatchObject({
      period: { after: "2025-03-01", before: "2025-03-31" },
      team_id: TEAM_ALPHA,
      num_commissions: 5,
      total_gci_cents: "2850000",
    })

    expect(body.by_status).toMatchObject({
      draft: { count: 1, total_cents: "430000" },
      pending_approval: { count: 1, total_cents: "400000" },
      approved: { count: 1, total_cents: "550000" },
      finalized: { count: 2, total_cents: "1470000" },
    })

    expect(body.by_party_type).toMatchObject({
      team_member: { count: 5, total_cents: "1548500" },
      external_agent: { count: 3, total_cents: "520000" },
      brokerage: { count: 5, total_cents: "781500" },
    })
  })

  it("GET /api/v1/commissions/details returns paginated commissions with allocations", async () => {
    const res = await app.inject({
      method: "GET",
      url:
        "/api/v1/commissions/details" +
        `?team_id=${TEAM_ALPHA}` +
        "&status=finalized" +
        "&after=2025-03-01&before=2025-03-31" +
        "&limit=50",
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()

    expect(body).toHaveProperty("data")
    expect(Array.isArray(body.data)).toBe(true)

    // From seed: team_alpha finalized in March => C12 then C11 (ordered by close_date desc, id desc)
    expect(body.data.map((c: any) => c.id)).toEqual([
      "10000000-0000-4000-8000-000000000012",
      "10000000-0000-4000-8000-000000000011",
    ])

    // Verify allocations are embedded (no N+1 at API level)
    expect(body.data[0]).toHaveProperty("allocations")
    expect(Array.isArray(body.data[0].allocations)).toBe(true)

    // C12 has 2 allocations, C11 has 3 allocations in the seed
    const c12 = body.data[0]
    const c11 = body.data[1]
    expect(c12.allocations).toHaveLength(2)
    expect(c11.allocations).toHaveLength(3)

    // next_cursor should be present (since results exist)
    expect(body).toHaveProperty("next_cursor")
    expect(typeof body.next_cursor === "string" || body.next_cursor === null).toBe(true)
  })

  it("GET /api/v1/commissions/summary returns 400 when after > before", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/commissions/summary?after=2025-04-01&before=2025-03-01",
    })

    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body).toMatchObject({
      code: "bad_request",
      message: "Invalid query parameters",
    })
  })
})