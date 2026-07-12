"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { selectedChurchHeaders } from "@/lib/selected-church";

const supabase = createClient();
const ACCENT = "#7B2CBF";

type Session = { id: string; volunteerName: string; roomName: string; issuedAt: string; expiresAt: string; status: "active" | "expired" | "revoked" };
type Scan = { id: string; scannedAt: string; result: string; volunteerName: string; childName: string | null; roomName: string | null };
type ParentReq = { id: string; sentAt: string; deliveryStatus: string; volunteerName: string; roomName: string | null; childName: string };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function ResultBadge({ result }: { result: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    valid:        { bg: "rgba(34,197,94,0.15)",  text: "#4ade80" },
    expired:      { bg: "rgba(245,158,11,0.15)", text: "#fbbf24" },
    unauthorized: { bg: "rgba(239,68,68,0.15)",  text: "#f87171" },
    not_found:    { bg: "rgba(156,163,175,0.15)", text: "#9ca3af" },
  };
  const c = colors[result] ?? colors.not_found;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: c.bg, color: c.text }}>
      {result === "valid" ? "Allowed" : result === "unauthorized" ? "Denied" : result}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "#D4AF37" }}>{title}</h2>
      {children}
    </div>
  );
}

export default function VolunteerAuditPage() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [parentRequests, setParentRequests] = useState<ParentReq[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch("/api/children-ministry/volunteer-audit", {
        headers: { Authorization: `Bearer ${token}`, ...selectedChurchHeaders() },
      });

      if (res.ok) {
        const d = await res.json();
        setSessions(d.sessions ?? []);
        setScans(d.scans ?? []);
        setParentRequests(d.parentRequests ?? []);
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#08060D" }}>
        <div style={{ color: "#D8D8E8" }}>Loading…</div>
      </div>
    );
  }

  const card = "rounded-2xl overflow-hidden";
  const tableStyle = { background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" };
  const thStyle = "text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider";
  const thColor = { color: "#A9A9B8" };
  const tdStyle = "px-5 py-3 text-sm";
  const tdColor = { color: "#D8D8E8" };
  const dimColor = { color: "#A9A9B8" };
  const rowBorder = { borderTop: "1px solid rgba(212,175,55,0.08)" };

  return (
    <AppShell navItems={[]}>
      <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p className="text-sm mb-1" style={{ color: "#D4AF37" }}>ShepherdKids</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Volunteer Audit</h1>
        <p className="text-sm mt-1" style={{ color: "#A9A9B8" }}>Current sessions, scan history, and parent requests.</p>
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>

        {/* Current Sessions */}
        <Section title="Current Classroom Volunteers">
          <div className={card} style={tableStyle}>
            {sessions.length === 0 ? (
              <div className="p-10 text-center" style={dimColor}>No active volunteer sessions.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={thStyle} style={thColor}>Volunteer</th>
                    <th className={thStyle} style={thColor}>Classroom</th>
                    <th className={thStyle} style={thColor}>Signed In</th>
                    <th className={thStyle} style={thColor}>Session Expires</th>
                    <th className={thStyle} style={thColor}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} style={rowBorder}>
                      <td className={tdStyle} style={tdColor}>{s.volunteerName}</td>
                      <td className={tdStyle} style={dimColor}>{s.roomName}</td>
                      <td className={tdStyle} style={dimColor}>{fmtTime(s.issuedAt)}</td>
                      <td className={tdStyle} style={dimColor}>{fmtTime(s.expiresAt)}</td>
                      <td className={tdStyle}>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{
                          backgroundColor: s.status === "active" ? "rgba(34,197,94,0.15)" : "rgba(156,163,175,0.15)",
                          color: s.status === "active" ? "#4ade80" : "#9ca3af",
                        }}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Section>

        {/* Recent Scans */}
        <Section title="Recent Smart Label Scans">
          <div className={card} style={tableStyle}>
            {scans.length === 0 ? (
              <div className="p-10 text-center" style={dimColor}>No scans recorded yet.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={thStyle} style={thColor}>Time</th>
                    <th className={thStyle} style={thColor}>Volunteer</th>
                    <th className={thStyle} style={thColor}>Child</th>
                    <th className={thStyle} style={thColor}>Classroom</th>
                    <th className={thStyle} style={thColor}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map(s => (
                    <tr key={s.id} style={rowBorder}>
                      <td className={tdStyle} style={dimColor}>{fmtTime(s.scannedAt)}</td>
                      <td className={tdStyle} style={tdColor}>{s.volunteerName}</td>
                      <td className={tdStyle} style={dimColor}>{s.childName ?? "—"}</td>
                      <td className={tdStyle} style={dimColor}>{s.roomName ?? "—"}</td>
                      <td className={tdStyle}><ResultBadge result={s.result} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Section>

        {/* Parent Requests */}
        <Section title="Parent Requests">
          <div className={card} style={tableStyle}>
            {parentRequests.length === 0 ? (
              <div className="p-10 text-center" style={dimColor}>No volunteer-initiated parent requests.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={thStyle} style={thColor}>Time</th>
                    <th className={thStyle} style={thColor}>Volunteer</th>
                    <th className={thStyle} style={thColor}>Child</th>
                    <th className={thStyle} style={thColor}>Classroom</th>
                    <th className={thStyle} style={thColor}>Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {parentRequests.map(r => (
                    <tr key={r.id} style={rowBorder}>
                      <td className={tdStyle} style={dimColor}>{fmtTime(r.sentAt)}</td>
                      <td className={tdStyle} style={tdColor}>{r.volunteerName}</td>
                      <td className={tdStyle} style={dimColor}>{r.childName}</td>
                      <td className={tdStyle} style={dimColor}>{r.roomName ?? "—"}</td>
                      <td className={tdStyle}>
                        <span className="text-xs font-medium capitalize" style={{ color: r.deliveryStatus === "sent" ? "#4ade80" : "#f87171" }}>
                          {r.deliveryStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Section>

      </div>
    </AppShell>
  );
}
