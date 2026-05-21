// test/unit/helpers.test.ts
import { describe, it, expect } from "vitest"
import { toUtcDateString, addDaysUtc } from "../../../src/lib/helpers.js" // adjust path if needed

describe("toUtcDateString", () => {
  it("formats a UTC date as YYYY-MM-DD", () => {
    const d = new Date("2025-03-12T07:00:00.000Z")
    expect(toUtcDateString(d)).toBe("2025-03-12")
  })

  it("zero-pads month and day", () => {
    const d = new Date("2025-01-05T00:00:00.000Z")
    expect(toUtcDateString(d)).toBe("2025-01-05")
  })

  it("uses UTC fields (not local timezone)", () => {
    // This instant is Feb 29 in UTC; in some local timezones it may be Feb 28.
    const d = new Date("2024-02-29T00:30:00.000Z")
    expect(toUtcDateString(d)).toBe("2024-02-29")
  })
})

describe("addDaysUtc", () => {
  it("adds positive days in UTC", () => {
    const base = new Date("2025-03-01T00:00:00.000Z")
    const out = addDaysUtc(base, 10)

    expect(toUtcDateString(out)).toBe("2025-03-11")
  })

  it("adds negative days in UTC", () => {
    const base = new Date("2025-03-01T00:00:00.000Z")
    const out = addDaysUtc(base, -1)

    expect(toUtcDateString(out)).toBe("2025-02-28")
  })

  it("handles month rollover", () => {
    const base = new Date("2025-01-31T00:00:00.000Z")
    const out = addDaysUtc(base, 1)

    expect(toUtcDateString(out)).toBe("2025-02-01")
  })

  it("handles leap day rollover", () => {
    const base = new Date("2024-02-28T00:00:00.000Z")
    expect(toUtcDateString(addDaysUtc(base, 1))).toBe("2024-02-29")
    expect(toUtcDateString(addDaysUtc(base, 2))).toBe("2024-03-01")
  })

  it("does not mutate the input Date", () => {
    const base = new Date("2025-03-01T00:00:00.000Z")
    const baseIso = base.toISOString()

    addDaysUtc(base, 5)
    expect(base.toISOString()).toBe(baseIso)
  })
})