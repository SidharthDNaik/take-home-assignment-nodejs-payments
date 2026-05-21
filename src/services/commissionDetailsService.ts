import { ApiError } from "../lib/errors.js"
import { decodeCursor, encodeCursor } from "../lib/pagination.js"
import {
  listAllocationsByCommissionIds,
  listCommissions,
  type AllocationRow,
  type CommissionCursor,
  type CommissionRow,
  type CommissionStatus,
} from "../db/commissionDetailsRepo.js"
import { toUtcDateString, addDaysUtc } from "../lib/helpers.js"

export type ListCommissionDetailsInput = {
  team_id: string
  status?: CommissionStatus
  after?: string // 'YYYY-MM-DD' (already normalized by route)
  before?: string // 'YYYY-MM-DD'
  limit?: number
  cursor?: string
}

export type CommissionWithAllocations = CommissionRow & {
  allocations: AllocationRow[]
}

export type ListCommissionDetailsResult = {
  data: CommissionWithAllocations[]
  next_cursor: string | null
}

export async function getCommissionDetails(
  input: ListCommissionDetailsInput,
): Promise<ListCommissionDetailsResult> {
  const status: CommissionStatus = input.status ?? "finalized"
  const limit = input.limit ?? 10

  const now = new Date()
  const before = input.before ?? toUtcDateString(now)
  const after = input.after ?? toUtcDateString(addDaysUtc(now, -30))

  let cursor: CommissionCursor | null = null
  if (input.cursor) {
    try {
      cursor = decodeCursor(input.cursor) // expects { close_date, id }
    } catch {
      throw new ApiError({
        statusCode: 400,
        code: "bad_request",
        message: "Invalid cursor",
      })
    }
  }

  const commissions = await listCommissions({
    teamId: input.team_id,
    status,
    after,
    before,
    limit,
    cursor,
  })

  const commissionIds = commissions.map((c) => c.id)
  const allocations = await listAllocationsByCommissionIds(commissionIds)

  // group allocations by commission_id
  const allocByCommissionId = new Map<string, AllocationRow[]>()
  for (const a of allocations) {
    const arr = allocByCommissionId.get(a.commission_id) ?? []
    arr.push(a)
    allocByCommissionId.set(a.commission_id, arr)
  }

  const data: CommissionWithAllocations[] = commissions.map((c) => ({
    ...c,
    allocations: allocByCommissionId.get(c.id) ?? [],
  }))

  const next_cursor =
    commissions.length === 0
      ? null
      : encodeCursor({
          close_date: commissions[commissions.length - 1]!.close_date,
          id: commissions[commissions.length - 1]!.id,
        })

  return { data, next_cursor }
}