"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MinistryShell from "@/components/layout/MinistryShell";
import { MINISTRY_CONFIG } from "@/lib/ministry-config";

type BirthdayEntry = {
  member_id: string;
  first_name: string;
  last_name: string;
  event_type: "birthday" | "anniversary";
  date: string;
  age: number | null;
  is_milestone: boolean;
};

function getMilestones(years: number | null, type: "birthday" | "anniversary"): boolean {
  if (!years) return false;
  const bMilestones = new Set([1,5,10,16,18,21,25,30,40,50,60,70,75,80]);
  const aMilestones = new Set([1,5,10,15,20,25,30,40,50]);
  return type === "birthday" ? bMilestones.has(years) : aMilestones.has(years);
}

function calcAge(dateStr: string, eventType: "birthday" | "anniversary"): number | null {
  if (!dateStr) return null;
  const birth = new Date(dateStr + "T00:00:00");
  if (isNaN(birth.getTime()) || birth.getFullYear() < 1900) return null;
  const today = new Date();
  return today.getFullYear() - birth.getFullYear();
}

export default function MinistryBirthdaysPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const cfg = MINISTRY_CONFIG[type];

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<BirthdayEntry[]>([]);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;

      // Get roster members
      const rosterRes = await fetch(`/api/ministry/${type}/roster`, { headers: { Authorization: `Bearer ${t}` } });
      if (!rosterRes.ok) { setLoading(false); return; }
      const rosterData = await rosterRes.json();
      const roster = rosterData.roster ?? [];

      // Get member details with birthdate/anniversary
      const memberIds = roster.map((r: any) => r.member_id);
      if (!memberIds.length) { setLoading(false); return; }

      const membersRes = await fetch("/api/members", { headers: { Authorization: `Bearer ${t}` } });
      const membersData = await membersRes.json();
      const allMembers: any[] = membersData.members ?? [];
      const rosterSet = new Set(memberIds);
      const rosterMembers = allMembers.filter((m: any) => rosterSet.has(m.id));

      const now = new Date();
      const thisMonth = now.getMonth() + 1;
      const today = now.getDate();

      const result: BirthdayEntry[] = [];
      for (const m of rosterMembers) {
        if (m.birthdate) {
          const d = new Date(m.birthdate + "T00:00:00");
          if (d.getMonth() + 1 === thisMonth) {
            const age = calcAge(m.birthdate, "birthday");
            result.push({ member_id: m.id, first_name: m.first_name, last_name: m.last_name, event_type: "birthday", date: m.birthdate, age, is_milestone: getMilestones(age, "birthday") });
          }
        }
        if (m.anniversary) {
          const d = new Date(m.anniversary + "T00:00:00");
          if (d.getMonth() + 1 === thisMonth) {
            const years = calcAge(m.anniversary, "anniversary");
            result.push({ member_id: m.id, first_name: m.first_name, last_name: m.last_name, event_type: "anniversary", date: m.anniversary, age: years, is_milestone: getMilestones(years, "anniversary") });
          }
        }
      }

      result.sort((a, b) => {
        const da = new Date(a.date + "T00:00:00").getDate();
        const db = new Date(b.date + "T00:00:00").getDate();
        return da - db;
      });

      setEntries(result);
      setLoading(false);
    }
    init();
  }, [type, router]);

  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  return (
    <MinistryShell type={type}>
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 100%)" }}>
        <Link href={`/dashboard/ministry/${type}`} className="text-green-300 text-xs mb-1 block hover:text-white">← {cfg?.name}</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>🎂 Birthdays & Anniversaries</h1>
        <p className="text-green-200 text-sm mt-1">{monthName} · {entries.length} celebration{entries.length !== 1 ? "s" : ""} this month</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {entries.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-5xl mb-4">🎂</div>
            <p className="text-gray-400">No birthdays or anniversaries in {monthName} for {cfg?.name} members.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((e, i) => {
              const day = new Date(e.date + "T00:00:00").getDate();
              return (
                <div key={`${e.member_id}-${e.event_type}`} className="bg-white rounded-2xl shadow border border-gray-100 px-5 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: e.event_type === "birthday" ? "#fef3c7" : "#fce7f3" }}>
                    {e.event_type === "birthday" ? "🎂" : "💍"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-gray-900">{e.first_name} {e.last_name}</p>
                      {e.is_milestone && e.age && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: "#F28C28", color: "white" }}>
                          🎉 {e.age}{e.event_type === "birthday" ? "th Birthday" : "th Anniversary"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {e.event_type === "birthday" ? "Birthday" : "Anniversary"} — {monthName} {day}
                      {e.age && !e.is_milestone ? ` · ${e.age} ${e.event_type === "birthday" ? "years old" : "years"}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/members/${e.member_id}/edit`}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:border-green-300 transition-colors flex-shrink-0"
                  >
                    View
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MinistryShell>
  );
}
