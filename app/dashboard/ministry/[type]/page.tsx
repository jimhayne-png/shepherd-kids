"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MinistryShell from "@/components/layout/MinistryShell";
import { MINISTRY_CONFIG } from "@/lib/ministry-config";
import { ProLockedOverlay } from "@/components/ProLockedOverlay";

const ACCENT = "#F28C28";

export default function MinistryOverviewPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const cfg = MINISTRY_CONFIG[type];

  const [loading, setLoading] = useState(true);
  const [hasPro, setHasPro] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [totalMembers, setTotalMembers] = useState(0);
  const [presentLastSession, setPresentLastSession] = useState<number | null>(null);
  const [lastSessionDate, setLastSessionDate] = useState<string | null>(null);
  const [pipelineHealth, setPipelineHealth] = useState<number | null>(null);
  const [recentJoins, setRecentJoins] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);

      const [proRes, rosterRes, attRes] = await Promise.all([
        type === "drama"
          ? fetch("/api/addons/ministry-pro", { headers: { Authorization: `Bearer ${t}` } })
          : Promise.resolve(null),
        fetch(`/api/ministry/${type}/roster`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`/api/ministry/${type}/attendance?sessions=1`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);

      if (proRes) {
        const pd = proRes.ok ? await proRes.json() : { active: false };
        setHasPro(pd.active ?? false);
      } else {
        setHasPro(true);
      }

      const rosterData = await rosterRes.json();
      const attData = await attRes.json();

      const roster: any[] = rosterData.roster ?? [];
      setTotalMembers(roster.length);
      setRecentJoins(roster.slice(0, 5));

      // Pipeline health: % past stage index 1 (Regular)
      if (cfg && roster.length > 0) {
        const advancedCount = roster.filter((r: any) => {
          const idx = cfg.stages.indexOf(r.pipeline_stage ?? "");
          return idx >= 2;
        }).length;
        setPipelineHealth(Math.round((advancedCount / roster.length) * 100));
      }

      // Last session attendance
      const sessions: string[] = attData.sessions ?? [];
      const records: any[] = attData.records ?? [];
      if (sessions.length > 0) {
        const latest = sessions[0];
        setLastSessionDate(latest);
        const presentCount = records.filter((r: any) => r.session_date === latest && r.present).length;
        setPresentLastSession(presentCount);
      }

      setLoading(false);
    }
    init();
  }, [type, router, cfg]);

  if (!cfg) return (
    <MinistryShell type={type}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Ministry type "{type}" not found.</p>
      </div>
    </MinistryShell>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400">Loading…</div>
    </div>
  );

  if (hasPro === false && type === "drama") {
    return (
      <MinistryShell type={type}>
        <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 100%)" }}>
          <p className="text-green-300 text-sm mb-1">Overview</p>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
            {cfg.emoji} {cfg.name}
          </h1>
        </div>
        <ProLockedOverlay />
      </MinistryShell>
    );
  }

  return (
    <MinistryShell type={type}>
      {/* Hero */}
      <div className="px-8 py-8" style={{ background: `linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 100%)` }}>
        <p className="text-green-300 text-sm mb-1">Overview</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
          {cfg.emoji} {cfg.name}
        </h1>
        <p className="text-green-200 text-sm mt-1">This ministry is active</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Members", value: totalMembers, emoji: "👥" },
            { label: "Present Last Session", value: presentLastSession ?? "—", emoji: "✅" },
            { label: "Active Follow Ups", value: 0, emoji: "📋" },
            { label: "Pipeline Health", value: pipelineHealth !== null ? `${pipelineHealth}%` : "—", emoji: "📈" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm px-5 py-4 flex items-center gap-3 border border-gray-100">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: ACCENT + "22" }}>
                {s.emoji}
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Georgia, serif" }}>Quick Actions</h2>
            <div className="space-y-3">
              {[
                { label: "👥  View Roster", href: `/dashboard/ministry/${type}/roster` },
                { label: "📋  Mark Attendance", href: `/dashboard/ministry/${type}/attendance` },
                { label: "📞  Follow Up", href: `/dashboard/ministry/${type}/followup` },
                { label: "📣  Communication", href: `/dashboard/ministry/${type}/communication` },
              ].map(a => (
                <Link key={a.href} href={a.href} className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Georgia, serif" }}>Recent Joins</h2>
            {recentJoins.length === 0 ? (
              <p className="text-gray-400 text-sm">No members on this roster yet.</p>
            ) : (
              <div className="space-y-2">
                {recentJoins.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: ACCENT }}>
                        {r.member?.first_name?.[0]}{r.member?.last_name?.[0]}
                      </div>
                      <p className="text-sm font-medium text-gray-800">{r.member?.first_name} {r.member?.last_name}</p>
                    </div>
                    <span className="text-xs text-gray-400">{r.joined_date ? new Date(r.joined_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                  </div>
                ))}
              </div>
            )}
            {lastSessionDate && (
              <p className="text-xs text-gray-400 mt-4">
                Last session: {new Date(lastSessionDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                {presentLastSession !== null && ` · ${presentLastSession} present`}
              </p>
            )}
          </div>
        </div>
      </div>
    </MinistryShell>
  );
}
