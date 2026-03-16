import { auth } from "@/auth"
import { getOrCreateFolder, readFile, writeFile } from "@/lib/drive"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const folderId = await getOrCreateFolder(session.accessToken)
    const [facilities, outreach, pricing] = await Promise.all([
      readFile(session.accessToken, folderId, "facilities.json"),
      readFile(session.accessToken, folderId, "outreach.json"),
      readFile(session.accessToken, folderId, "pricing.json"),
    ])
    return NextResponse.json({ facilities, outreach, pricing, folderId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { file, data } = await req.json()
    if (!["facilities.json", "outreach.json", "pricing.json"].includes(file)) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 })
    }
    const folderId = await getOrCreateFolder(session.accessToken)
    await writeFile(session.accessToken, folderId, file, data)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
