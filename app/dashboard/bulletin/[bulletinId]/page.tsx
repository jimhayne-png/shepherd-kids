"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const supabase = createClient();

const ACCENT = "#F28C28";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://shepherd-kids.vercel.app";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "📋 Bulletin", href: "/dashboard/bulletin" },
  { label: "Ministry", href: "#", isSection: true },
  { label: "🧒 Children's Ministry", href: "/dashboard/children-ministry" },
  ...MINISTRY_NAV_ITEMS,
  { label: "Settings", href: "#", isSection: true },
  { label: "⚙️ Settings", href: "/dashboard/settings" },
];

const SECTION_TYPES = [
  { value: 'order_of_service', label: '📋 Order of Service' },
  { value: 'sermon', label: '✝️ Sermon' },
  { value: 'scripture', label: '📖 Scripture' },
  { value: 'giving', label: '💛 Giving' },
  { value: 'prayer', label: '🙏 Prayer' },
  { value: 'song', label: '🎵 Song' },
  { value: 'reading', label: '📚 Reading' },
  { value: 'custom', label: '✏️ Custom Section' },
];

type Section = { id: string; section_type: string; title: string; content: string | null; sort_order: number; is_visible: boolean };
type Announcement = { id: string; title: string; body: string | null; link_url: string | null; link_label: string | null; sort_order: number; is_visible: boolean };
type BulletinData = { id: string; service_date: string; title: string; status: string; access_token: string; uploaded_bulletin_url: string | null; sent_at: string | null };

