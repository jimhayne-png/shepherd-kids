"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/dashboard/members" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Attendance", href: "/dashboard/attendance" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Prayer", href: "/dashboard/prayer" },
  { label: "Bulletin", href: "/dashboard/bulletin" },
  { label: "Communication Hub", href: "/dashboard/communication" },
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "Reviews", href: "/dashboard/reviews" },
  { label: "Evangelism", href: "/dashboard/evangelism" },
  { label: "Birthdays", href: "/dashboard/birthdays" },
  { label: "Tutorials", href: "/dashboard/tutorials" },
  { label: "Settings", href: "/dashboard/settings" },
];

type PrayerTarget = {
  id: string;
  first_name: string;
  relationship: string;
  status: string;
  pray_for_person: boolean;
  pray_for_opportunity: boolean;
  pray_for_courage: boolean;
  pray_for_holy_spirit: boolean;
  last_prayed_at: string | null;
  prayer_streak: number;
  notes: string | null;
  accepted_christ: boolean;
  accepted_christ_at: string | null;
  connected_to_church: boolean;
};

type Celebration = {
  id: string;
  first_name: string;
  relationship: string | null;
  celebrated_at: string;
};

const STATUS_OPTIONS = [
  { value: "praying", label: "🙏 Praying" },
  { value: "conversation_started", label: "💬 Conversation Started" },
  { value: "gospel_shared", label: "✝️ Gospel Shared" },
  { value: "accepted_christ", label: "🎉 Accepted Christ!" },
];

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  praying: { bg: "#e0f2fe", text: "#0369a1" },
  conversation_started: { bg: "#fef3c7", text: "#92400e" },
  gospel_shared: { bg: "#ede9fe", text: "#6d28d9" },
  accepted_christ: { bg: "#F28C28", text: "#1A4A2E" },
};

type TrackStep = { ref: string; text?: string; isPray?: boolean };

