"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

type Section = { id: string; section_type: string; title: string; content: string | null };
type Announcement = { id: string; title: string; body: string | null; link_url: string | null; link_label: string | null };
type BulletinData = { id: string; service_date: string; title: string; access_token: string; uploaded_bulletin_url: string | null };

const SECTION_ICONS: Record<string, string> = {
  order_of_service: "📋", sermon: "✝️", scripture: "📖", announcement: "📢",
  giving: "💛", prayer: "🙏", song: "🎵", reading: "📚", custom: "•",
};

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function PublicBulletinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bulletin, setBulletin] = useState<BulletinData | null>(null);
  const [churchName, setChurchName] = useState("Our Church");
  const [sections, setSections] = useState<Section[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetch(`/api/bulletins/public/${token}`)
      .then(async r => {
        if (!r.ok) { setError("This bulletin is not available."); setLoading(false); return; }
        const d = await r.json();
        setBulletin(d.bulletin);
        setChurchName(d.church_name ?? "Our Church");
        setSections(d.sections ?? []);
        setAnnouncements(d.announcements ?? []);
        setLoading(false);
      })
      .catch(() => { setError("Unable to load bulletin."); setLoading(false); });
  }, [token]);

  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
      <p style={{ fontFamily: "Georgia, serif", color: "#9ca3af" }}>Loading…</p>
    </div>
  );

  if (error || !bulletin) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", padding: "24px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
        <p style={{ fontFamily: "Georgia, serif", color: "#6b7280" }}>{error || "Bulletin not found."}</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#f0fdf4", minHeight: "100dvh", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      {/* Header */}
      <div style={{ background: "#1A4A2E", padding: "24px 20px", textAlign: "center" }}>
        <p style={{ color: "white", fontWeight: "bold", fontSize: "22px", margin: "0 0 6px" }}>{churchName}</p>
        <p style={{ color: "#86efac", margin: "0 0 10px", fontSize: "14px" }}>{fmtDate(bulletin.service_date)}</p>
        <p style={{ color: "rgba(255,255,255,0.95)", fontWeight: "bold", fontSize: "18px", margin: 0 }}>{bulletin.title}</p>
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px 16px 48px" }}>

        {/* Sections */}
        {sections.map(s => (
          <div key={s.id} style={{ background: "white", borderRadius: "12px", padding: "18px 20px", marginBottom: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: s.content ? "10px" : 0 }}>
              <span style={{ fontSize: "18px" }}>{SECTION_ICONS[s.section_type] ?? "•"}</span>
              <p style={{ fontWeight: "bold", color: "#1A4A2E", margin: 0, fontSize: "16px" }}>{s.title}</p>
            </div>
            {s.content && s.section_type === 'order_of_service' ? (
              <div style={{ paddingLeft: "12px" }}>
                {s.content.split("\n").filter(Boolean).map((line, i) => (
                  <p key={i} style={{ margin: "4px 0", color: "#374151", fontSize: "15px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ color: "#9ca3af", flexShrink: 0, minWidth: "20px", fontSize: "13px" }}>{i + 1}.</span>
                    {line.replace(/^[•\-\d\.]+\s*/, "")}
                  </p>
                ))}
              </div>
            ) : s.content ? (
              <p style={{ margin: 0, color: "#374151", fontSize: "15px", lineHeight: "1.7", whiteSpace: "pre-line" }}>
                {s.section_type === 'scripture' ? <em>{s.content}</em> : s.content}
              </p>
            ) : null}
            {s.section_type === 'giving' && (
              <p style={{ color: "#F28C28", fontSize: "14px", fontWeight: "bold", margin: "10px 0 0" }}>🙏 Thank you for your faithful giving</p>
            )}
          </div>
        ))}

        {/* Announcements */}
        {announcements.length > 0 && (
          <div style={{ background: "white", borderRadius: "12px", padding: "18px 20px", marginBottom: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <span style={{ fontSize: "18px" }}>📢</span>
              <p style={{ fontWeight: "bold", color: "#1A4A2E", margin: 0, fontSize: "16px" }}>Announcements</p>
            </div>
            {announcements.map((a, i) => (
              <div key={a.id} style={{ paddingBottom: i < announcements.length - 1 ? "14px" : 0, marginBottom: i < announcements.length - 1 ? "14px" : 0, borderBottom: i < announcements.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                <p style={{ fontWeight: "bold", margin: "0 0 4px", color: "#111827", fontSize: "15px" }}>{a.title}</p>
                {a.body && <p style={{ margin: "0 0 8px", color: "#6b7280", fontSize: "14px", lineHeight: "1.6" }}>{a.body}</p>}
                {a.link_url && (
                  <a href={a.link_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "#F28C28", color: "white", padding: "8px 16px", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>
                    {a.link_label ?? "Learn More →"}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PDF link */}
        {bulletin.uploaded_bulletin_url && (
          <div style={{ background: "white", borderRadius: "12px", padding: "16px 20px", marginBottom: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", textAlign: "center" }}>
            <a href={bulletin.uploaded_bulletin_url} target="_blank" rel="noopener noreferrer" style={{ color: "#1A4A2E", fontWeight: "bold", fontSize: "15px", textDecoration: "none" }}>
              📄 View Original Bulletin (PDF) →
            </a>
          </div>
        )}

        {/* TV Mode link */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <Link href={`/bulletin/${token}/display`} style={{ color: "#9ca3af", fontSize: "13px", textDecoration: "none" }}>
            📺 Open in Display Mode
          </Link>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "12px" }}>{churchName} · Powered by ShepherdKids</p>
      </div>
    </div>
  );
}
