import { NextRequest, NextResponse } from "next/server"

// Called by Vercel Cron at 8am ET weekdays (vercel.json: "0 13 * * 1-5")
// Also callable manually from the dashboard

export async function GET(req: NextRequest) {
  // Verify it's coming from Vercel Cron or an authenticated user
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://seniorintel.vercel.app"

  try {
    // 1. Load current data from Drive
    // Note: Cron runs without a user session — uses a service token stored in env
    const token = process.env.GOOGLE_SERVICE_TOKEN
    if (!token) {
      return NextResponse.json({ error: "GOOGLE_SERVICE_TOKEN not set" }, { status: 500 })
    }

    const { getOrCreateFolder, readFile, writeFile } = await import("@/lib/drive")
    const folderId = await getOrCreateFolder(token)
    const outreach = await readFile(token, folderId, "outreach.json")
    const log = outreach?.log || []

    const now = new Date()
    const results = {
      checked: log.length,
      needsFollowUp: [] as string[],
      cold: [] as string[],
      replied: [] as string[],
    }

    for (const entry of log) {
      if (entry.status === "replied" || entry.status === "cold") {
        if (entry.status === "replied") results.replied.push(entry.facilityName)
        if (entry.status === "cold") results.cold.push(entry.facilityName)
        continue
      }
      const sentDate = new Date(entry.sentAt)
      const daysSince = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24))

      if (entry.followUpCount === 0 && daysSince >= 7) {
        results.needsFollowUp.push(entry.facilityName)
      } else if (entry.followUpCount === 1 && daysSince >= 14) {
        results.needsFollowUp.push(entry.facilityName)
      } else if (entry.followUpCount >= 2 && daysSince >= 21) {
        // Mark cold
        entry.status = "cold"
        results.cold.push(entry.facilityName)
      }
    }

    // Write updated log back if anything changed
    if (results.needsFollowUp.length > 0 || results.cold.length > 0) {
      await writeFile(token, folderId, "outreach.json", { _version: 1, log })
    }

    const report = {
      runAt: now.toISOString(),
      summary: {
        totalTracked: log.length,
        replied: results.replied.length,
        needsFollowUp: results.needsFollowUp,
        markedCold: results.cold,
      },
    }

    console.log("Monitor report:", JSON.stringify(report, null, 2))
    return NextResponse.json(report)
  } catch (e: any) {
    console.error("Monitor error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
