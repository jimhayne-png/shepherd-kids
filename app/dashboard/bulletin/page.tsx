"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const supabase = createClient();

const ACCENT = "#F28C28";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://shepherd-well.vercel.app";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "People", href: "#", isSection: true },
  { label: "👥 Members", href: "/dashboard/members" },
  { label: "Engagement", href: "#", isSection: true },
  { label: "📅 Calendar", href: "/dashboard/calendar" },
  { label: "✅ Attendance", href: "/dashboard/attendance" },
  { label: "📋 Bulletin", href: "/dashboard/bulletin" },
  { label: "📢 Communication Hub", href: "/dashboard/communication" },
  { label: "Pastoral Care", href: "#", isSection: true },
  { label: "🙏 Annual Pastor Touch", href: "/dashboard/pastor-touch" },
  { label: "🏥 Visitation", href: "/dashboard/visitation" },
  { label: "🎂 Birthdays", href: "/dashboard/birthdays" },
  { label: "🙋 Prayer", href: "/dashboard/prayer" },
  { label: "Ministry", href: "#", isSection: true },
  { label: "🧒 Children's Ministry", href: "/dashboard/children-ministry" },
  ...MINISTRY_NAV_ITEMS,
  { label: "Settings", href: "#", isSection: true },
  { label: "⚙️ Settings", href: "/dashboard/settings" },
];

type Bulletin = {
  id: string; service_date: string; title: string; status: string;
  access_token: string; section_count: number; announcement_count: number;
  sent_at: string | null;
};

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function BulletinListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);

  // New bulletin modal
  const [showNew, setShowNew] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // QR modal
  const [qrBulletin, setQrBulletin] = useState<Bulletin | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Send state
  const [sending, setSending] = useState<string | null>(null);
  const [sendMsg, setSendMsg] = useState("");

  // Copy state
  const [copied, setCopied] = useState<string | null>(null);

  async function load(t: string) {
    const res = await fetch("/api/bulletins", { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) { const d = await res.json(); setBulletins(d.bulletins ?? []); }
  }

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const t = session.access_token;
      setToken(t);
      await load(t);
      setLoading(false);
    }
    init();
  }, [router]);

  async function createBulletin() {
    if (!newTitle.trim()) { setCreateError("Title required"); return; }
    setCreating(true); setCreateError("");
    const res = await fetch("/api/bulletins", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ service_date: newDate, title: newTitle }),
    });
    if (!res.ok) { const d = await res.json(); setCreateError(d.error ?? "Error"); setCreating(false); return; }
    const d = await res.json();
    router.push(`/dashboard/bulletin/${d.bulletin.id}`);
  }

  async function sendBulletin(id: string) {
    if (!token) return;
    setSending(id); setSendMsg("");
    const res = await fetch(`/api/bulletins/${id}/send`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    setSending(null);
    setSendMsg(res.ok ? `✅ Sent to ${d.sent} members` : d.error ?? "Failed");
    setTimeout(() => setSendMsg(""), 4000);
  }

  async function deleteBulletin(id: string) {
    if (!confirm("Delete this bulletin?") || !token) return;
    await fetch(`/api/bulletins/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (token) await load(token);
  }

  function copyLink(b: Bulletin) {
    const url = `${APP_URL}/bulletin/${b.access_token}`;
    navigator.clipboard.writeText(url);
    setCopied(b.id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function openQr(b: Bulletin) {
    setQrBulletin(b);
    setQrDataUrl(null);
    const url = `${APP_URL}/bulletin/${b.access_token}`;
    const { default: QRCode } = await import("qrcode");
    const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: "#1A4A2E", light: "#ffffff" } });
    setQrDataUrl(dataUrl);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-200 text-sm mb-1">Engagement</p>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>📋 Digital Bulletin</h1>
          </div>
          <button onClick={() => { setShowNew(true); setNewTitle(""); setCreateError(""); }} className="px-5 py-2.5 rounded-xl font-bold text-sm" style={{ backgroundColor: ACCENT, color: "white" }}>
            + New Bulletin
          </button>
        </div>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {sendMsg && <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">{sendMsg}</div>}

        {bulletins.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2" style={{ fontFamily: "Georgia, serif" }}>No Bulletins Yet</h2>
            <p className="text-gray-400 mb-6">Create your first digital bulletin to share with your congregation.</p>
            <button onClick={() => setShowNew(true)} className="px-6 py-3 rounded-xl font-bold text-white" style={{ backgroundColor: ACCENT }}>
              Create First Bulletin
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bulletins.map(b => (
              <div key={b.id} className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-4 px-6 py-5">
                  {/* Date badge */}
                  <div className="flex-shrink-0 text-center bg-green-50 rounded-xl px-4 py-3 min-w-[72px]">
                    <p className="text-xs font-bold text-green-600 uppercase">{new Date(b.service_date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}</p>
                    <p className="text-2xl font-black text-green-800">{new Date(b.service_date + "T00:00:00").getDate()}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 text-base truncate" style={{ fontFamily: "Georgia, serif" }}>{b.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${b.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {b.status === 'published' ? '✓ Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      {fmtDate(b.service_date)} · {b.section_count} section{b.section_count !== 1 ? 's' : ''}
                      {b.announcement_count > 0 ? ` · ${b.announcement_count} announcement${b.announcement_count !== 1 ? 's' : ''}` : ''}
                      {b.sent_at ? ` · Sent ${new Date(b.sent_at).toLocaleDateString()}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <Link href={`/dashboard/bulletin/${b.id}`} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:border-orange-300 transition-colors">
                      Edit
                    </Link>
                    {b.status === 'published' && (
                      <>
                        <Link href={`/bulletin/${b.access_token}`} target="_blank" className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:border-green-300 transition-colors">
                          View ↗
                        </Link>
                        <button onClick={() => copyLink(b)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:border-orange-300 transition-colors">
                          {copied === b.id ? "✓ Copied!" : "Copy Link"}
                        </button>
                        <button onClick={() => openQr(b)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:border-orange-300 transition-colors">
                          QR Code
                        </button>
                        <button onClick={() => sendBulletin(b.id)} disabled={sending === b.id} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>
                          {sending === b.id ? "Sending…" : "📧 Send"}
                        </button>
                      </>
                    )}
                    <button onClick={() => deleteBulletin(b.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-100 text-red-400 hover:border-red-300 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Bulletin Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold" style={{ fontFamily: "Georgia, serif" }}>New Bulletin</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Service Date *</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Sunday Morning Service" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={createBulletin} disabled={creating} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>
                  {creating ? "Creating…" : "Create & Edit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrBulletin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setQrBulletin(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs text-center p-8" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-gray-900 mb-1" style={{ fontFamily: "Georgia, serif" }}>{qrBulletin.title}</h2>
            <p className="text-xs text-gray-400 mb-5">{fmtDate(qrBulletin.service_date)}</p>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="mx-auto rounded-xl mb-5" style={{ width: 220, height: 220 }} />
            ) : (
              <div className="w-56 h-56 mx-auto bg-gray-100 rounded-xl mb-5 flex items-center justify-center">
                <span className="text-gray-300 text-sm">Generating…</span>
              </div>
            )}
            <p className="text-xs text-gray-400 mb-4">Members scan to open bulletin on their phone</p>
            <div className="flex gap-2">
              {qrDataUrl && (
                <a href={qrDataUrl} download={`bulletin-qr-${qrBulletin.service_date}.png`} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>
                  ⬇ Download
                </a>
              )}
              <button onClick={() => setQrBulletin(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
