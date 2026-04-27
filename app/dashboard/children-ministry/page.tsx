"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/dashboard/members" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Attendance", href: "/dashboard/attendance" },
  { label: "Visitors", href: "/dashboard/visitors" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Prayer", href: "/dashboard/prayer" },
  { label: "Communication Hub", href: "/dashboard/communication" },
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "Evangelism", href: "/dashboard/evangelism" },
  { label: "Birthdays", href: "/dashboard/birthdays" },
  { label: "🧒 Children's Ministry", href: "/dashboard/children-ministry" },
  { label: "Settings", href: "/dashboard/settings" },
];

const CM_ACCENT = "#F28C28";

function pts(n: number) { return n.toLocaleString(); }

type Season = {
  id: string; name: string; status: string;
  reward_description: string | null; reward_date: string | null;
  start_date: string; end_date: string;
};

type Team = {
  id: string; name: string; color: string; mascot: string | null;
  total_points: number; member_count: number;
};

type PointEntry = {
  id: string; points: number; category: string; note: string | null;
  created_at: string;
  team: { name: string; color: string } | null;
  child: { first_name: string; last_name: string } | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  attendance: "Attendance", memory_verse: "Memory Verse", friend_referral: "Brought a Friend",
  game_win: "Game Win", participation: "Participation", behavior: "Behavior",
  encouragement: "Encouragement", fundraising: "Fundraising", streak_bonus: "Streak Bonus",
  split_bonus: "Split Bonus", other: "Other",
};

