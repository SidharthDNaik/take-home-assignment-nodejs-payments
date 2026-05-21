// src/routes/commissions.ts
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { ApiError } from "../lib/errors.js"
import { getCommissionDetails } from "../services/commissionDetailsService.js"
import { getPeriodSummary } from "../services/commissionSummaryService.js"

export async function registerCommissionRoutes(app: FastifyInstance) {
  const dateParam = z
    .string()
    .trim()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" })
    .transform((s) => {
      const d = new Date(s)
      const yyyy = d.getUTCFullYear()
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
      const dd = String(d.getUTCDate()).padStart(2, "0")
      return `${yyyy}-${mm}-${dd}`
    })

  const statusEnum = z.enum(["draft", "pending_approval", "approved", "finalized"])

  // -----------------------------
  // /commissions/summary
  // -----------------------------
  const summaryQuerySchema = z
    .object({
      team_id: z.string().uuid().optional(), // optional => all teams
      after: dateParam.optional(),
      before: dateParam.optional(),
    })
    .superRefine((val, ctx) => {
      if (val.after && val.before && val.after > val.before) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "`after` must be <= `before`",
          path: ["after"],
        })
      }
    })

  app.get("/commissions/summary", async (req) => {
    const parsed = summaryQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ApiError({
        statusCode: 400,
        code: "bad_request",
        message: "Invalid query parameters",
        details: parsed.error.flatten(),
      })
    }

    const { team_id, after, before } = parsed.data

    const result = await getPeriodSummary({
      ...(team_id !== undefined ? { team_id } : {}),
      ...(after !== undefined ? { after } : {}),
      ...(before !== undefined ? { before } : {}),
    })

    return result
  })

  // -----------------------------
  // /commissions/details
  // -----------------------------
  const detailsQuerySchema = z
    .object({
      team_id: z.string().uuid(),
      status: statusEnum.optional(),
      after: dateParam.optional(),
      before: dateParam.optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      cursor: z.string().optional(),
    })
    .superRefine((val, ctx) => {
      if (val.after && val.before && val.after > val.before) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "`after` must be <= `before`",
          path: ["after"],
        })
      }
    })

  app.get("/commissions/details", async (req) => {
    const parsed = detailsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ApiError({
        statusCode: 400,
        code: "bad_request",
        message: "Invalid query parameters",
        details: parsed.error.flatten(),
      })
    }

    const { team_id, status, after, before, limit, cursor } = parsed.data

    const result = await getCommissionDetails({
      team_id,
      ...(status !== undefined ? { status } : {}),
      ...(after !== undefined ? { after } : {}),
      ...(before !== undefined ? { before } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(cursor !== undefined ? { cursor } : {}),
    })

    return result
  })
}