const SHORT_TRACK: TrackStep[] = [
  { ref: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { ref: "John 10:9-10", text: "I am the gate; whoever enters through me will be saved. They will come in and go out, and find pasture. The thief comes only to steal and kill and destroy; I have come that they may have life, and have it to the full." },
  { ref: "Romans 3:22-23", text: "This righteousness is given through faith in Jesus Christ to all who believe. There is no difference between Jew and Gentile, for all have sinned and fall short of the glory of God." },
  { ref: "Romans 6:23", text: "For the wages of sin is death, but the free gift of God is eternal life in Christ Jesus our Lord." },
  { ref: "John 1:12", text: "Yet to all who did receive him, to those who believed in his name, he gave the right to become children of God." },
  { ref: "Romans 10:9", text: 'If you declare with your mouth, "Jesus is Lord," and believe in your heart that God raised him from the dead, you will be saved.' },
  { ref: "Pray the Prayer", isPray: true },
];

const LONG_TRACK: TrackStep[] = [
  { ref: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { ref: "John 10:9-10", text: "I am the gate; whoever enters through me will be saved. They will come in and go out, and find pasture. The thief comes only to steal and kill and destroy; I have come that they may have life, and have it to the full." },
  { ref: "Romans 3:22-23", text: "This righteousness is given through faith in Jesus Christ to all who believe. There is no difference between Jew and Gentile, for all have sinned and fall short of the glory of God." },
  { ref: "Romans 6:23", text: "For the wages of sin is death, but the free gift of God is eternal life in Christ Jesus our Lord." },
  { ref: "Proverbs 14:12", text: "There is a way that appears to be right, but in the end it leads to death." },
  { ref: "Isaiah 59:2", text: "But your iniquities have separated you from your God; your sins have hidden his face from you, so that he will not hear." },
  { ref: "1 Peter 3:18a", text: "For Christ also suffered once for sins, the righteous for the unrighteous, to bring you to God." },
  { ref: "1 Timothy 2:5", text: "For there is one God and one mediator between God and mankind, the man Christ Jesus." },
  { ref: "Romans 5:8", text: "But God demonstrates his own love for us in this: While we were still sinners, Christ died for us." },
  { ref: "Revelation 3:20", text: "Here I am! I stand at the door and knock. If anyone hears my voice and opens the door, I will come in and eat with that person, and they with me." },
  { ref: "John 1:12", text: "Yet to all who did receive him, to those who believed in his name, he gave the right to become children of God." },
  { ref: "Romans 10:9", text: 'If you declare with your mouth, "Jesus is Lord," and believe in your heart that God raised him from the dead, you will be saved.' },
  { ref: "Pray the Prayer", isPray: true },
];

function TrackFlow({ steps }: { steps: TrackStep[] }) {
  return (
    <div>
      {steps.map((step, idx) => (
        <div key={idx}>
          <div className="flex gap-3 py-2">
            {step.isPray ? (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ backgroundColor: "#F28C28", color: "#1A4A2E" }}>✝</div>
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                style={{ backgroundColor: "#1A4A2E" }}>{idx + 1}</div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight"
                style={{ color: step.isPray ? "#d97706" : "#1A4A2E" }}>{step.ref}</p>
              {step.text && <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{step.text}</p>}
            </div>
          </div>
          {idx < steps.length - 1 && (
            <div className="ml-2.5 text-gray-300 text-xs leading-none select-none">↓</div>
          )}
        </div>
      ))}
    </div>
  );
}

function prayedToday(target: PrayerTarget) {
  if (!target.last_prayed_at) return false;
  return new Date(target.last_prayed_at).toDateString() === new Date().toDateString();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function EvangelismPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [targets, setTargets] = useState<PrayerTarget[]>([]);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [celebratingTarget, setCelebratingTarget] = useState<PrayerTarget | null>(null);

  const loadData = useCallback(async (tok: string) => {
    const res = await fetch("/api/prayer-targets", {
      headers: { Authorization: `Bearer ${tok}` },
    });
    const data = await res.json();
    if (res.ok) {
      setTargets(data.targets ?? []);
      setCelebrations(data.celebrations ?? []);
    }
    setDataLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setToken(session.access_token);
      const { data: cu } = await supabase.from("church_users").select("church_id").eq("user_id", session.user.id).maybeSingle();
      if (!cu) { router.replace("/onboarding"); return; }
      setAuthLoading(false);
      await loadData(session.access_token);
    }
    init();
  }, [router, loadData]);

  async function patch(id: string, body: Record<string, unknown>) {
    if (!token) return;
    setUpdatingId(id);
    const res = await fetch(`/api/prayer-targets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) await loadData(token);
    setUpdatingId(null);
  }

  async function handleCheckbox(target: PrayerTarget, field: keyof PrayerTarget) {
    const newVal = !target[field];
    setTargets(prev => prev.map(t => t.id === target.id ? { ...t, [field]: newVal } : t));
    await patch(target.id, { [field]: newVal });
  }

  async function handleMarkPrayed(target: PrayerTarget) {
    if (prayedToday(target)) return;
    const streak = target.prayer_streak;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const lastPrayed = target.last_prayed_at ? new Date(target.last_prayed_at) : null;
    const newStreak = !lastPrayed || lastPrayed < yesterday
      ? (lastPrayed && lastPrayed.toDateString() === yesterday.toDateString() ? streak + 1 : 1)
      : streak;
    setTargets(prev => prev.map(t => t.id === target.id ? {
      ...t,
      pray_for_person: true, pray_for_opportunity: true,
      pray_for_courage: true, pray_for_holy_spirit: true,
      last_prayed_at: new Date().toISOString(),
      prayer_streak: newStreak,
    } : t));
    await patch(target.id, { markPrayed: true });
  }

  async function handleStatusChange(target: PrayerTarget, status: string) {
    if (status === "accepted_christ" && !target.accepted_christ) {
      setCelebratingTarget(target);
      return;
    }
    setTargets(prev => prev.map(t => t.id === target.id ? { ...t, status } : t));
    await patch(target.id, { status });
  }

  async function handleAcceptedChrist() {
    if (!celebratingTarget || !token) return;
    setTargets(prev => prev.map(t => t.id === celebratingTarget.id
      ? { ...t, accepted_christ: true, accepted_christ_at: new Date().toISOString(), status: "accepted_christ" }
      : t));
    await patch(celebratingTarget.id, { accepted_christ: true });
    await loadData(token);
    setCelebratingTarget(null);
  }

  async function handleDelete(id: string) {
    if (!token || !confirm("Remove this prayer target?")) return;
    await fetch(`/api/prayer-targets/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadData(token);
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-500">Loading…</div></div>;
  }

  const slots = [0, 1, 2];

  return (
    <>
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-5xl mb-3">✝️</div>
            <h1 className="text-3xl font-bold text-white">Evangelism</h1>
            <p className="text-green-200 text-sm mt-2 italic max-w-sm">
              Three people. Three prayers. One Holy Spirit.
            </p>
          </div>
          {!dataLoading && targets.length < 3 && (
            <Link
              href="/dashboard/evangelism/add-target"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity mt-1"
              style={{ backgroundColor: "#F28C28", color: "#1A4A2E" }}
            >
              + Add Prayer Target
            </Link>
          )}
        </div>
      </div>

      <div className="px-6 py-8 bg-gray-50 min-h-screen">

        {/* My Three Prayer Targets */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            🙏 My Three Prayer Targets
          </h2>

          {dataLoading ? (
            <div className="text-center py-12 text-gray-400">Loading…</div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {slots.map(i => {
                const target = targets[i];
                if (!target) {
                  return (
                    <Link
                      key={i}
                      href="/dashboard/evangelism/add-target"
                      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed min-h-[320px] transition-colors hover:bg-amber-50 group"
                      style={{ borderColor: "#F28C28" }}
                    >
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 text-3xl"
                        style={{ backgroundColor: "#fef9e7" }}>
                        +
                      </div>
                      <p className="font-semibold text-gray-600 group-hover:text-gray-800">Add a Prayer Target</p>
                      <p className="text-xs text-gray-400 mt-1">Pray for someone you know</p>
                    </Link>
                  );
                }

                const prayed = prayedToday(target);
                const streak = target.prayer_streak ?? 0;
                const statusStyle = STATUS_STYLE[target.status] ?? STATUS_STYLE.praying;
                const isUpdating = updatingId === target.id;

                return (
                  <div
                    key={target.id}
                    className="bg-white rounded-2xl shadow-sm border flex flex-col overflow-hidden"
                    style={{ borderColor: target.accepted_christ ? "#F28C28" : "#f3f4f6" }}
                  >
                    {/* Accepted Christ banner */}
                    {target.accepted_christ && (
                      <div className="px-4 py-3 text-center font-bold text-sm" style={{ backgroundColor: "#F28C28", color: "#1A4A2E" }}>
                        🎉 {target.first_name.toUpperCase()} ACCEPTED CHRIST!
                      </div>
                    )}

                    <div className="p-5 flex-1 flex flex-col">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xl font-bold text-gray-900">{target.first_name}</h3>
                            {streak > 0 && (
                              <span className="text-sm font-semibold text-orange-500 flex items-center gap-0.5">
                                🔥 {streak}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 capitalize">{target.relationship}</span>
                        </div>
                        <button
                          onClick={() => handleDelete(target.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none ml-2 flex-shrink-0"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>

                      {/* Status */}
                      <div className="mb-4">
                        <select
                          value={target.status}
                          onChange={e => handleStatusChange(target, e.target.value)}
                          disabled={isUpdating}
                          className="w-full text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-800"
                          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                        >
                          {STATUS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Prayer checkboxes */}
                      <div className="space-y-2.5 flex-1">
                        {[
                          { field: "pray_for_person" as const, label: `Pray for ${target.first_name}`, sub: "for an open heart" },
                          { field: "pray_for_opportunity" as const, label: "Pray for the opportunity", sub: "a natural moment to share" },
                          { field: "pray_for_courage" as const, label: "Pray for courage", sub: "boldness when the moment comes" },
                          { field: "pray_for_holy_spirit" as const, label: "Pray for the Holy Spirit", sub: "to go before you and prepare the way" },
                        ].map(({ field, label, sub }) => {
                          const checked = target[field] as boolean;
                          return (
                            <button
                              key={field}
                              type="button"
                              onClick={() => handleCheckbox(target, field)}
                              disabled={isUpdating}
                              className="w-full flex items-start gap-3 text-left p-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                            >
                              <div
                                className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                                style={{
                                  backgroundColor: checked ? "#1A4A2E" : "#fff",
                                  borderColor: checked ? "#1A4A2E" : "#d1d5db",
                                }}
                              >
                                {checked && <span className="text-white text-xs font-bold">✓</span>}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-sm font-medium leading-tight ${checked ? "text-gray-400 line-through" : "text-gray-800"}`}>{label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Notes */}
                      {target.notes && (
                        <p className="text-xs text-gray-400 italic mt-3 border-t border-gray-50 pt-3">"{target.notes}"</p>
                      )}

                      {/* Accept Christ button */}
                      {!target.accepted_christ && (
                        <button
                          onClick={() => setCelebratingTarget(target)}
                          className="mt-3 text-xs text-center font-medium text-amber-600 hover:text-amber-700 transition-colors"
                        >
                          🎉 They accepted Christ!
                        </button>
                      )}
                    </div>

                    {/* Mark as Prayed Today */}
                    <div className="px-5 pb-5">
                      <button
                        onClick={() => handleMarkPrayed(target)}
                        disabled={prayed || isUpdating}
                        className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                        style={{
                          backgroundColor: prayed ? "#f0fdf4" : "#1A4A2E",
                          color: prayed ? "#1A4A2E" : "#fff",
                          border: prayed ? "2px solid #bbf7d0" : "none",
                          opacity: isUpdating ? 0.6 : 1,
                        }}
                      >
                        {prayed ? "✓ Prayed Today" : isUpdating ? "Saving…" : "Mark as Prayed Today"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Celebration Feed */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            🎉 Salvation Celebrations
          </h2>
          {celebrations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-10 text-center">
              <div className="text-4xl mb-3">✝️</div>
              <p className="text-gray-500 font-medium">No celebrations yet</p>
              <p className="text-gray-400 text-sm mt-1">When someone accepts Christ, they'll be celebrated here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {celebrations.map((c, idx) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-4 px-6 py-4 ${idx < celebrations.length - 1 ? "border-b border-gray-50" : ""}`}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: "#fef9e7" }}>
                    🎉
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      <span style={{ color: "#1A4A2E" }}>{c.first_name}</span> accepted Christ!
                    </p>
                    {c.relationship && (
                      <p className="text-xs text-gray-400 capitalize">{c.relationship}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(c.celebrated_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Resource Section */}
        <section className="pb-10">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            📖 Easy Evangelism in Under 30 Minutes
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-6 border-b border-gray-100" style={{ background: "linear-gradient(135deg, #1A4A2E08 0%, #2D6B4208 100%)" }}>
              <p className="text-sm text-gray-500 mb-1">By James C. Hayne</p>
              <p className="text-gray-700 text-sm leading-relaxed">
                A simple system to share the Gospel confidently without memorizing scripture.
                Two tracks for every situation — a quick 3-minute version and a full presentation
                when you have more time.
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-lg font-semibold text-sm text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#1A4A2E" }}
              >
                ↓ Download Guide (PDF)
              </a>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* Short Track */}
              <div className="px-6 py-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#1A4A2E" }}>S</div>
                  <h3 className="font-bold text-gray-800">Short Track</h3>
                  <span className="text-xs text-gray-400">2–3 minutes</span>
                </div>
                <TrackFlow steps={SHORT_TRACK} />
              </div>

              {/* Long Track */}
              <div className="px-6 py-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#2D6B42" }}>L</div>
                  <h3 className="font-bold text-gray-800">Long Track</h3>
                  <span className="text-xs text-gray-400">10–15 minutes</span>
                </div>
                <TrackFlow steps={LONG_TRACK} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>

    {/* Accepted Christ confirmation modal */}
    {celebratingTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        onClick={e => { if (e.target === e.currentTarget) setCelebratingTarget(null); }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {celebratingTarget.first_name} accepted Christ!
          </h2>
          <p className="text-gray-500 text-sm mb-2">
            This is the greatest moment in a person's life.
          </p>
          <p className="text-gray-400 text-xs mb-6">
            This celebration will be shared anonymously with your whole church.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleAcceptedChrist}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#F28C28", color: "#1A4A2E" }}
            >
              🎉 Celebrate!
            </button>
            <button
              onClick={() => setCelebratingTarget(null)}
              className="flex-1 py-3 rounded-xl font-medium text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
