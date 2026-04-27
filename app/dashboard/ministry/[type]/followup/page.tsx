"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MinistryShell from "@/components/layout/MinistryShell";
import { MINISTRY_CONFIG } from "@/lib/ministry-config";

const ACCENT = "#F28C28";


type Member = {
  id: string; first_name: string; last_name: string; email: string | null; phone: string | null;
  log_id: string | null;
  touch1_completed: boolean; touch1_date: string | null; touch1_note: string | null;
  touch2_completed: boolean; touch2_date: string | null; touch2_note: string | null;
  touch3_completed: boolean; touch3_date: string | null; touch3_note: string | null;
  status: 'complete' | 'partial' | 'none';
};

type Settings = { frequency: string; touch1_label: string; touch2_label: string; touch3_label: string };

type TouchModal = { member: Member; touch: 1 | 2 | 3 } | null;

function fmt(iso: string | null) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    complete: "bg-green-100 text-green-700",
    partial: "bg-amber-100 text-amber-700",
    none: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = { complete: "✅ Complete", partial: "🟡 Partial", none: "⬜ Not Started" };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${styles[status] ?? styles.none}`}>{labels[status] ?? status}</span>;
}

export default function FollowUpPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const cfg = MINISTRY_CONFIG[type];

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [settings, setSettings] = useState<Settings>({ frequency: 'monthly', touch1_label: 'Phone Call', touch2_label: 'Personal Letter', touch3_label: 'Personal Visit' });
  const [period, setPeriod] = useState<{ year: number; month: number; label: string }>({ year: 0, month: 0, label: "" });
  const [summary, setSummary] = useState({ total: 0, complete: 0, partial: 0, none: 0 });
  const [filter, setFilter] = useState<'all' | 'complete' | 'partial' | 'none'>('all');

  // Touch log modal
  const [touchModal, setTouchModal] = useState<TouchModal>(null);
  const [touchDate, setTouchDate] = useState(new Date().toISOString().slice(0, 10));
  const [touchNote, setTouchNote] = useState("");
  const [logging, setLogging] = useState(false);

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Settings>(settings);
  const [savingSettings, setSavingSettings] = useState(false);

  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");

  async function load(t: string) {
    const res = await fetch(`/api/ministry/${type}/followup`, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const data = await res.json();
    setMembers(data.members ?? []);
    setSettings(data.settings ?? settings);
    setSettingsForm(data.settings ?? settings);
    setPeriod(data.period ?? period);
    setSummary(data.summary ?? summary);
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

  function openTouch(member: Member, touch: 1 | 2 | 3) {
    const existing = member[`touch${touch}_date` as keyof Member] as string | null;
    const existingNote = member[`touch${touch}_note` as keyof Member] as string | null;
    setTouchDate(existing ?? new Date().toISOString().slice(0, 10));
    setTouchNote(existingNote ?? "");
    setTouchModal({ member, touch });
  }

  async function logTouch() {
    if (!touchModal || !token) return;
    setLogging(true);
    const res = await fetch(`/api/ministry/${type}/followup/${touchModal.member.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ touch: touchModal.touch, date: touchDate, note: touchNote }),
    });
    setLogging(false);
    if (res.ok) {
      setTouchModal(null);
      await load(token);
    }
  }

  async function saveSettings() {
    if (!token) return;
    setSavingSettings(true);
    await fetch(`/api/ministry/${type}/followup/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(settingsForm),
    });
    setSavingSettings(false);
    setShowSettings(false);
    await load(token);
  }

  async function sendReminders() {
    if (!token) return;
    setSending(true); setSendMsg("");
    const res = await fetch(`/api/ministry/${type}/followup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "remind" }),
    });
    const data = await res.json();
    setSending(false);
    setSendMsg(res.ok ? `✅ Reminders sent to ${data.sent} admin(s)` : "Failed to send");
    setTimeout(() => setSendMsg(""), 4000);
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return members;
    return members.filter(m => m.status === filter);
  }, [members, filter]);

  const pct = summary.total > 0 ? Math.round((summary.complete / summary.total) * 100) : 0;

  function touchLabel(n: 1 | 2 | 3) {
    return settings[`touch${n}_label` as keyof Settings] as string;
  }

  function TouchCell({ member, touch }: { member: Member; touch: 1 | 2 | 3 }) {
    const done = member[`touch${touch}_completed` as keyof Member] as boolean;
    const date = member[`touch${touch}_date` as keyof Member] as string | null;
    return (
      <button onClick={() => openTouch(member, touch)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors w-full text-left">
        {done ? (
          <>
            <span className="text-green-500 text-base flex-shrink-0">✅</span>
            <span className="text-xs text-gray-500">{fmt(date)}</span>
          </>
        ) : (
          <span className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />
        )}
      </button>
    );
  }

  if (!cfg) return <MinistryShell type={type}><div className="p-8 text-gray-500">Ministry not found.</div></MinistryShell>;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  return (
    <MinistryShell type={type}>
      {/* Hero */}
      <div className="px-8 py-8" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href={`/dashboard/ministry/${type}`} className="text-orange-200 text-xs mb-1 block hover:text-white">← {cfg.name}</Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Follow Up</h1>
            <p className="text-orange-100 text-sm mt-1">{period.label}</p>
          </div>
          <div className="flex items-center gap-2">
            {sendMsg && <p className="text-sm text-white font-medium">{sendMsg}</p>}
            <button onClick={sendReminders} disabled={sending} className="px-4 py-2 rounded-xl text-sm font-bold bg-white" style={{ color: ACCENT }}>
              {sending ? "Sending…" : "📧 Send Reminders"}
            </button>
            <button onClick={() => setShowSettings(true)} className="px-3 py-2 rounded-xl text-sm font-bold bg-white/20 text-white hover:bg-white/30">
              ⚙️
            </button>
          </div>
        </div>
      </div>


      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Stats bar */}
        <div className="bg-white rounded-2xl shadow p-5 mb-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div className="flex gap-6">
              {[
                { label: "Total", value: summary.total, color: "#6b7280" },
                { label: "Complete", value: summary.complete, color: "#22c55e" },
                { label: "Partial", value: summary.partial, color: "#f59e0b" },
                { label: "Not Started", value: summary.none, color: "#9ca3af" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-2xl font-black" style={{ color: ACCENT }}>{pct}%</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div className="h-3 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-5">
          {(['all', 'complete', 'partial', 'none'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize" style={{ backgroundColor: filter === f ? ACCENT : "white", color: filter === f ? "white" : "#6b7280", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              {f === 'none' ? 'Not Started' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && <span className="ml-1.5 text-xs opacity-75">({f === 'complete' ? summary.complete : f === 'partial' ? summary.partial : summary.none})</span>}
            </button>
          ))}
        </div>

        {/* Member table */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400">{filter === 'all' ? 'No members on this roster yet.' : `No members in "${filter}" status.`}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">{touchLabel(1)}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">{touchLabel(2)}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">{touchLabel(3)}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(member => (
                  <tr key={member.id} className="border-b border-gray-50 hover:bg-orange-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: ACCENT }}>
                          {member.first_name[0]}{member.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{member.first_name} {member.last_name}</p>
                          {member.phone && <p className="text-xs text-gray-400">{member.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><TouchCell member={member} touch={1} /></td>
                    <td className="px-4 py-3"><TouchCell member={member} touch={2} /></td>
                    <td className="px-4 py-3"><TouchCell member={member} touch={3} /></td>
                    <td className="px-4 py-3"><StatusBadge status={member.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/letters/ministry-followup/${member.id}?ministry_type=${type}`}
                        target="_blank"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:border-orange-200 transition-colors whitespace-nowrap"
                      >
                        🖨️ Print Letter
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Log Touch Modal */}
      {touchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setTouchModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
                Log {touchLabel(touchModal.touch)}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{touchModal.member.first_name} {touchModal.member.last_name}</p>
            </div>
            <div className="p-6 space-y-4">
              {touchModal.member[`touch${touchModal.touch}_completed` as keyof Member] && (
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-green-700">Already logged on {fmt(touchModal.member[`touch${touchModal.touch}_date` as keyof Member] as string | null)} — you can update below.</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                <input type="date" value={touchDate} onChange={e => setTouchDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea value={touchNote} onChange={e => setTouchNote(e.target.value)} rows={3} placeholder="How did it go? Any prayer requests?" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setTouchModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={logTouch} disabled={logging} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>
                  {logging ? "Saving…" : "✅ Mark Complete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>Follow Up Settings</h2>
              <p className="text-sm text-gray-500 mt-1">{cfg.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Frequency</label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  {(['monthly', 'bimonthly'] as const).map(f => (
                    <button key={f} onClick={() => setSettingsForm(s => ({ ...s, frequency: f }))} className="flex-1 py-2.5 text-sm font-bold transition-colors capitalize" style={{ backgroundColor: settingsForm.frequency === f ? ACCENT : "white", color: settingsForm.frequency === f ? "white" : "#374151" }}>
                      {f === 'bimonthly' ? 'Bi-Monthly' : 'Monthly'}
                    </button>
                  ))}
                </div>
              </div>
              {([1, 2, 3] as const).map(n => (
                <div key={n}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Touch {n} Label</label>
                  <input
                    value={settingsForm[`touch${n}_label` as keyof Settings] as string}
                    onChange={e => setSettingsForm(s => ({ ...s, [`touch${n}_label`]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSettings(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={saveSettings} disabled={savingSettings} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>
                  {savingSettings ? "Saving…" : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MinistryShell>
  );
}
