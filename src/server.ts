// src/server.ts
import { buildApp } from "./app.js"

async function main() {
  const app = buildApp({ logger: true })

  const port = Number(process.env.PORT ?? 3000)
  const host = process.env.HOST ?? "0.0.0.0"

  try {
    await app.listen({ port, host })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

void main()