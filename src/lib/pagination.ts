export type CommissionCursor = { close_date: string; id: string }

export function encodeCursor(c: CommissionCursor): string {
    const json = JSON.stringify(c)
    return Buffer.from(json, "utf8").toString("base64url")
}

export function decodeCursor(raw: string): CommissionCursor {
    let parsed: unknown
    try {
        const json = Buffer.from(raw, "base64url").toString("utf8")
        parsed = JSON.parse(json)
    } catch {
        throw new Error("Invalid cursor")
    }

    if (
        !parsed ||
        typeof parsed !== "object" ||
        typeof (parsed as any).close_date !== "string" ||
        typeof (parsed as any).id !== "string"
    ) {
        throw new Error("Invalid cursor")
    }

    return parsed as CommissionCursor
}