export default function ChildrenMinistryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [recentPoints, setRecentPoints] = useState<PointEntry[]>([]);
  const [childCount, setChildCount] = useState(0);
  const [weekPoints, setWeekPoints] = useState(0);

  // New season modal
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [snName, setSnName] = useState("");
  const [snStart, setSnStart] = useState("");
  const [snWeeks, setSnWeeks] = useState(8);
  const [snReward, setSnReward] = useState("");
  const [snRewardDate, setSnRewardDate] = useState("");
  const [snStatus, setSnStatus] = useState("active");
  const [snSaving, setSnSaving] = useState(false);
  const [snError, setSnError] = useState("");

  // Edit season modal
  const [editSeason, setEditSeason] = useState<Season | null>(null);
  const [esName, setEsName] = useState("");
  const [esStart, setEsStart] = useState("");
  const [esWeeks, setEsWeeks] = useState(8);
  const [esReward, setEsReward] = useState("");
  const [esRewardDate, setEsRewardDate] = useState("");
  const [esStatus, setEsStatus] = useState("active");
  const [esSaving, setEsSaving] = useState(false);
  const [esError, setEsError] = useState("");

  function calcEndDate(start: string, weeks: number): string {
    if (!start) return "";
    const d = new Date(start + "T00:00:00");
    d.setDate(d.getDate() + weeks * 7 - 1);
    return d.toISOString().slice(0, 10);
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);

      const [seasonsRes, childrenRes] = await Promise.all([
        fetch("/api/children-ministry/seasons", { headers: { Authorization: `Bearer ${t}` } }),
        fetch("/api/children-ministry/children", { headers: { Authorization: `Bearer ${t}` } }),
      ]);

      const seasonsData = await seasonsRes.json();
      const childrenData = await childrenRes.json();

      const allSeasons: Season[] = seasonsData.seasons ?? [];
      setSeasons(allSeasons);
      const active = allSeasons.find(s => s.status === 'active') ?? allSeasons[0] ?? null;
      setActiveSeason(active);
      setChildCount((childrenData.children ?? []).length);

      if (active) {
        const [teamsRes, pointsRes] = await Promise.all([
          fetch(`/api/children-ministry/teams?season_id=${active.id}`, { headers: { Authorization: `Bearer ${t}` } }),
          fetch(`/api/children-ministry/points?season_id=${active.id}&limit=10`, { headers: { Authorization: `Bearer ${t}` } }),
        ]);
        const teamsData = await teamsRes.json();
        const pointsData = await pointsRes.json();
        setTeams(teamsData.teams ?? []);

        const pts7days = (pointsData.points ?? []).filter((p: PointEntry) => {
          const d = new Date(p.created_at);
          return d >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        });
        setWeekPoints(pts7days.reduce((sum: number, p: PointEntry) => sum + Number(p.points), 0));
        setRecentPoints(pointsData.points ?? []);
      }

      setLoading(false);
    }
    init();
  }, [router]);

  function openEditSeason(s: Season) {
    setEditSeason(s);
    setEsName(s.name); setEsStart(s.start_date); setEsReward(s.reward_description ?? ""); setEsRewardDate(s.reward_date ?? ""); setEsStatus(s.status);
    // Infer weeks from start/end if stored
    const ms = new Date(s.end_date + "T00:00:00").getTime() - new Date(s.start_date + "T00:00:00").getTime();
    const inferredWeeks = Math.round(ms / (7 * 24 * 60 * 60 * 1000)) + 1;
    setEsWeeks([6, 8, 12].includes(inferredWeeks) ? inferredWeeks : 8);
    setEsError("");
  }

  async function saveSeason() {
    if (!editSeason || !esName.trim() || !esStart) { setEsError("Name and start date required"); return; }
    setEsSaving(true); setEsError("");
    const endDate = calcEndDate(esStart, esWeeks);
    const res = await fetch("/api/children-ministry/seasons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: editSeason.id, name: esName, startDate: esStart, endDate, rewardDescription: esReward, rewardDate: esRewardDate, status: esStatus }),
    });
    if (!res.ok) { const d = await res.json(); setEsError(d.error ?? "Error"); setEsSaving(false); return; }
    setEsSaving(false); setEditSeason(null);
    window.location.reload();
  }

  async function createSeason() {
    if (!snName.trim() || !snStart) { setSnError("Name and start date required"); return; }
    setSnSaving(true); setSnError("");
    const endDate = calcEndDate(snStart, snWeeks);
    const res = await fetch("/api/children-ministry/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: snName, startDate: snStart, endDate, seasonLengthWeeks: snWeeks, rewardDescription: snReward, rewardDate: snRewardDate, status: snStatus }),
    });
    if (!res.ok) { const d = await res.json(); setSnError(d.error ?? "Error"); setSnSaving(false); return; }
    setShowSeasonModal(false);
    router.refresh();
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400" style={{ fontFamily: "Georgia, serif" }}>Loading…</div>
      </div>
    );
  }

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${CM_ACCENT} 100%)` }}>
        <p className="text-orange-100 text-sm font-medium mb-1">Children's Ministry · 3rd–6th Grade</p>
        <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: "Georgia, serif" }}>
          {activeSeason ? activeSeason.name : "Children's Ministry"}
        </h1>
        {activeSeason?.reward_description && (
          <p className="text-orange-100 text-sm mt-1">
            🎉 Working toward: <strong>{activeSeason.reward_description}</strong>
            {activeSeason.reward_date && ` · ${new Date(activeSeason.reward_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}`}
          </p>
        )}
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 -mt-6">
          {[
            { label: "Total Children", value: childCount, emoji: "🧒" },
            { label: "Active Teams", value: teams.length, emoji: "🏆" },
            { label: "Current Season", value: activeSeason?.name ?? "—", emoji: "📅", isText: true },
            { label: "Points This Week", value: pts(weekPoints), emoji: "⭐", isText: true },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-md px-5 py-4 flex items-center gap-3 border border-gray-100">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: CM_ACCENT + "22" }}>
                {s.emoji}
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.isText ? s.value : s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* No season state */}
        {!activeSeason && (
          <div className="bg-white rounded-2xl shadow p-10 text-center mb-8">
            <div className="text-5xl mb-4">🧒</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2" style={{ fontFamily: "Georgia, serif" }}>No Active Season</h2>
            <p className="text-gray-500 mb-6">Create a season to start tracking teams, points, and attendance.</p>
            <button onClick={() => setShowSeasonModal(true)} className="px-6 py-3 rounded-xl font-bold text-white" style={{ backgroundColor: CM_ACCENT }}>
              + Create First Season
            </button>
          </div>
        )}

        {activeSeason && (
          <>
            {/* Team Leaderboard */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Team Leaderboard</h2>
                <Link href={`/dashboard/children-ministry/leaderboard/${activeSeason.id}`} target="_blank" className="text-xs font-medium px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: CM_ACCENT }}>
                  📺 TV View
                </Link>
              </div>
              {teams.length === 0 ? (
                <div className="bg-white rounded-2xl shadow p-8 text-center">
                  <p className="text-gray-400">No teams yet. <Link href="/dashboard/children-ministry/teams" className="underline" style={{ color: CM_ACCENT }}>Create teams →</Link></p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team, idx) => (
                    <div key={team.id} className="rounded-2xl shadow-md p-6 text-white relative overflow-hidden" style={{ backgroundColor: team.color }}>
                      {idx === 0 && <div className="absolute top-3 right-4 text-2xl">👑</div>}
                      <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">#{idx + 1}</p>
                      <h3 className="text-xl font-bold mb-0.5" style={{ fontFamily: "Georgia, serif" }}>{team.name}</h3>
                      {team.mascot && <p className="text-sm opacity-75 mb-3">{team.mascot}</p>}
                      <p className="text-3xl font-black">{pts(Number(team.total_points))}</p>
                      <p className="text-sm opacity-75 mt-1">{team.member_count} members</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Georgia, serif" }}>Quick Actions</h2>
                <div className="space-y-3">
                  {[
                    { label: "⭐  Award Points", href: "/dashboard/children-ministry/points" },
                    { label: "📋  Mark Attendance", href: "/dashboard/children-ministry/attendance" },
                    { label: "🧒  Add Child", href: "/dashboard/children-ministry/children" },
                    { label: "👥  Manage Teams", href: "/dashboard/children-ministry/teams" },
                    { label: "📧  Parent Update", href: "/dashboard/children-ministry/parent-update" },
                  ].map((a) => (
                    <Link key={a.href} href={a.href} className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ backgroundColor: CM_ACCENT }}>
                      {a.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6">
                <h2 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Georgia, serif" }}>Recent Point Awards</h2>
                {recentPoints.length === 0 ? (
                  <p className="text-gray-400 text-sm">No points awarded yet this season.</p>
                ) : (
                  <div className="space-y-2">
                    {recentPoints.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          {p.team && (
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.team.color }} />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {p.child ? `${p.child.first_name} ${p.child.last_name}` : p.team?.name ?? "—"}
                            </p>
                            <p className="text-xs text-gray-400">{CATEGORY_LABELS[p.category] ?? p.category}{p.note ? ` · ${p.note}` : ""}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold" style={{ color: CM_ACCENT }}>+{pts(Number(p.points))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* New Season Modal */}
        {showSeasonModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setShowSeasonModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-6" style={{ fontFamily: "Georgia, serif" }}>Create Season</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Season Name *</label>
                  <input value={snName} onChange={e => setSnName(e.target.value)} placeholder="Spring 2026" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Season Length *</label>
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                    {([
                      { weeks: 6, label: "6 Weeks", sub: "Quick Season" },
                      { weeks: 8, label: "8 Weeks", sub: "Standard Season" },
                      { weeks: 12, label: "12 Weeks", sub: "Full Season" },
                    ] as const).map(opt => (
                      <button
                        key={opt.weeks}
                        onClick={() => setSnWeeks(opt.weeks)}
                        className="flex-1 py-2.5 px-2 text-center transition-colors"
                        style={{ backgroundColor: snWeeks === opt.weeks ? CM_ACCENT : "white", color: snWeeks === opt.weeks ? "white" : "#374151" }}
                      >
                        <p className="text-xs font-bold">{opt.label}</p>
                        <p className="text-xs opacity-75">{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
                    <input type="date" value={snStart} onChange={e => setSnStart(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End Date (calculated)</label>
                    <div className="px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500">
                      {snStart ? new Date(calcEndDate(snStart, snWeeks) + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reward Trip</label>
                  <input value={snReward} onChange={e => setSnReward(e.target.value)} placeholder="Six Flags — June 14" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reward Date</label>
                  <input type="date" value={snRewardDate} onChange={e => setSnRewardDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={snStatus} onChange={e => setSnStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                {snError && <p className="text-sm text-red-600">{snError}</p>}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowSeasonModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                  <button onClick={createSeason} disabled={snSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: CM_ACCENT }}>
                    {snSaving ? "Creating…" : "Create Season"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Seasons list */}
        {seasons.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">All Seasons</h2>
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              {seasons.map(s => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.status}
                    </span>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.start_date} – {s.end_date}</p>
                  </div>
                  <button onClick={() => openEditSeason(s)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:border-orange-300 transition-colors">
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Season Modal */}
      {editSeason && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setEditSeason(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6" style={{ fontFamily: "Georgia, serif" }}>Edit Season</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Season Name *</label>
                <input value={esName} onChange={e => setEsName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Season Length</label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  {([{ weeks: 6, label: "6 Weeks", sub: "Quick" }, { weeks: 8, label: "8 Weeks", sub: "Standard" }, { weeks: 12, label: "12 Weeks", sub: "Full" }] as const).map(opt => (
                    <button key={opt.weeks} onClick={() => setEsWeeks(opt.weeks)} className="flex-1 py-2.5 px-2 text-center transition-colors" style={{ backgroundColor: esWeeks === opt.weeks ? CM_ACCENT : "white", color: esWeeks === opt.weeks ? "white" : "#374151" }}>
                      <p className="text-xs font-bold">{opt.label}</p>
                      <p className="text-xs opacity-75">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
                  <input type="date" value={esStart} onChange={e => setEsStart(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date (calculated)</label>
                  <div className="px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500">
                    {esStart ? new Date(calcEndDate(esStart, esWeeks) + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reward Trip</label>
                <input value={esReward} onChange={e => setEsReward(e.target.value)} placeholder="Six Flags — June 14" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reward Date</label>
                <input type="date" value={esRewardDate} onChange={e => setEsRewardDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={esStatus} onChange={e => setEsStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              {esError && <p className="text-sm text-red-600">{esError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditSeason(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={saveSeason} disabled={esSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: CM_ACCENT }}>
                  {esSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
