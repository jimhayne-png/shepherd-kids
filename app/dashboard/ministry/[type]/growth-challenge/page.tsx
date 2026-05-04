"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MinistryShell from "@/components/layout/MinistryShell";
import { MINISTRY_CONFIG } from "@/lib/ministry-config";
import { supabase } from "@/lib/supabase";
import { ProLockedOverlay } from "@/components/ProLockedOverlay";

export default function GrowthChallengePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const cfg = MINISTRY_CONFIG[type];
  const router = useRouter();
  const [hasPro, setHasPro] = useState<boolean | null>(null);

  useEffect(() => {
    if (type !== "childrens") { setHasPro(true); return; }
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const res = await fetch("/api/addons/ministry-pro", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const d = res.ok ? await res.json() : { active: false };
      setHasPro(d.active ?? false);
    }
    check();
  }, [type, router]);

  function childrensContent() {
    if (hasPro === null) {
      return <div className="flex items-center justify-center py-20"><div className="text-gray-400">Loading…</div></div>;
    }
    if (hasPro === false) {
      return <ProLockedOverlay />;
    }
    return (
      <div className="bg-white rounded-2xl shadow p-8 text-center max-w-lg mx-auto">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-xl font-bold text-gray-800 mb-3" style={{ fontFamily: "Georgia, serif" }}>Growth Challenge is managed in the Children's Ministry module</h2>
        <p className="text-gray-500 mb-6">Teams, points, seasons, attendance bonuses, and the leaderboard are all managed from the full Children's Ministry dashboard.</p>
        <Link href="/dashboard/children-ministry" className="inline-block px-6 py-3 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: "#F28C28" }}>
          Open Children's Ministry →
        </Link>
      </div>
    );
  }

  return (
    <MinistryShell type={type}>
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 100%)" }}>
        <Link href={`/dashboard/ministry/${type}`} className="text-green-300 text-xs mb-1 block hover:text-white">← {cfg?.name}</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>🏆 Growth Challenge</h1>
        <p className="text-green-200 text-sm mt-1">Team competition & points system</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {type === "childrens" ? childrensContent() : (
          <div className="bg-white rounded-2xl shadow p-8 text-center max-w-lg mx-auto">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-xl font-bold text-gray-800 mb-3" style={{ fontFamily: "Georgia, serif" }}>Growth Challenge — {cfg?.name}</h2>
            <div className="bg-gray-50 rounded-xl p-5 text-left mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Coming in Part D — this module will include:</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>🏅 Team creation with colors, mascots, and captains</li>
                <li>⭐ Points system: attendance, memory verses, bringing friends</li>
                <li>📊 Live leaderboard (TV/projector optimized)</li>
                <li>🔥 Attendance streak bonuses</li>
                <li>🎉 Season management with reward trips</li>
                <li>✂️ Team split when groups reach 12+</li>
              </ul>
            </div>
            <p className="text-xs text-gray-400">Grades covered: {cfg?.grades?.join(", ") ?? "—"}</p>
          </div>
        )}
      </div>
    </MinistryShell>
  );
}
