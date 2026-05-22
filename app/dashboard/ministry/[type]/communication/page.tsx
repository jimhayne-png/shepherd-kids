"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MinistryShell from "@/components/layout/MinistryShell";
import { MINISTRY_CONFIG } from "@/lib/ministry-config";

const supabase = createClient();

const ACCENT = "#F28C28";


type Comm = {
  id: string; title: string; body: string; sent_by_name: string;
  sent_at: string; email_sent: boolean; recipient_count: number; created_at: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CommunicationPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const cfg = MINISTRY_CONFIG[type];

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [comms, setComms] = useState<Comm[]>([]);
  const [rosterCount, setRosterCount] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New post modal
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", send_email: false });
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  async function load(t: string) {
    const [commsRes, rosterRes] = await Promise.all([
      fetch(`/api/ministry/${type}/communications`, { headers: { Authorization: `Bearer ${t}` } }),
      fetch(`/api/ministry/${type}/roster`, { headers: { Authorization: `Bearer ${t}` } }),
    ]);
    if (commsRes.ok) { const d = await commsRes.json(); setComms(d.communications ?? []); }
    if (rosterRes.ok) { const d = await rosterRes.json(); setRosterCount((d.roster ?? []).filter((r: any) => r.status !== 'inactive').length); }
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
  }, [type, router]);

  async function post() {
    if (!form.title.trim()) { setPostError("Title required"); return; }
    if (!form.body.trim()) { setPostError("Message required"); return; }
    setPosting(true); setPostError("");
    const res = await fetch(`/api/ministry/${type}/communications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (!res.ok) { const d = await res.json(); setPostError(d.error ?? "Error"); setPosting(false); return; }
    setPosting(false);
    setShowNew(false);
    setForm({ title: "", body: "", send_email: false });
    if (token) await load(token);
  }

  async function deleteComm(id: string) {
    if (!confirm("Delete this communication?") || !token) return;
    setDeletingId(id);
    await fetch(`/api/ministry/${type}/communications/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setDeletingId(null);
    if (token) await load(token);
  }

  function toggleExpand(id: string) {
    setExpanded(e => { const n = new Set(e); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  if (!cfg) return <MinistryShell type={type}><div className="p-8 text-gray-500">Ministry not found.</div></MinistryShell>;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  return (
    <MinistryShell type={type}>
      <div className="px-8 py-8" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href={`/dashboard/ministry/${type}`} className="text-orange-200 text-xs mb-1 block hover:text-white">← {cfg.name}</Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Communication</h1>
          <button onClick={() => { setShowNew(true); setPostError(""); }} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white" style={{ color: ACCENT }}>
            + New Post
          </button>
        </div>
      </div>


      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {comms.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-5xl mb-4">📣</div>
            <p className="text-gray-400 mb-4">No communications yet for {cfg.name}.</p>
            <button onClick={() => setShowNew(true)} className="px-6 py-3 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: ACCENT }}>
              Create First Post
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {comms.map(c => {
              const isExpanded = expanded.has(c.id);
              const PREVIEW_LEN = 160;
              const needsExpand = c.body.length > PREVIEW_LEN;
              return (
                <div key={c.id} className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-6 py-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base" style={{ fontFamily: "Georgia, serif" }}>{c.title}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {c.sent_by_name} · {fmtDate(c.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.email_sent && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            ✉️ Sent to {c.recipient_count} members
                          </span>
                        )}
                        <button onClick={() => deleteComm(c.id)} disabled={deletingId === c.id} className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded border border-red-100 hover:border-red-200">
                          {deletingId === c.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="text-sm text-gray-600 leading-relaxed" style={{ whiteSpace: "pre-line" }}>
                      {isExpanded || !needsExpand ? c.body : c.body.slice(0, PREVIEW_LEN) + "…"}
                    </div>

                    {needsExpand && (
                      <button onClick={() => toggleExpand(c.id)} className="text-xs font-medium mt-2 block" style={{ color: ACCENT }}>
                        {isExpanded ? "Show less ▲" : "Show more ▼"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Post Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold" style={{ fontFamily: "Georgia, serif" }}>New Communication</h2>
              <p className="text-sm text-gray-400 mt-0.5">{cfg.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. This Sunday's Men's Breakfast" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Message *</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  rows={6}
                  placeholder="Your message here…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:bg-orange-50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.send_email}
                  onChange={e => setForm(f => ({ ...f, send_email: e.target.checked }))}
                  className="rounded"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">Send email to all {rosterCount} active members</p>
                  <p className="text-xs text-gray-400">Members receive via BCC for privacy</p>
                </div>
              </label>
              {postError && <p className="text-sm text-red-600">{postError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={post} disabled={posting} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>
                  {posting ? "Posting…" : form.send_email ? "Post & Send Email" : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MinistryShell>
  );
}
