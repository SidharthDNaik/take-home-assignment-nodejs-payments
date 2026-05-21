// test/unit/errors.test.ts
import { describe, it, expect } from "vitest"
import { ApiError, toApiErrorShape } from "../../../src/lib/errors.js" // adjust path if needed

describe("ApiError", () => {
  it("sets statusCode/code/message/details", () => {
    const err = new ApiError({
      statusCode: 400,
      code: "bad_request",
      message: "Invalid query parameters",
      details: { field: "team_id" },
    })

    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.message).toBe("Invalid query parameters")
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe("bad_request")
    expect(err.details).toEqual({ field: "team_id" })
  })

  it("details is optional", () => {
    const err = new ApiError({
      statusCode: 404,
      code: "not_found",
      message: "No such resource",
    })

    expect(err.details).toBeUndefined()
  })
})

describe("toApiErrorShape", () => {
  it("converts ApiError to {statusCode, body} including details", () => {
    const err = new ApiError({
      statusCode: 422,
      code: "validation_error",
      message: "Bad input",
      details: { foo: "bar" },
    })

    expect(toApiErrorShape(err)).toEqual({
      statusCode: 422,
      body: {
        code: "validation_error",
        message: "Bad input",
        details: { foo: "bar" },
      },
    })
  })

  it("converts ApiError to {statusCode, body} without details when undefined", () => {
    const err = new ApiError({
      statusCode: 401,
      code: "unauthorized",
      message: "Missing auth",
    })

    expect(toApiErrorShape(err)).toEqual({
      statusCode: 401,
      body: {
        code: "unauthorized",
        message: "Missing auth",
        details: undefined,
      },
    })
  })

  it("returns fallback for non-ApiError (does not leak message)", () => {
    const err = new Error("db exploded")
    expect(toApiErrorShape(err)).toEqual({
      statusCode: 500,
      body: { code: "internal_error", message: "Internal server error" },
    })
  })

  it("returns fallback for arbitrary values", () => {
    expect(toApiErrorShape("oops")).toEqual({
      statusCode: 500,
      body: { code: "internal_error", message: "Internal server error" },
    })
    expect(toApiErrorShape(null)).toEqual({
      statusCode: 500,
      body: { code: "internal_error", message: "Internal server error" },
    })
  })
})