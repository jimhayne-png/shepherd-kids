"use client";

import { use, useEffect, useState, useCallback } from "react";

const CM_ACCENT = "#F28C28";

type Season = {
  id: string; name: string; reward_description: string | null; reward_date: string | null; status: string;
};
type Team = {
  id: string; name: string; color: string; mascot: string | null;
  total_points: number; member_count: number;
  captain: { first_name: string; last_name: string } | null;
};

const ORDINALS = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

export default function LeaderboardPage({ params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = use(params);
  const [season, setSeason] = useState<Season | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [animating, setAnimating] = useState(false);

  const load = useCallback(async (animate = false) => {
    try {
      const res = await fetch(`/api/children-ministry/leaderboard/${seasonId}`);
      if (!res.ok) { setError("Season not found"); return; }
      const data = await res.json();
      if (animate) {
        setAnimating(true);
        setTimeout(() => setAnimating(false), 800);
      }
      setSeason(data.season);
      setTeams(data.teams);
      setLastRefresh(new Date());
    } catch {
      setError("Unable to load leaderboard");
    }
  }, [seasonId]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1A1A1A" }}>
        <p className="text-white text-2xl">{error}</p>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1A1A1A" }}>
        <div className="text-center">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-white text-2xl" style={{ fontFamily: "Georgia, serif" }}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#111827", fontFamily: "Georgia, serif" }}>
      {/* Header */}
      <div className="py-10 px-12 text-center" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${CM_ACCENT} 100%)` }}>
        <p className="text-orange-100 text-xl font-medium mb-2">Children's Ministry</p>
        <h1 className="text-6xl font-black text-white mb-4">{season.name}</h1>
        {season.reward_description && (
          <div className="inline-block bg-white/20 backdrop-blur rounded-2xl px-8 py-4">
            <p className="text-white text-2xl font-bold">
              🎉 Working toward: {season.reward_description}
              {season.reward_date && ` · ${new Date(season.reward_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}`}
            </p>
          </div>
        )}
      </div>

      {/* Team cards */}
      <div className="flex-1 px-12 py-10">
        {teams.length === 0 ? (
          <div className="text-center text-gray-400 text-2xl mt-20">No teams yet</div>
        ) : (
          <div className={`grid gap-6 ${teams.length <= 2 ? "grid-cols-2" : teams.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
            {teams.map((team, idx) => (
              <div
                key={team.id}
                className="rounded-3xl p-8 text-white flex flex-col relative overflow-hidden transition-all duration-700"
                style={{
                  backgroundColor: team.color,
                  transform: animating && idx === 0 ? "scale(1.03)" : "scale(1)",
                  boxShadow: idx === 0 ? `0 0 60px ${team.color}80` : "0 8px 30px rgba(0,0,0,0.4)",
                }}
              >
                {/* Rank badge */}
                <div className="absolute top-5 right-5 text-4xl">
                  {idx === 0 ? "👑" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                </div>

                <p className="text-lg font-bold uppercase tracking-widest opacity-75 mb-2">
                  {ORDINALS[idx + 1] ?? `${idx + 1}th`} Place
                </p>
                <h2 className="text-4xl font-black mb-1 leading-tight">{team.name}</h2>
                {team.mascot && <p className="text-xl opacity-75 mb-4">{team.mascot}</p>}

                <div className="mt-auto">
                  <p className="text-7xl font-black leading-none mb-2">
                    {Number(team.total_points).toLocaleString()}
                  </p>
                  <p className="text-xl opacity-75">points</p>

                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-lg opacity-75">{team.member_count} members</p>
                    {team.captain && (
                      <p className="text-sm opacity-60 mt-1">Captain: {team.captain.first_name} {team.captain.last_name}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-4 px-12 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <p className="text-gray-500 text-sm">ShepherdKids · Children's Ministry</p>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-gray-500 text-sm">
            Live · refreshes every 30s · last updated {lastRefresh.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
      </div>
    </div>
  );
}
