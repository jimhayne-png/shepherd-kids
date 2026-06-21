"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();
const ACCENT = "#7B2CBF";

type Child = { id: string; first_name: string; last_name: string; date_of_birth: string | null; parent_name?: string | null };
type SpiritualEntry = { id: string; child_id: string; completed_at: string; notes: string | null; first_name: string; last_name: string };

function upcomingBirthdays(children: Child[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: { child: Child; next: Date; daysAway: number; age: number }[] = [];
  for (const child of children) {
    if (!child.date_of_birth) continue;
    const dob = new Date(child.date_of_birth + "T00:00:00");
    const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    const daysAway = Math.round((next.getTime() - today.getTime()) / 86400000);
    const age = next.getFullYear() - dob.getFullYear();
    if (daysAway <= days) results.push({ child, next, daysAway, age });
  }
  return results.sort((a, b) => a.daysAway - b.daysAway);
}

function upcomingSpiritualBirthdays(entries: SpiritualEntry[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: { entry: SpiritualEntry; next: Date; daysAway: number; years: number }[] = [];
  for (const entry of entries) {
    const saved = new Date(entry.completed_at + "T00:00:00");
    const next = new Date(today.getFullYear(), saved.getMonth(), saved.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    const daysAway = Math.round((next.getTime() - today.getTime()) / 86400000);
    const years = next.getFullYear() - saved.getFullYear();
    if (daysAway <= days) results.push({ entry, next, daysAway, years });
  }
  return results.sort((a, b) => a.daysAway - b.daysAway);
}

function fmtMonthDay(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function BirthdaysPage() {
  const router = useRouter();
  const selectedChurchIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [spiritualEntries, setSpiritualEntries] = useState<SpiritualEntry[]>([]);

  function ch(): Record<string, string> {
    return selectedChurchIdRef.current ? { "x-selected-church-id": selectedChurchIdRef.current } : {};
  }

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const urlParams = new URLSearchParams(window.location.search);
      selectedChurchIdRef.current = urlParams.get("churchId") ?? localStorage.getItem("selected_church_id");
      const [childrenRes, spiritualRes] = await Promise.all([
        fetch("/api/children-ministry/children", { credentials: "include", headers: ch() }),
        fetch("/api/children-ministry/spiritual-birthdays", { credentials: "include", headers: ch() }),
      ]);
      if (childrenRes.ok) { const d = await childrenRes.json(); setChildren(d.children ?? []); }
      if (spiritualRes.ok) { const d = await spiritualRes.json(); setSpiritualEntries(d.entries ?? []); }
      setLoading(false);
    }
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#08060D" }}>
        <div style={{ color: "#D8D8E8" }}>Loading…</div>
      </div>
    );
  }

  const birthdaysThisMonth = upcomingBirthdays(children, 30);
  const spiritualThisMonth = upcomingSpiritualBirthdays(spiritualEntries, 30);

  return (
    <AppShell navItems={[]}>
      <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p className="text-sm mb-1" style={{ color: "#D4AF37" }}>ShepherdKids</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Celebrations</h1>
        <p className="text-sm mt-1" style={{ color: "#D8D8E8" }}>Upcoming birthdays and spiritual birthdays in the next 30 days</p>
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4" style={{ marginBottom: "28px", maxWidth: "480px" }}>
          {[
            { label: "Birthdays This Month", value: birthdaysThisMonth.length, emoji: "🎂", color: "#D4AF37" },
            { label: "Spiritual Birthdays", value: spiritualThisMonth.length, emoji: "✝️", color: ACCENT },
          ].map(s => (
            <div key={s.label} style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "14px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0, backgroundColor: s.color + "22" }}>{s.emoji}</div>
              <div>
                <p style={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", margin: 0, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: "11px", color: "#A9A9B8", margin: "3px 0 0" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Birthdays */}
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", margin: "0 0 14px", fontFamily: "Georgia, serif" }}>🎂 Upcoming Birthdays</h2>
        {birthdaysThisMonth.length === 0 ? (
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "14px", padding: "32px", textAlign: "center", marginBottom: "32px" }}>
            <p style={{ color: "#A9A9B8", margin: 0 }}>No birthdays in the next 30 days.</p>
          </div>
        ) : (
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "14px", overflow: "hidden", marginBottom: "32px" }}>
            {birthdaysThisMonth.map((item, i) => (
              <div key={item.child.id} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", borderTop: i > 0 ? "1px solid rgba(212,175,55,0.1)" : "none" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#D4AF3722", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🎂</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: "#ffffff", fontSize: "14px", margin: 0 }}>{item.child.first_name} {item.child.last_name}</p>
                  {item.child.parent_name && <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "2px 0 0" }}>{item.child.parent_name}</p>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#D4AF37", margin: 0 }}>{fmtMonthDay(item.next)}</p>
                  <p style={{ fontSize: "11px", color: "#A9A9B8", margin: "2px 0 0" }}>
                    {item.daysAway === 0 ? "Today! 🎉" : item.daysAway === 1 ? "Tomorrow" : `${item.daysAway} days`} · Turns {item.age}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Spiritual Birthdays */}
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", margin: "0 0 14px", fontFamily: "Georgia, serif" }}>✝️ Upcoming Spiritual Birthdays</h2>
        {spiritualThisMonth.length === 0 ? (
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "14px", padding: "32px", textAlign: "center" }}>
            <p style={{ color: "#A9A9B8", margin: 0 }}>No spiritual birthdays in the next 30 days.</p>
          </div>
        ) : (
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "14px", overflow: "hidden" }}>
            {spiritualThisMonth.map((item, i) => (
              <div key={item.entry.id} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", borderTop: i > 0 ? "1px solid rgba(212,175,55,0.1)" : "none" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: ACCENT + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>✝️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: "#ffffff", fontSize: "14px", margin: 0 }}>{item.entry.first_name} {item.entry.last_name}</p>
                  <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "2px 0 0" }}>{item.years} year{item.years !== 1 ? "s" : ""} in faith</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#9D4EDD", margin: 0 }}>{fmtMonthDay(item.next)}</p>
                  <p style={{ fontSize: "11px", color: "#A9A9B8", margin: "2px 0 0" }}>
                    {item.daysAway === 0 ? "Today! 🎉" : item.daysAway === 1 ? "Tomorrow" : `${item.daysAway} days`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </AppShell>
  );
}
