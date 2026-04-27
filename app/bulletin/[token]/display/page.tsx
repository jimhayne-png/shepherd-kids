"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

type Section = { id: string; section_type: string; title: string; content: string | null };
type Announcement = { id: string; title: string; body: string | null; link_url: string | null };

const SECTION_ICONS: Record<string, string> = {
  order_of_service: "📋", sermon: "✝️", scripture: "📖", announcement: "📢",
  giving: "💛", prayer: "🙏", song: "🎵", reading: "📚", custom: "",
};

export default function BulletinDisplayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slides, setSlides] = useState<{ title: string; icon: string; content: string; type: string }[]>([]);
  const [current, setCurrent] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [churchName, setChurchName] = useState("Our Church");
  const [serviceDate, setServiceDate] = useState("");
  const [bulletinTitle, setBulletinTitle] = useState("");

  useEffect(() => {
    fetch(`/api/bulletins/public/${token}`)
      .then(async r => {
        if (!r.ok) { setError("Bulletin not available."); setLoading(false); return; }
        const d = await r.json();
        setChurchName(d.church_name ?? "Our Church");
        setBulletinTitle(d.bulletin?.title ?? "");
        setServiceDate(d.bulletin?.service_date ? new Date(d.bulletin.service_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "");

        const allSlides: typeof slides = [];

        // Title slide
        allSlides.push({ title: d.bulletin?.title ?? "", icon: "⛪", content: d.church_name ?? "Our Church", type: "title" });

        // Section slides
        for (const s of d.sections ?? []) {
          allSlides.push({ title: s.title, icon: SECTION_ICONS[s.section_type] ?? "", content: s.content ?? "", type: s.section_type });
        }

        // Announcements slide
        if ((d.announcements ?? []).length > 0) {
          const annContent = (d.announcements as Announcement[]).map((a: Announcement) => `• ${a.title}${a.body ? `: ${a.body}` : ""}`).join("\n");
          allSlides.push({ title: "Announcements", icon: "📢", content: annContent, type: "announcement" });
        }

        setSlides(allSlides);
        setLoading(false);
      })
      .catch(() => { setError("Unable to load."); setLoading(false); });
  }, [token]);

  useEffect(() => {
    if (!autoAdvance || slides.length === 0) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % slides.length), 30000);
    return () => clearInterval(timer);
  }, [autoAdvance, slides.length]);

  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#6b7280", fontFamily: "Georgia, serif", fontSize: "20px" }}>Loading…</p>
    </div>
  );

  if (error || !slides.length) return (
    <div style={{ minHeight: "100dvh", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#6b7280", fontFamily: "Georgia, serif" }}>{error || "No content."}</p>
    </div>
  );

  const slide = slides[current];
  const isTitle = slide.type === "title";

  return (
    <div style={{ minHeight: "100dvh", background: "#111827", fontFamily: "Georgia, 'Times New Roman', serif", display: "flex", flexDirection: "column", userSelect: "none" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", background: "#1A4A2E" }}>
        <div>
          <p style={{ color: "white", fontWeight: "bold", fontSize: "20px", margin: 0 }}>{churchName}</p>
          <p style={{ color: "#86efac", margin: "2px 0 0", fontSize: "14px" }}>{serviceDate}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#86efac", fontSize: "13px" }}>
            <input type="checkbox" checked={autoAdvance} onChange={e => setAutoAdvance(e.target.checked)} />
            Auto-advance (30s)
          </label>
          <Link href={`/bulletin/${token}`} style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>Exit ✕</Link>
        </div>
      </div>

      {/* Slide */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 80px" }}>
        <div style={{ textAlign: "center", maxWidth: "900px", width: "100%" }}>
          {slide.icon && <div style={{ fontSize: "56px", marginBottom: "24px" }}>{slide.icon}</div>}
          <h1 style={{ color: "white", fontSize: isTitle ? "56px" : "48px", fontWeight: 900, margin: "0 0 24px", lineHeight: 1.2 }}>{slide.title}</h1>
          {slide.content && (
            <div style={{ color: "#d1d5db", fontSize: isTitle ? "22px" : "24px", lineHeight: "1.8", whiteSpace: "pre-line", maxHeight: "50vh", overflow: "auto" }}>
              {slide.type === 'scripture' ? <em>{slide.content}</em> : slide.content}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 48px", background: "rgba(0,0,0,0.4)" }}>
        <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} style={{ background: current === 0 ? "rgba(255,255,255,0.1)" : "#F28C28", color: "white", border: "none", borderRadius: "12px", padding: "14px 32px", fontSize: "18px", fontWeight: "bold", cursor: current === 0 ? "default" : "pointer", opacity: current === 0 ? 0.4 : 1 }}>
          ← Prev
        </button>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? "24px" : "8px", height: "8px", borderRadius: "4px", background: i === current ? "#F28C28" : "rgba(255,255,255,0.3)", border: "none", padding: 0, cursor: "pointer", transition: "all 0.2s" }} />
          ))}
        </div>
        <button onClick={() => setCurrent(c => Math.min(slides.length - 1, c + 1))} disabled={current === slides.length - 1} style={{ background: current === slides.length - 1 ? "rgba(255,255,255,0.1)" : "#F28C28", color: "white", border: "none", borderRadius: "12px", padding: "14px 32px", fontSize: "18px", fontWeight: "bold", cursor: current === slides.length - 1 ? "default" : "pointer", opacity: current === slides.length - 1 ? 0.4 : 1 }}>
          Next →
        </button>
      </div>
    </div>
  );
}
