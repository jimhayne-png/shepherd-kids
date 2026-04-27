"use client";

import { use } from "react";
import Link from "next/link";
import MinistryShell from "@/components/layout/MinistryShell";
import { MINISTRY_CONFIG } from "@/lib/ministry-config";

const GROWTH_TRACKS = [
  { emoji: "📖", label: "Bible Reading", desc: "Daily reading streaks and accountability" },
  { emoji: "🙏", label: "Prayer Consistency", desc: "Personal prayer logs and group intercession" },
  { emoji: "🤝", label: "Serving Hours", desc: "Track volunteer and ministry hours" },
  { emoji: "👥", label: "Small Group Participation", desc: "Attendance and engagement in small groups" },
  { emoji: "💛", label: "Giving Milestones", desc: "First-time giver, consistent giver recognition" },
  { emoji: "📚", label: "Study Completion", desc: "Books, courses, and curriculum progress" },
];

export default function GrowthModulePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const cfg = MINISTRY_CONFIG[type];

  return (
    <MinistryShell type={type}>
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 100%)" }}>
        <Link href={`/dashboard/ministry/${type}`} className="text-green-300 text-xs mb-1 block hover:text-white">← {cfg?.name}</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>🌱 Growth Module</h1>
        <p className="text-green-200 text-sm mt-1">Adult discipleship & spiritual growth tracking</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-2xl shadow p-8 mb-6 text-center">
            <div className="text-5xl mb-4">🌱</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2" style={{ fontFamily: "Georgia, serif" }}>Adult Growth Module</h2>
            <p className="text-gray-500 mb-1">Coming in Part D</p>
            <p className="text-sm text-gray-400">{cfg?.name}</p>
          </div>

          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">What will be tracked</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GROWTH_TRACKS.map(track => (
              <div key={track.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3 items-start">
                <span className="text-2xl flex-shrink-0">{track.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-gray-800">{track.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{track.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
            <strong>Note:</strong> The Growth Module will allow each member to track their own discipleship journey while giving ministry leaders a high-level view of engagement across the ministry.
          </div>
        </div>
      </div>
    </MinistryShell>
  );
}
