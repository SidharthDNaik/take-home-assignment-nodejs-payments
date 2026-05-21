// src/app.ts
import Fastify, { type FastifyInstance } from "fastify"
import { toApiErrorShape } from "./lib/errors.js"
import { registerCommissionRoutes } from "./routes/commissions.js"

export type BuildAppOptions = {
  logger?: boolean
}

export function buildApp(opts: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: opts.logger ?? true,
  })

  // Simple healthcheck (nice for docker + sanity)
  app.get("/health", async () => ({ ok: true }))

  // Routes
  app.register(registerCommissionRoutes, { prefix: "/api/v1" })

  // Global error handler (last)
  app.setErrorHandler((err, req, reply) => {
    // (Optional) log unexpected errors; Fastify will also log depending on logger config
    // req.log.error({ err }, "request failed")

    const { statusCode, body } = toApiErrorShape(err)
    reply.status(statusCode).send(body)
  })

  return app
}