import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const res = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=in:inbox",
      { headers: { Authorization: `Bearer ${session.accessToken}` } }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message)

    // Fetch snippet + headers for each message
    const messages = await Promise.all(
      (data.messages || []).slice(0, 20).map(async (m: { id: string }) => {
        const msgRes = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${session.accessToken}` } }
        )
        return msgRes.json()
      })
    )
    return NextResponse.json({ messages })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
