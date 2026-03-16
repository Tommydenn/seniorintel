"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useState, useEffect, useCallback } from "react"

// Types
interface Facility {
  name: string; address: string; phone: string; website: string
  careTypes: string[]; contactName: string; contactTitle: string
  salesEmail: string; marketingEmail: string; directLine: string
  conversationStarter: string; status: string; metro: string; researchedAt: string
}
interface OutreachEntry {
  facilityName: string; metro: string; to: string; contactName: string
  subject: string; sentAt: string; status: string; followUpCount: number
  lastFollowUp: string | null; repliedAt: string | null; grade: string | null
}
interface PricingRecord {
  facilityName: string; source: string; updatedAt: string; confidence: number
  pricingFound: boolean; rates: { unit: string; monthlyMin: number; monthlyMax: number }[]
  includes: string[]; moveInSpecial: string; notes: string
}

// Styles
const S = {
  shell: { display: "flex", height: "100vh", overflow: "hidden" } as React.CSSProperties,
  sidebar: {
    width: 220, background: "#09090b", display: "flex", flexDirection: "column" as const,
    padding: "20px 0", flexShrink: 0,
  },
  logo: { padding: "0 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  logoText: { fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" },
  logoSub: { fontSize: 10, color: "#71717a", marginTop: 2, letterSpacing: "0.5px", textTransform: "uppercase" as const },
  nav: { flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column" as const, gap: 2 },
  navBtn: (active: boolean) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
    borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
    background: active ? "rgba(99,102,241,0.15)" : "transparent",
    color: active ? "#a5b4fc" : "#71717a", width: "100%", textAlign: "left" as const,
  }),
  main: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" },
  topbar: {
    padding: "16px 24px", borderBottom: "1px solid #e4e4e7",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#fff",
  },
  content: { flex: 1, overflow: "auto", padding: 24 },
  card: {
    background: "#fff", border: "1px solid #e4e4e7", borderRadius: 12,
    padding: "20px 24px", marginBottom: 16,
  },
  badge: (color: string) => ({
    display: "inline-flex", alignItems: "center", padding: "2px 10px",
    borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: color === "green" ? "#dcfce7" : color === "amber" ? "#fef9c3" : color === "red" ? "#fee2e2" : "#f4f4f5",
    color: color === "green" ? "#16a34a" : color === "amber" ? "#ca8a04" : color === "red" ? "#dc2626" : "#52525b",
  }),
  btn: (variant = "default", size = "md") => ({
    display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer",
    borderRadius: 8, fontWeight: 600, fontSize: size === "sm" ? 11 : 13,
    padding: size === "sm" ? "5px 12px" : "9px 18px",
    background: variant === "primary" ? "#6366f1" : "#f4f4f5",
    color: variant === "primary" ? "#fff" : "#18181b",
  }),
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12 },
  th: { textAlign: "left" as const, padding: "8px 12px", borderBottom: "2px solid #e4e4e7", fontWeight: 600, color: "#52525b", fontSize: 11 },
  td: { padding: "10px 12px", borderBottom: "1px solid #f4f4f5", verticalAlign: "top" as const },
}

const PAGES = [
  { id: "dashboard", label: "Dashboard", icon: "⬡" },
  { id: "facilities", label: "Facilities", icon: "🏢" },
  { id: "outreach", label: "Outreach", icon: "📤" },
  { id: "pricing", label: "Pricing Intel", icon: "💰" },
  { id: "settings", label: "Settings", icon: "⚙" },
]

function SignInScreen() {
  return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#f8f9fb" }}>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-1px", marginBottom: 8 }}>SeniorIntel</div>
        <div style={{ color: "#71717a", marginBottom: 32, fontSize: 14 }}>
          Senior living competitive intelligence platform
        </div>
        <button
          onClick={() => signIn("google")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            background: "#fff", border: "1px solid #e4e4e7", borderRadius: 10,
            padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>
        <div style={{ marginTop: 16, fontSize: 11, color: "#a1a1aa" }}>
          Connects your Gmail + Drive. No passwords stored.
        </div>
      </div>
    </div>
  )
}

