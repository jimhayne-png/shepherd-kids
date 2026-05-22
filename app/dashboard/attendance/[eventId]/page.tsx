"use client";

import { useEffect, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

const supabase = createClient();

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

type AttendanceEvent = {
  id: string;
  name: string;
  event_date: string;
  check_in_token: string;
  is_open: boolean;
};

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  member_type: string;
  checked_in: boolean;
};

type Guest = {
  id: string;
  guest_name: string;
  guest_email: string | null;
  checked_in_at: string;
};

export default function AttendanceEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [event, setEvent] = useState<AttendanceEvent | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [checkedInCount, setCheckedInCount] = useState(0);

  const [tab, setTab] = useState<"members" | "guest" | "qr">("members");
  const [search, setSearch] = useState("");

  // Guest form
  const [guestFirst, setGuestFirst] = useState("");
  const [guestLast, setGuestLast] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [guestSuccess, setGuestSuccess] = useState(false);

  // QR
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Toggling state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Toggle open/close
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setToken(session.access_token);

      const res = await fetch(`/api/attendance/${eventId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { router.replace("/dashboard/attendance"); return; }
      const data = await res.json();
      setEvent(data.event);
      setMembers(data.members ?? []);
      setGuests(data.guests ?? []);
      setCheckedInCount(data.checked_in_count ?? 0);
      setLoading(false);
    }
    init();
  }, [eventId]);

  // Generate QR when tab opens
  useEffect(() => {
    if (tab === "qr" && event && !qrDataUrl) {
      const url = `${window.location.origin}/check-in/${event.check_in_token}`;
      import("qrcode").then(({ default: QRCode }) =>
        QRCode.toDataURL(url, { width: 300, margin: 2 }).then(setQrDataUrl)
      );
    }
  }, [tab, event, qrDataUrl]);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)
    );
  }, [members, search]);

  async function handleToggleMember(member: Member) {
    if (!token || togglingId === member.id) return;
    setTogglingId(member.id);
    const wasChecked = member.checked_in;
    setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, checked_in: !wasChecked } : m));
    setCheckedInCount((prev) => wasChecked ? prev - 1 : prev + 1);
    await fetch(`/api/attendance/${eventId}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ memberId: member.id }),
    });
    setTogglingId(null);
  }

  async function handleAddGuest() {
    if (!token) return;
    const name = `${guestFirst.trim()} ${guestLast.trim()}`.trim();
    if (!name) { setGuestError("First and last name are required."); return; }
    setAddingGuest(true);
    setGuestError("");
    const res = await fetch(`/api/attendance/${eventId}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ guestName: name, guestEmail: guestEmail.trim() || undefined }),
    });
    if (!res.ok) {
      const d = await res.json();
      setGuestError(d.error ?? "Failed to add guest.");
      setAddingGuest(false);
      return;
    }
    setGuests((prev) => [
      { id: crypto.randomUUID(), guest_name: name, guest_email: guestEmail.trim() || null, checked_in_at: new Date().toISOString() },
      ...prev,
    ]);
    setCheckedInCount((prev) => prev + 1);
    setGuestFirst("");
    setGuestLast("");
    setGuestEmail("");
    setGuestSuccess(true);
    setAddingGuest(false);
    setTimeout(() => setGuestSuccess(false), 3000);
  }

  async function handleToggleOpen() {
    if (!token || !event) return;
    setToggling(true);
    const newOpen = !event.is_open;
    await fetch(`/api/attendance/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ checkInOpen: newOpen }),
    });
    setEvent((prev) => prev ? { ...prev, is_open: newOpen } : prev);
    setToggling(false);
  }

  if (loading || !event) {
    return (
      <AppShell navItems={navItems}>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400 font-serif">Loading…</p>
        </div>
      </AppShell>
    );
  }

  const checkInUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/check-in/${event.check_in_token}`;

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => router.push("/dashboard/attendance")}
              className="text-green-300 text-sm mb-2 hover:text-white transition-colors flex items-center gap-1"
            >
              ← Attendance
            </button>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
              {event.name}
            </h1>
            <p className="text-green-200 text-sm mt-1">
              {new Date(event.event_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{checkedInCount}</p>
              <p className="text-green-200 text-xs">checked in</p>
            </div>
            <button
              onClick={handleToggleOpen}
              disabled={toggling}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              style={{
                backgroundColor: event.is_open ? "#dc2626" : "#F28C28",
                color: "#fff",
                opacity: toggling ? 0.7 : 1,
              }}
            >
              {event.is_open ? "Close Check-In" : "Reopen Check-In"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-8">
        <div className="flex gap-6">
          {(["members", "guest", "qr"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t ? "border-green-800 text-green-800" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "members" ? `Members (${members.length})` : t === "guest" ? "Add Guest" : "QR Code"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-6 bg-gray-50 min-h-screen">
        {/* Members Tab */}
        {tab === "members" && (
          <>
            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members…"
                className="w-full max-w-sm px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-green-700"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleToggleMember(m)}
                  disabled={togglingId === m.id}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    m.checked_in
                      ? "border-green-600 bg-green-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                  style={{ opacity: togglingId === m.id ? 0.6 : 1 }}
                >
                  {m.checked_in && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">✓</div>
                  )}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{
                      backgroundImage: m.photo_url ? `url(${m.photo_url})` : undefined,
                      backgroundSize: "cover",
                      backgroundColor: m.photo_url ? "transparent" : "#1A4A2E",
                    }}
                  >
                    {!m.photo_url && `${m.first_name[0]}${m.last_name[0]}`}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 leading-tight">{m.first_name} {m.last_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{m.member_type}</p>
                  </div>
                </button>
              ))}
              {filteredMembers.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400 text-sm">No members found.</div>
              )}
            </div>

            {/* Guests */}
            {guests.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Guests ({guests.length})</h3>
                <div className="space-y-2">
                  {guests.map((g) => (
                    <div key={g.id} className="bg-white rounded-xl border border-gray-100 px-5 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm flex-shrink-0">
                        {g.guest_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{g.guest_name}</p>
                        {g.guest_email && <p className="text-xs text-gray-400">{g.guest_email}</p>}
                      </div>
                      <span className="ml-auto text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">Guest</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Add Guest Tab */}
        {tab === "guest" && (
          <div className="max-w-md">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "Georgia, serif" }}>Add a Guest</h2>

              {guestSuccess && (
                <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
                  ✓ Guest added successfully!
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First name *</label>
                  <input
                    type="text"
                    value={guestFirst}
                    onChange={(e) => setGuestFirst(e.target.value)}
                    placeholder="Jane"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name *</label>
                  <input
                    type="text"
                    value={guestLast}
                    onChange={(e) => setGuestLast(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email (optional)</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700"
                />
              </div>

              {guestError && (
                <p className="text-sm text-red-600 mb-4">{guestError}</p>
              )}

              <button
                onClick={handleAddGuest}
                disabled={addingGuest}
                className="w-full py-3 rounded-xl font-bold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: addingGuest ? "#4b7a5e" : "#1A4A2E", fontFamily: "Georgia, serif" }}
              >
                {addingGuest ? "Adding…" : "Add Guest →"}
              </button>
            </div>
          </div>
        )}

        {/* QR Code Tab */}
        {tab === "qr" && (
          <div className="max-w-sm">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <h2 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "Georgia, serif" }}>Self Check-In QR Code</h2>
              <p className="text-sm text-gray-400 mb-6">Members can scan this to check themselves in</p>

              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Check-in QR Code" className="mx-auto mb-6 rounded-lg" style={{ width: 240, height: 240 }} />
              ) : (
                <div className="mx-auto mb-6 rounded-lg bg-gray-100 flex items-center justify-center" style={{ width: 240, height: 240 }}>
                  <p className="text-gray-400 text-sm">Generating…</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
                <p className="text-xs text-gray-400 mb-1">Check-in link</p>
                <p className="text-xs text-gray-700 break-all font-mono">{checkInUrl}</p>
              </div>

              {!event.is_open && (
                <p className="text-sm text-red-500 font-medium mt-2">Check-in is currently closed. Reopen to accept scans.</p>
              )}

              <button
                onClick={() => navigator.clipboard?.writeText(checkInUrl)}
                className="mt-3 text-sm text-green-700 font-semibold hover:underline"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
