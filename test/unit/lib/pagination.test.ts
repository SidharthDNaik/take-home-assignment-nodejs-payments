// test/unit/pagination.test.ts
import { describe, it, expect } from "vitest"
import {
  encodeCursor,
  decodeCursor,
  type CommissionCursor,
} from "../../../src/lib/pagination.js" // adjust path if needed

describe("cursor encoding/decoding", () => {
  it("round-trips a cursor (encode -> decode)", () => {
    const c: CommissionCursor = {
      close_date: "2025-03-12",
      id: "10000000-0000-4000-8000-000000000012",
    }

    const encoded = encodeCursor(c)
    const decoded = decodeCursor(encoded)

    expect(decoded).toEqual(c)
  })

  it("produces a base64url string (no + / = characters)", () => {
    const c: CommissionCursor = { close_date: "2025-03-12", id: "abc" }
    const encoded = encodeCursor(c)

    expect(encoded).not.toMatch(/[+/=]/)
    expect(encoded.length).toBeGreaterThan(0)
  })

  it("throws 'Invalid cursor' for non-base64url input", () => {
    expect(() => decodeCursor("not base64 !!!")).toThrowError("Invalid cursor")
  })

  it("throws 'Invalid cursor' for base64url that is not JSON", () => {
    // base64url for the string "hello"
    const raw = Buffer.from("hello", "utf8").toString("base64url")
    expect(() => decodeCursor(raw)).toThrowError("Invalid cursor")
  })

  it("throws 'Invalid cursor' when required fields are missing", () => {
    const raw = Buffer.from(JSON.stringify({ id: "x" }), "utf8").toString("base64url")
    expect(() => decodeCursor(raw)).toThrowError("Invalid cursor")
  })

  it("throws 'Invalid cursor' when fields are wrong types", () => {
    const raw1 = Buffer.from(JSON.stringify({ close_date: 123, id: "x" }), "utf8").toString("base64url")
    expect(() => decodeCursor(raw1)).toThrowError("Invalid cursor")

    const raw2 = Buffer.from(JSON.stringify({ close_date: "2025-03-12", id: 999 }), "utf8").toString("base64url")
    expect(() => decodeCursor(raw2)).toThrowError("Invalid cursor")
  })
})