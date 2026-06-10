"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();

type Parent = {
  id: string;
  parent1_first_name: string;
  parent1_last_name: string;
  parent1_phone: string | null;
  parent1_email: string | null;
  visit_date: string;
  status: string;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new:       { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa" },
  contacted: { bg: "rgba(245,158,11,0.15)",  text: "#fbbf24" },
  returning: { bg: "rgba(157,78,221,0.2)",   text: "#c084fc" },
  converted: { bg: "rgba(34,197,94,0.15)",   text: "#4ade80" },
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ParentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [parents, setParents] = useState<Parent[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/children-ministry/parents", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) { const d = await res.json(); setParents(d.parents ?? []); }
      setLoading(false);
    }
    init();
  }, [router]);

  const filtered = parents.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${p.parent1_first_name} ${p.parent1_last_name}`.toLowerCase();
    const phone = (p.parent1_phone ?? "").replace(/\D/g, "");
    return name.includes(q) || phone.includes(q.replace(/\D/g, "")) || (p.parent1_phone ?? "").includes(q);
  });

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#08060D" }}>
      <div style={{ color: "#D8D8E8" }}>Loading…</div>
    </div>
  );

  return (
    <AppShell navItems={[]}>
      <div style={{ padding: "40px 32px 32px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", color: "#D4AF37", marginBottom: "6px", textTransform: "uppercase" }}>
          ShepherdKids
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>👪 Families</h1>
        <p style={{ fontSize: "13px", color: "#D8D8E8", margin: "6px 0 0" }}>
          {parents.length} registered {parents.length === 1 ? "family" : "families"}
        </p>
      </div>

      <div style={{ backgroundColor: "#0A0814", minHeight: "100vh", padding: "32px" }}>
        {/* Search */}
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            autoFocus
            style={{
              width: "100%",
              padding: "10px 16px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: "12px",
              fontSize: "13px",
              color: "#ffffff",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "18px", padding: "64px 32px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>👨‍👩‍👧</div>
            <p style={{ color: "#A9A9B8", fontWeight: 600, fontSize: "14px", margin: 0 }}>
              {search ? "No parents match your search." : "No parents registered yet."}
            </p>
            {search && (
              <p style={{ color: "#A9A9B8", fontSize: "12px", marginTop: "6px" }}>
                Parents appear here after their first kiosk check-in.
              </p>
            )}
          </div>
        ) : (
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "18px", overflow: "hidden" }}>
            {filtered.map((p, i) => {
              const sc = STATUS_COLORS[p.status] ?? { bg: "rgba(255,255,255,0.08)", text: "#A9A9B8" };
              return (
                <div
                  key={p.id}
                  style={{
                    padding: "16px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    borderBottom: i < filtered.length - 1 ? "1px solid rgba(212,175,55,0.1)" : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px", margin: 0 }}>
                      {p.parent1_first_name} {p.parent1_last_name}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "3px" }}>
                      {p.parent1_phone && (
                        <span style={{ fontSize: "12px", color: "#A9A9B8" }}>{p.parent1_phone}</span>
                      )}
                      {p.parent1_email && (
                        <span style={{ fontSize: "12px", color: "#A9A9B8" }}>{p.parent1_email}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: "20px",
                        textTransform: "capitalize",
                        backgroundColor: sc.bg,
                        color: sc.text,
                      }}
                    >
                      {p.status}
                    </span>
                    <p style={{ fontSize: "11px", color: "#A9A9B8", margin: "4px 0 0" }}>{fmtDate(p.visit_date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
