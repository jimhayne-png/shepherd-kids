"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MinistryShell from "@/components/layout/MinistryShell";
import { MINISTRY_CONFIG } from "@/lib/ministry-config";

type PrayerRequest = {
  id: string;
  privacy_level: string;
  request_text: string;
  is_urgent: boolean;
  status: string;
  submitted_at: string;
  member_name: string | null;
  ministry_type: string | null;
};

export default function MinistryPrayerPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const cfg = MINISTRY_CONFIG[type];

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [requests, setRequests] = useState<PrayerRequest[]>([]);

  const [form, setForm] = useState({ name: "", request_text: "", is_anonymous: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  async function load(t: string) {
    const res = await fetch(`/api/prayer-requests?ministry_type=${type}`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) { const d = await res.json(); setRequests(d.requests ?? []); }
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);
      await load(t);
      setLoading(false);
    }
    init();
  }, [type, router]);

  async function submitRequest() {
    if (!form.request_text.trim()) { setSubmitError("Prayer request text is required"); return; }
    if (!token) return;
    setSubmitting(true); setSubmitError("");

    const res = await fetch("/api/prayer-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        requestText: form.request_text,
        submitterName: form.is_anonymous ? null : form.name,
        privacyLevel: form.is_anonymous ? "anonymous" : "private",
        isUrgent: false,
        ministry_type: type,
      }),
    });

    if (!res.ok) { const d = await res.json(); setSubmitError(d.error ?? "Error"); setSubmitting(false); return; }
    setSubmitting(false);
    setSubmitSuccess(true);
    setForm({ name: "", request_text: "", is_anonymous: false });
    setTimeout(() => setSubmitSuccess(false), 3000);
    await load(token);
  }

  async function markAnswered(id: string) {
    if (!token) return;
    await fetch(`/api/prayer-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "answered" }),
    });
    await load(token);
  }

  async function deleteRequest(id: string) {
    if (!confirm("Delete this prayer request?") || !token) return;
    await fetch(`/api/prayer-requests/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    await load(token);
  }

  const active = requests.filter(r => r.status === "open");
  const answered = requests.filter(r => r.status === "answered");

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  return (
    <MinistryShell type={type}>
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 100%)" }}>
        <Link href={`/dashboard/ministry/${type}`} className="text-green-300 text-xs mb-1 block hover:text-white">← {cfg?.name}</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>🙋 Prayer Requests</h1>
        <p className="text-green-200 text-sm mt-1">{active.length} active · {answered.length} answered</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Submit form */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Georgia, serif" }}>Submit a Prayer Request</h2>
          <div className="space-y-3">
            {!form.is_anonymous && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Your Name (optional)</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="First Last" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prayer Request *</label>
              <textarea value={form.request_text} onChange={e => setForm(f => ({ ...f, request_text: e.target.value }))} rows={3} placeholder="Share your prayer request…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_anonymous} onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked }))} className="rounded" />
              <span className="text-sm text-gray-600">Submit anonymously</span>
            </label>
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            {submitSuccess && <p className="text-sm text-green-600 font-bold">✅ Prayer request submitted!</p>}
            <button onClick={submitRequest} disabled={submitting} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: "#1A4A2E" }}>
              {submitting ? "Submitting…" : "🙏 Submit Request"}
            </button>
          </div>
        </div>

        {/* Active requests */}
        {active.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Active Requests</h2>
            <div className="space-y-3">
              {active.map(r => (
                <div key={r.id} className="bg-white rounded-2xl shadow border border-gray-100 px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-xs text-gray-400">{r.privacy_level === "anonymous" ? "Anonymous" : r.member_name ?? "Member"} · {new Date(r.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    </div>
                    {r.is_urgent && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 flex-shrink-0">⚠️ Urgent</span>}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">{r.request_text}</p>
                  <div className="flex gap-2">
                    <button onClick={() => markAnswered(r.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-200 hover:border-green-400 transition-colors">✓ Mark Answered</button>
                    <button onClick={() => deleteRequest(r.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-100 text-red-400 hover:border-red-300 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {requests.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-5xl mb-4">🙏</div>
            <p className="text-gray-400">No prayer requests yet for {cfg?.name}. Submit the first one above.</p>
          </div>
        )}

        {answered.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Answered Prayers ({answered.length})</h2>
            <div className="space-y-2">
              {answered.slice(0, 5).map(r => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                  <span className="text-green-500 text-lg flex-shrink-0">✅</span>
                  <p className="text-sm text-gray-500 truncate">{r.request_text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MinistryShell>
  );
}
