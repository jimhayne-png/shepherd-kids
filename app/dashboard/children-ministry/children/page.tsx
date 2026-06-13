"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();

const CM_ACCENT = "#7B2CBF";

type Child = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  visit_date: string | null;
};

function calcAge(dob: string): number {
  const d = new Date(dob + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
  return age;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ChildrenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch] = useState("");

  async function load(t: string) {
    const res = await fetch("/api/children-ministry/children", { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setChildren(data.children ?? []);
  }

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const t = session.access_token;
      setToken(t);
      await load(t);
      setLoading(false);
    }
    init();
  }, [router]);

  const filtered = children.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (c.parent_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#08060D" }}>
      <div style={{ color: "#D8D8E8" }}>Loading…</div>
    </div>
  );

  return (
    <AppShell navItems={[]}>
      <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p className="text-sm mb-1" style={{ color: "#D4AF37" }}>ShepherdKids</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>ShepherdKids</h1>
        <p className="text-sm mt-1" style={{ color: "#D8D8E8" }}>{children.length} registered</p>
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
        <div style={{ marginBottom: "20px" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or parent…"
            style={{ width: "100%", padding: "10px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "12px", fontSize: "13px", color: "#ffffff", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "18px", overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "64px 32px", textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🧒</div>
              <p style={{ color: "#A9A9B8", fontSize: "14px", margin: 0 }}>
                {search ? "No children match your search." : "No children registered yet. They'll appear here after their first kiosk check-in."}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(212,175,55,0.12)" }}>
                  <th className="text-left px-6 py-3" style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Child</th>
                  <th className="text-left px-6 py-3" style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Parent</th>
                  <th className="text-left px-6 py-3" style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>First Visit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((child, idx) => (
                  <tr
                    key={child.id}
                    onClick={() => router.push(`/dashboard/children-ministry/children/${child.id}`)}
                    style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(212,175,55,0.08)" : "none", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(123,44,191,0.1)"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"}
                  >
                    <td className="px-6 py-4">
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#ffffff", flexShrink: 0, backgroundColor: CM_ACCENT }}
                        >
                          {child.first_name[0]}{child.last_name[0]}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px", margin: 0 }}>{child.first_name} {child.last_name}</p>
                          {child.date_of_birth && (
                            <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "2px 0 0" }}>{calcAge(child.date_of_birth)} years old</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {child.parent_name && (
                        <p style={{ fontSize: "13px", color: "#D8D8E8", margin: 0 }}>{child.parent_name}</p>
                      )}
                      {child.parent_phone && (
                        <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "2px 0 0" }}>{child.parent_phone}</p>
                      )}
                    </td>
                    <td className="px-6 py-4" style={{ fontSize: "13px", color: "#A9A9B8" }}>
                      {child.visit_date ? fmtDate(child.visit_date) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </AppShell>
  );
}