function Dashboard({ outreach, pricing, facilities }: { outreach: OutreachEntry[]; pricing: PricingRecord[]; facilities: Facility[] }) {
  const sent = outreach.filter(o => o.status !== "cold").length
  const replied = outreach.filter(o => o.status === "replied").length
  const withPricing = pricing.filter(p => p.pricingFound).length
  const needsFollowUp = outreach.filter(o => {
    if (o.status !== "sent" && o.status !== "follow-up-1") return false
    const days = Math.floor((Date.now() - new Date(o.sentAt).getTime()) / 86400000)
    return (o.followUpCount === 0 && days >= 7) || (o.followUpCount === 1 && days >= 14)
  }).length

  const stats = [
    { label: "Communities Tracked", value: facilities.length, color: "#6366f1" },
    { label: "Emails Sent", value: sent, color: "#3b82f6" },
    { label: "Replied", value: replied, color: "#10b981" },
    { label: "Pricing Captured", value: withPricing, color: "#f59e0b" },
  ]

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...S.card, marginBottom: 0, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {needsFollowUp > 0 && (
        <div style={{ ...S.card, borderLeft: "3px solid #f59e0b", marginBottom: 16, background: "#fffbeb" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠ {needsFollowUp} follow-up{needsFollowUp > 1 ? "s" : ""} due</div>
          <div style={{ fontSize: 11, color: "#71717a" }}>Communities that have not replied and are past the follow-up window.</div>
        </div>
      )}
      <div style={S.card}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Recent outreach</div>
        {outreach.length === 0
          ? <div style={{ color: "#a1a1aa", fontSize: 12 }}>No outreach yet. Run a discovery then send emails.</div>
          : (
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Community</th><th style={S.th}>Sent</th>
                <th style={S.th}>Follow-ups</th><th style={S.th}>Status</th>
              </tr></thead>
              <tbody>
                {outreach.slice(0, 8).map((o, i) => (
                  <tr key={i}>
                    <td style={S.td}>{o.facilityName}</td>
                    <td style={S.td}>{new Date(o.sentAt).toLocaleDateString()}</td>
                    <td style={S.td}>{o.followUpCount}</td>
                    <td style={S.td}>
                      <span style={S.badge(o.status === "replied" ? "green" : o.status === "cold" ? "red" : "amber")}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}

function Facilities({ facilities }: { facilities: Facility[] }) {
  const metros = [...new Set(facilities.map(f => f.metro))].filter(Boolean)
  const [metro, setMetro] = useState(metros[0] || "")
  const filtered = metro ? facilities.filter(f => f.metro === metro) : facilities
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {metros.map(m => (
          <button key={m} onClick={() => setMetro(m)} style={{ ...S.btn(metro === m ? "primary" : "default", "sm") }}>
            {m}
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <div style={{ ...S.card, color: "#a1a1aa" }}>No facilities yet. Run discovery first.</div>
        : filtered.map((f, i) => (
          <div key={i} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{f.name}</div>
              <span style={S.badge(f.status === "sent" ? "amber" : f.status === "replied" ? "green" : "default")}>
                {f.status}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#71717a", lineHeight: 1.8 }}>
              <div>📍 {f.address}</div>
              <div>👤 {f.contactName} — {f.contactTitle}</div>
              <div>📧 {f.salesEmail || f.marketingEmail || "No email"}</div>
              {f.conversationStarter && <div style={{ marginTop: 6, padding: "6px 10px", background: "#f8f9fb", borderRadius: 6, borderLeft: "3px solid #6366f1" }}>💬 {f.conversationStarter}</div>}
            </div>
          </div>
        ))
      }
    </div>
  )
}

function OutreachLog({ outreach }: { outreach: OutreachEntry[] }) {
  if (outreach.length === 0) return (
    <div style={{ ...S.card, color: "#a1a1aa" }}>No outreach logged yet.</div>
  )
  return (
    <div style={S.card}>
      <table style={S.table}>
        <thead><tr>
          <th style={S.th}>Community</th><th style={S.th}>Metro</th><th style={S.th}>To</th>
          <th style={S.th}>Sent</th><th style={S.th}>Follow-ups</th>
          <th style={S.th}>Status</th><th style={S.th}>Grade</th>
        </tr></thead>
        <tbody>
          {outreach.map((o, i) => (
            <tr key={i}>
              <td style={S.td}>{o.facilityName}</td>
              <td style={S.td}>{o.metro}</td>
              <td style={S.td}>{o.to}</td>
              <td style={S.td}>{new Date(o.sentAt).toLocaleDateString()}</td>
              <td style={S.td}>{o.followUpCount}</td>
              <td style={S.td}>
                <span style={S.badge(o.status === "replied" ? "green" : o.status === "cold" ? "red" : "amber")}>
                  {o.status}
                </span>
              </td>
              <td style={S.td}>{o.grade || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Pricing({ pricing }: { pricing: PricingRecord[] }) {
  if (pricing.length === 0) return (
    <div style={{ ...S.card, color: "#a1a1aa" }}>No pricing captured yet. Check inbox for replies.</div>
  )
  return (
    <>
      {pricing.map((p, i) => (
        <div key={i} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontWeight: 600 }}>{p.facilityName}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={S.badge(p.confidence >= 80 ? "green" : p.confidence >= 50 ? "amber" : "red")}>
                {p.confidence}% confidence
              </span>
              <span style={{ fontSize: 11, color: "#a1a1aa" }}>{new Date(p.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
          {p.rates?.length > 0 && (
            <table style={{ ...S.table, marginBottom: 8 }}>
              <thead><tr><th style={S.th}>Unit</th><th style={S.th}>Monthly rate</th></tr></thead>
              <tbody>
                {p.rates.map((r, j) => (
                  <tr key={j}>
                    <td style={S.td}>{r.unit}</td>
                    <td style={S.td}>${r.monthlyMin.toLocaleString()} – ${r.monthlyMax.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {p.notes && <div style={{ fontSize: 11, color: "#71717a" }}>📝 {p.notes}</div>}
        </div>
      ))}
    </>
  )
}

function Settings({ session, driveStatus }: { session: any; driveStatus: string }) {
  const [cronRunning, setCronRunning] = useState(false)
  const [cronResult, setCronResult] = useState("")

  const runMonitor = async () => {
    setCronRunning(true)
    const res = await fetch("/api/monitor", {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}` }
    })
    const data = await res.json()
    setCronResult(JSON.stringify(data, null, 2))
    setCronRunning(false)
  }

  return (
    <div>
      <div style={S.card}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Google Account</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {session.user?.image && <img src={session.user.image} alt="" style={{ width: 40, height: 40, borderRadius: "50%" }} />}
          <div>
            <div style={{ fontWeight: 600 }}>{session.user?.name}</div>
            <div style={{ fontSize: 11, color: "#71717a" }}>{session.user?.email}</div>
          </div>
          <span style={S.badge("green")}>Connected</span>
          <button onClick={() => signOut()} style={S.btn("default", "sm")}>Sign out</button>
        </div>
      </div>
      <div style={S.card}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>☁ Google Drive</div>
        <div style={{ fontSize: 11, color: "#71717a", marginBottom: 12 }}>Data stored in My Drive / SeniorIntel /</div>
        <span style={S.badge(driveStatus === "ready" ? "green" : driveStatus === "error" ? "red" : "amber")}>
          {driveStatus === "ready" ? "Connected" : driveStatus === "error" ? "Error" : "Connecting…"}
        </span>
      </div>
      <div style={S.card}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>⏰ Daily Monitor</div>
        <div style={{ fontSize: 11, color: "#71717a", marginBottom: 12 }}>
          Runs automatically weekdays at 8am ET via Vercel Cron. Checks follow-ups and marks cold outreach.
        </div>
        <button onClick={runMonitor} disabled={cronRunning} style={S.btn("primary", "sm")}>
          {cronRunning ? "Running…" : "▶ Run now"}
        </button>
        {cronResult && (
          <pre style={{ marginTop: 12, padding: 12, background: "#f4f4f5", borderRadius: 8, fontSize: 10, overflow: "auto" }}>
            {cronResult}
          </pre>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const { data: session, status } = useSession()
  const [page, setPage] = useState("dashboard")
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [outreach, setOutreach] = useState<OutreachEntry[]>([])
  const [pricing, setPricing] = useState<PricingRecord[]>([])
  const [driveStatus, setDriveStatus] = useState("connecting")
  const [lastSync, setLastSync] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/drive")
      if (!res.ok) { setDriveStatus("error"); return }
      const data = await res.json()
      const allFacilities: Facility[] = []
      if (data.facilities?.metros) {
        Object.values(data.facilities.metros).forEach((metro: any) => {
          allFacilities.push(...(metro.facilities || []))
        })
      }
      setFacilities(allFacilities)
      setOutreach(data.outreach?.log || [])
      setPricing(data.pricing?.records || [])
      setDriveStatus("ready")
      setLastSync(new Date().toLocaleTimeString())
    } catch {
      setDriveStatus("error")
    }
  }, [])

  useEffect(() => {
    if (session) loadData()
  }, [session, loadData])

  if (status === "loading") return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#71717a" }}>Loading…</div>
    </div>
  )

  if (!session) return <SignInScreen />

  const pageComponents: Record<string, React.ReactNode> = {
    dashboard: <Dashboard outreach={outreach} pricing={pricing} facilities={facilities} />,
    facilities: <Facilities facilities={facilities} />,
    outreach: <OutreachLog outreach={outreach} />,
    pricing: <Pricing pricing={pricing} />,
    settings: <Settings session={session} driveStatus={driveStatus} />,
  }

  const badges: Record<string, number> = {
    outreach: outreach.filter(o => o.status === "sent" && o.followUpCount < 2).length,
    pricing: pricing.length,
  }

  return (
    <div style={S.shell}>
      <div style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoText}>SeniorIntel</div>
          <div style={S.logoSub}>Competitive Intelligence</div>
        </div>
        <nav style={S.nav}>
          {PAGES.map(p => (
            <button key={p.id} style={S.navBtn(page === p.id)} onClick={() => setPage(p.id)}>
              <span>{p.icon}</span>
              <span>{p.label}</span>
              {badges[p.id] ? (
                <span style={{ marginLeft: "auto", background: "#6366f1", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10 }}>
                  {badges[p.id]}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: driveStatus === "ready" ? "#10b981" : driveStatus === "error" ? "#ef4444" : "#d97706" }} />
            <span style={{ fontSize: 10, color: "#52525b" }}>
              {driveStatus === "ready" ? `Synced ${lastSync || ""}` : driveStatus === "error" ? "Drive error" : "Connecting…"}
            </span>
          </div>
        </div>
      </div>
      <div style={S.main}>
        <div style={S.topbar}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {PAGES.find(p => p.id === page)?.label}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={loadData} style={S.btn("default", "sm")}>↻ Refresh</button>
            {session.user?.image && (
              <img src={session.user.image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", cursor: "pointer" }} onClick={() => setPage("settings")} />
            )}
          </div>
        </div>
        <div style={S.content}>
          {pageComponents[page]}
        </div>
      </div>
    </div>
  )
}