function PublicPreview({ bulletin, sections, announcements, churchName }: { bulletin: BulletinData; sections: Section[]; announcements: Announcement[]; churchName: string }) {
  const date = bulletin.service_date ? new Date(bulletin.service_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "";
  return (
    <div style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#1f2937", lineHeight: 1.7 }}>
      <div style={{ background: "#1A4A2E", padding: "20px", borderRadius: "12px 12px 0 0", textAlign: "center" }}>
        <p style={{ color: "white", fontWeight: "bold", fontSize: "18px", margin: 0 }}>{churchName}</p>
        <p style={{ color: "#86efac", margin: "4px 0 0", fontSize: "13px" }}>{date}</p>
        <p style={{ color: "rgba(255,255,255,0.9)", fontWeight: "bold", margin: "8px 0 0", fontSize: "15px" }}>{bulletin.title}</p>
      </div>
      <div style={{ background: "white", padding: "16px", border: "1px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 12px 12px" }}>
        {sections.filter(s => s.is_visible).map(s => (
          <div key={s.id} style={{ marginBottom: "16px" }}>
            <p style={{ fontWeight: "bold", color: "#1A4A2E", fontSize: "13px", margin: "0 0 6px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>{s.title}</p>
            {s.content && <p style={{ margin: 0, fontSize: "12px", whiteSpace: "pre-line", color: "#374151" }}>{s.content}</p>}
          </div>
        ))}
        {announcements.filter(a => a.is_visible).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontWeight: "bold", color: "#1A4A2E", fontSize: "13px", margin: "0 0 8px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>📢 Announcements</p>
            {announcements.filter(a => a.is_visible).map(a => (
              <div key={a.id} style={{ background: "#f9fafb", borderRadius: "6px", padding: "8px 10px", marginBottom: "6px" }}>
                <p style={{ fontWeight: "bold", margin: "0 0 2px", fontSize: "12px" }}>{a.title}</p>
                {a.body && <p style={{ margin: 0, fontSize: "11px", color: "#6b7280" }}>{a.body}</p>}
                {a.link_url && <a href={a.link_url} style={{ fontSize: "11px", color: ACCENT }}>{a.link_label ?? "Learn more →"}</a>}
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center", margin: "12px 0 0" }}>Powered by ShepherdKids</p>
      </div>
    </div>
  );
}

export default function BulletinEditorPage({ params }: { params: Promise<{ bulletinId: string }> }) {
  const { bulletinId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [bulletin, setBulletin] = useState<BulletinData | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [churchName, setChurchName] = useState("Church");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");

  // Add section
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionType, setNewSectionType] = useState("custom");
  const [newSectionTitle, setNewSectionTitle] = useState("");

  // Add announcement
  const [showAddAnn, setShowAddAnn] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: "", body: "", link_url: "", link_label: "" });

  // Editing section inline
  const [editingSection, setEditingSection] = useState<string | null>(null);

  async function load(t: string) {
    const res = await fetch(`/api/bulletins/${bulletinId}`, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) { router.replace("/dashboard/bulletin"); return; }
    const d = await res.json();
    setBulletin(d.bulletin);
    setSections(d.sections ?? []);
    setAnnouncements(d.announcements ?? []);
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

      const { data: cu } = await supabase.from("church_users").select("church_id, churches(name)").eq("user_id", user.id).maybeSingle();
      if (cu) setChurchName((cu.churches as any)?.name ?? "Church");

      await load(t);
      setLoading(false);
    }
    init();
  }, [bulletinId, router]);

  async function saveBulletin(updates: Partial<BulletinData>) {
    if (!token || !bulletin) return;
    setSaving(true);
    const res = await fetch(`/api/bulletins/${bulletinId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    if (res.ok) { const d = await res.json(); setBulletin(d.bulletin); setSaveMsg("Saved"); setTimeout(() => setSaveMsg(""), 2000); }
    setSaving(false);
  }

  async function togglePublish() {
    if (!bulletin) return;
    setPublishing(true);
    const newStatus = bulletin.status === 'published' ? 'draft' : 'published';
    await saveBulletin({ status: newStatus });
    setPublishing(false);
  }

  async function updateSection(id: string, updates: Partial<Section>) {
    if (!token) return;
    setSections(ss => ss.map(s => s.id === id ? { ...s, ...updates } : s));
    await fetch(`/api/bulletins/${bulletinId}/sections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
  }

  async function deleteSection(id: string) {
    if (!token || !confirm("Remove this section?")) return;
    await fetch(`/api/bulletins/${bulletinId}/sections/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setSections(ss => ss.filter(s => s.id !== id));
  }

  async function moveSection(id: string, dir: -1 | 1) {
    const idx = sections.findIndex(s => s.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const reordered = [...sections];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const updated = reordered.map((s, i) => ({ ...s, sort_order: i }));
    setSections(updated);
    if (!token) return;
    await Promise.all(updated.map(s => fetch(`/api/bulletins/${bulletinId}/sections/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sort_order: s.sort_order }),
    })));
  }

  async function addSection() {
    if (!token || !newSectionTitle.trim()) return;
    const res = await fetch(`/api/bulletins/${bulletinId}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ section_type: newSectionType, title: newSectionTitle, content: "", sort_order: sections.length }),
    });
    if (res.ok) { const d = await res.json(); setSections(ss => [...ss, d.section]); setShowAddSection(false); setNewSectionTitle(""); }
  }

  async function addAnnouncement() {
    if (!token || !newAnn.title.trim()) return;
    const res = await fetch(`/api/bulletins/${bulletinId}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...newAnn, sort_order: announcements.length }),
    });
    if (res.ok) { const d = await res.json(); setAnnouncements(aa => [...aa, d.announcement]); setShowAddAnn(false); setNewAnn({ title: "", body: "", link_url: "", link_label: "" }); }
  }

  async function deleteAnnouncement(id: string) {
    if (!token || !confirm("Remove this announcement?")) return;
    await fetch(`/api/bulletins/${bulletinId}/announcements/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setAnnouncements(aa => aa.filter(a => a.id !== id));
  }

  async function sendBulletin() {
    if (!token) return;
    setSending(true); setSendMsg("");
    const res = await fetch(`/api/bulletins/${bulletinId}/send`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    setSending(false);
    setSendMsg(res.ok ? `✅ Sent to ${d.sent} members` : d.error ?? "Failed");
    setTimeout(() => setSendMsg(""), 5000);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;
  if (!bulletin) return null;

  const isPublished = bulletin.status === 'published';
  const publicUrl = `${APP_URL}/bulletin/${bulletin.access_token}`;

  return (
    <AppShell navItems={navItems}>
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center gap-4 flex-wrap">
        <Link href="/dashboard/bulletin" className="text-sm text-gray-500 hover:text-gray-700">← Bulletins</Link>
        <div className="flex-1 min-w-0">
          <input
            value={bulletin.title}
            onChange={e => setBulletin(b => b ? { ...b, title: e.target.value } : b)}
            onBlur={e => saveBulletin({ title: e.target.value })}
            className="text-lg font-bold text-gray-900 bg-transparent border-0 outline-none w-full"
            style={{ fontFamily: "Georgia, serif" }}
          />
          <div className="flex items-center gap-3">
            <input type="date" value={bulletin.service_date} onChange={e => { setBulletin(b => b ? { ...b, service_date: e.target.value } : b); saveBulletin({ service_date: e.target.value }); }} className="text-xs text-gray-400 bg-transparent border-0 outline-none" />
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{isPublished ? '✓ Published' : 'Draft'}</span>
            {saveMsg && <span className="text-xs text-green-600">{saveMsg}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {sendMsg && <span className="text-sm text-green-600">{sendMsg}</span>}
          {isPublished && (
            <>
              <Link href={publicUrl} target="_blank" className="px-3 py-2 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:border-green-300 transition-colors">View ↗</Link>
              <button onClick={sendBulletin} disabled={sending} className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: ACCENT }}>
                {sending ? "Sending…" : "📧 Send to Members"}
              </button>
            </>
          )}
          <button onClick={togglePublish} disabled={publishing} className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: isPublished ? "#6b7280" : "#22c55e" }}>
            {publishing ? "…" : isPublished ? "Unpublish" : "✓ Publish"}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Left panel — Editor */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6" style={{ minWidth: 0 }}>
          <div className="max-w-xl space-y-3">

            {/* Sections */}
            {sections.map((s, idx) => (
              <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveSection(s.id, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-30 text-xs leading-none">▲</button>
                    <button onClick={() => moveSection(s.id, 1)} disabled={idx === sections.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-30 text-xs leading-none">▼</button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      value={s.title}
                      onChange={e => setSections(ss => ss.map(x => x.id === s.id ? { ...x, title: e.target.value } : x))}
                      onBlur={e => updateSection(s.id, { title: e.target.value })}
                      className="text-sm font-bold text-gray-800 bg-transparent border-0 outline-none w-full"
                    />
                    <p className="text-xs text-gray-400">{s.section_type.replace(/_/g, ' ')}</p>
                  </div>
                  <label className="flex items-center gap-1 cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={s.is_visible} onChange={e => updateSection(s.id, { is_visible: e.target.checked })} className="rounded" />
                    <span className="text-xs text-gray-400">Show</span>
                  </label>
                  <button onClick={() => deleteSection(s.id)} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
                </div>
                <textarea
                  value={s.content ?? ""}
                  onChange={e => setSections(ss => ss.map(x => x.id === s.id ? { ...x, content: e.target.value } : x))}
                  onBlur={e => updateSection(s.id, { content: e.target.value })}
                  rows={3}
                  placeholder="Content…"
                  className="w-full px-4 py-3 text-sm text-gray-700 resize-y bg-transparent border-0 outline-none"
                />
              </div>
            ))}

            {/* Add Section */}
            {showAddSection ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                <select value={newSectionType} onChange={e => { setNewSectionType(e.target.value); setNewSectionTitle(SECTION_TYPES.find(t => t.value === e.target.value)?.label.split(" ").slice(1).join(" ") ?? ""); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} placeholder="Section title" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <div className="flex gap-2">
                  <button onClick={() => setShowAddSection(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-medium">Cancel</button>
                  <button onClick={addSection} className="flex-1 py-2 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: ACCENT }}>Add</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setShowAddSection(true); setNewSectionType("custom"); setNewSectionTitle(""); }} className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors">
                + Add Section
              </button>
            )}

            {/* Announcements */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <div>
                  <p className="text-sm font-bold text-gray-800">📢 Announcements</p>
                  <p className="text-xs text-gray-400">{announcements.length} item{announcements.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowAddAnn(true)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: ACCENT }}>+ Add</button>
              </div>
              {announcements.length === 0 ? (
                <p className="px-4 py-4 text-xs text-gray-400">No announcements yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {announcements.map(a => (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{a.title}</p>
                        {a.body && <p className="text-xs text-gray-400 truncate">{a.body}</p>}
                        {a.link_url && <p className="text-xs" style={{ color: ACCENT }}>{a.link_label ?? a.link_url}</p>}
                      </div>
                      <button onClick={() => deleteAnnouncement(a.id)} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Announcement Form */}
            {showAddAnn && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                <input value={newAnn.title} onChange={e => setNewAnn(a => ({ ...a, title: e.target.value }))} placeholder="Title *" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <textarea value={newAnn.body} onChange={e => setNewAnn(a => ({ ...a, body: e.target.value }))} rows={2} placeholder="Details (optional)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={newAnn.link_url} onChange={e => setNewAnn(a => ({ ...a, link_url: e.target.value }))} placeholder="Link URL" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input value={newAnn.link_label} onChange={e => setNewAnn(a => ({ ...a, link_label: e.target.value }))} placeholder="Link label" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddAnn(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-medium">Cancel</button>
                  <button onClick={addAnnouncement} className="flex-1 py-2 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: ACCENT }}>Add</button>
                </div>
              </div>
            )}

            {/* PDF Upload URL */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm font-bold text-gray-800 mb-1">📄 Upload Existing Bulletin</p>
              <p className="text-xs text-gray-400 mb-3">Paste a URL to your existing bulletin PDF (Google Drive, Dropbox, etc.)</p>
              <div className="flex gap-2">
                <input
                  value={bulletin.uploaded_bulletin_url ?? ""}
                  onChange={e => setBulletin(b => b ? { ...b, uploaded_bulletin_url: e.target.value } : b)}
                  onBlur={e => saveBulletin({ uploaded_bulletin_url: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — Phone Preview */}
        <div className="w-80 flex-shrink-0 bg-gray-200 p-4 overflow-y-auto hidden lg:block">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 text-center">Live Preview</p>
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden" style={{ border: "8px solid #1f2937", maxWidth: "320px", margin: "0 auto" }}>
            <div className="overflow-y-auto" style={{ maxHeight: "580px" }}>
              <PublicPreview bulletin={bulletin} sections={sections} announcements={announcements} churchName={churchName} />
            </div>
          </div>
          {isPublished && (
            <div className="mt-4 text-center">
              <Link href={publicUrl} target="_blank" className="text-xs text-gray-500 hover:text-gray-700 underline">Open full view ↗</Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
