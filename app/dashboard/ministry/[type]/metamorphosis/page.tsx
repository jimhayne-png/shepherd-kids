"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MinistryShell from "@/components/layout/MinistryShell";
import { MINISTRY_CONFIG } from "@/lib/ministry-config";
import { ProLockedOverlay } from "@/components/ProLockedOverlay";

const ACCENT = "#F28C28";

const COHORT_INFO: Record<string, { title: string; desc: string; type: "junior" | "senior"; from: string; to: string }> = {
  childrens: { title: "Metamorphosis Jr.", desc: "6th graders transition to Middle School, mentored by 11th & 12th graders.", type: "junior", from: "Children's Ministry", to: "Middle School" },
  "middle-school": { title: "Metamorphosis", desc: "8th graders transition to High School, mentored by Young Adults.", type: "senior", from: "Middle School", to: "High School" },
  "high-school": { title: "Metamorphosis Sr.", desc: "12th graders transition into Young Adults, mentored by established Young Adults.", type: "senior", from: "High School", to: "Young Adults" },
};

function currentWeek(startDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const diff = Date.now() - start.getTime();
  return Math.min(6, Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1));
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MinistryMetamorphosisPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const cfg = MINISTRY_CONFIG[type];
  const info = COHORT_INFO[type];

  const [loading, setLoading] = useState(true);
  const [hasPro, setHasPro] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", start_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);

      const gated = type === "middle-school" || type === "high-school";
      const [proRes, cohortRes] = await Promise.all([
        gated
          ? fetch("/api/addons/ministry-pro", { headers: { Authorization: `Bearer ${t}` } })
          : Promise.resolve(null),
        fetch(`/api/metamorphosis/cohorts?ministry_type=${type}`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);

      if (proRes) {
        const pd = proRes.ok ? await proRes.json() : { active: false };
        setHasPro(pd.active ?? false);
      } else {
        setHasPro(true);
      }

      if (cohortRes.ok) { const d = await cohortRes.json(); setCohorts(d.cohorts ?? []); }
      setLoading(false);
    }
    init();
  }, [type, router]);

  useEffect(() => {
    if (info) {
      const year = new Date().getFullYear();
      const month = new Date().toLocaleDateString("en-US", { month: "long" });
      setForm(f => ({ ...f, name: `${month} ${year} ${info.title}` }));
    }
  }, [info]);

  async function createCohort() {
    if (!form.name.trim() || !form.start_date) { setCreateError("Name and start date required"); return; }
    setCreating(true); setCreateError("");
    const res = await fetch("/api/metamorphosis/cohorts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: form.name, cohort_type: info?.type ?? "junior", start_date: form.start_date, notes: form.notes }),
    });
    if (!res.ok) { const d = await res.json(); setCreateError(d.error ?? "Error"); setCreating(false); return; }
    const d = await res.json();
    router.push(`/dashboard/metamorphosis/${d.cohort.id}`);
  }

  const endDate = (start: string) => {
    const d = new Date(start + "T00:00:00"); d.setDate(d.getDate() + 42);
    return d.toISOString().slice(0, 10);
  };

  const activeCohort = cohorts.find((c: any) => c.status === "active");
  const pastCohorts = cohorts.filter((c: any) => c.status === "completed");
  const upcomingCohorts = cohorts.filter((c: any) => c.status === "upcoming");

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  if (!info) return (
    <MinistryShell type={type}>
      <div className="p-8 text-gray-500">Metamorphosis is not available for this ministry type.</div>
    </MinistryShell>
  );

  if (hasPro === false && (type === "middle-school" || type === "high-school")) {
    return (
      <MinistryShell type={type}>
        <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 100%)" }}>
          <Link href={`/dashboard/ministry/${type}`} className="text-green-300 text-xs mb-1 block hover:text-white">← {cfg?.name}</Link>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>🦋 {info.title}</h1>
          <p className="text-green-200 text-sm mt-1">{info.desc}</p>
        </div>
        <ProLockedOverlay />
      </MinistryShell>
    );
  }

  return (
    <MinistryShell type={type}>
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 100%)" }}>
        <Link href={`/dashboard/ministry/${type}`} className="text-green-300 text-xs mb-1 block hover:text-white">← {cfg?.name}</Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>🦋 {info.title}</h1>
            <p className="text-green-200 text-sm mt-1">{info.desc}</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-white" style={{ backgroundColor: ACCENT }}>
            + Create Cohort
          </button>
        </div>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-2xl shadow p-5 mb-6 flex items-center gap-4">
          <div className="text-3xl">🦋</div>
          <div>
            <p className="font-bold text-gray-800">{info.from} → {info.to}</p>
            <p className="text-sm text-gray-400">6-week transition program · Mentor-guided · Weekly sessions</p>
          </div>
        </div>

        {activeCohort && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Active Cohort</h2>
            <div className="bg-white rounded-2xl shadow border-l-4 p-5" style={{ borderColor: ACCENT }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-bold text-gray-900 text-lg" style={{ fontFamily: "Georgia, serif" }}>{activeCohort.name}</p>
                  <p className="text-sm text-gray-400">{fmtDate(activeCohort.start_date)} → {fmtDate(activeCohort.end_date)}</p>
                </div>
                <Link href={`/dashboard/metamorphosis/${activeCohort.id}`} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: ACCENT }}>Manage →</Link>
              </div>
              <div className="flex gap-4 text-sm text-gray-500 mb-3">
                <span>👩‍🎓 {activeCohort.student_count} students</span>
                <span>🤝 {activeCohort.mentor_count} mentors</span>
                <span>📅 Week {currentWeek(activeCohort.start_date)} of 6</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full" style={{ width: `${(currentWeek(activeCohort.start_date) / 6) * 100}%`, backgroundColor: ACCENT }} />
              </div>
            </div>
          </div>
        )}

        {upcomingCohorts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Upcoming</h2>
            <div className="space-y-3">
              {upcomingCohorts.map((c: any) => (
                <div key={c.id} className="bg-white rounded-2xl shadow p-4 flex items-center justify-between gap-4">
                  <div><p className="font-bold text-gray-900">{c.name}</p><p className="text-xs text-gray-400">Starts {fmtDate(c.start_date)}</p></div>
                  <Link href={`/dashboard/metamorphosis/${c.id}`} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:border-orange-300 transition-colors">Manage</Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {pastCohorts.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Completed</h2>
            <div className="space-y-2">
              {pastCohorts.map((c: any) => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span>🎓</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">Graduated {c.graduation_date ? fmtDate(c.graduation_date) : fmtDate(c.end_date)} · {c.student_count} students</p>
                    </div>
                  </div>
                  <Link href={`/dashboard/metamorphosis/${c.id}`} className="text-xs font-medium text-gray-400 hover:text-gray-600">View →</Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {cohorts.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-5xl mb-4">🦋</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2" style={{ fontFamily: "Georgia, serif" }}>No cohorts yet</h2>
            <p className="text-gray-400 mb-6">Create your first {info.title} cohort to begin the transition program.</p>
            <button onClick={() => setShowCreate(true)} className="px-6 py-3 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: ACCENT }}>+ Create First Cohort</button>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100"><h2 className="text-xl font-bold" style={{ fontFamily: "Georgia, serif" }}>Create {info.title} Cohort</h2></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Cohort Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label><input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Date (auto)</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-500">{form.start_date ? fmtDate(endDate(form.start_date)) : "—"} (6 weeks)</div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" /></div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={createCohort} disabled={creating} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>{creating ? "Creating…" : "Create"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MinistryShell>
  );
}
