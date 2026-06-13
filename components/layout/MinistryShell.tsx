"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MINISTRY_CONFIG, isInvitationOnly, hasGrowthModule, hasMetamorphosis } from "@/lib/ministry-config";

// Ministry accent colors
const ACCENT_COLORS: Record<string, string> = {
  childrens: "#7B2CBF",
  "middle-school": "#3b82f6",
  "high-school": "#7c3aed",
  "young-adults": "#0d9488",
  mens: "#475569",
  womens: "#e11d48",
  seniors: "#d97706",
  ushers: "#1e3a8a",
  drama: "#7c3aed",
};

const SHEPHERD_GROUP_TYPES = new Set(["childrens", "young-adults"]);

function getAccent(type: string): string {
  return ACCENT_COLORS[type] ?? "#7B2CBF";
}

function buildNav(type: string) {
  const items: { label: string; href: string }[] = [];
  const base = `/dashboard/ministry/${type}`;
  // Children's Ministry uses its own dedicated hub as the Overview
  const overviewHref = type === "childrens" ? "/dashboard/children-ministry" : base;

  items.push({ label: "📋 Overview", href: overviewHref });

  if (isInvitationOnly(type)) {
    items.push({ label: "👥 Members", href: `${base}/roster` });
  } else {
    items.push({ label: "👥 Members & Visitors", href: `${base}/roster` });
  }

  items.push({ label: "✅ Attendance", href: `${base}/attendance` });
  items.push({ label: "🔄 Follow Up", href: `${base}/followup` });
  items.push({ label: "📊 Shepherd Pipeline", href: `${base}/pipeline` });
  items.push({ label: "📢 Communication", href: `${base}/communication` });
  items.push({ label: "🎂 Birthdays", href: `${base}/birthdays` });
  items.push({ label: "🙋 Prayer", href: `${base}/prayer` });

  if (SHEPHERD_GROUP_TYPES.has(type)) {
    items.push({ label: "👫 Shepherd Groups", href: `${base}/shepherd-groups` });
  }
  if (hasGrowthModule(type)) {
    items.push({ label: "🌱 Growth", href: `${base}/growth` });
  }
  if (hasMetamorphosis(type)) {
    items.push({ label: "🦋 Metamorphosis", href: `${base}/metamorphosis` });
  }

  return items;
}

interface MinistryShellProps {
  type: string;
  children: React.ReactNode;
}

export default function MinistryShell({ type, children }: MinistryShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const cfg = MINISTRY_CONFIG[type];
  const accent = getAccent(type);
  const navItems = buildNav(type);

  // The overview path must not prefix-match its own sub-pages
  const overviewHref = type === "childrens" ? "/dashboard/children-ministry" : `/dashboard/ministry/${type}`;
  const isActive = (href: string) =>
    pathname === href || (href !== overviewHref && pathname.startsWith(href));

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#08060D" }}>
      {/* Top: logo + back */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(212,175,55,0.2)", display: "flex", alignItems: "center", gap: "10px" }}>
        <img src="/shepherd-kids-logo.png" alt="ShepherdKids" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        <Link href="/dashboard" style={{ color: "#D4AF37", fontSize: 12, fontWeight: 600, textDecoration: "none", letterSpacing: "0.03em" }}
          onClick={() => setSidebarOpen(false)}>
          ← Dashboard
        </Link>
      </div>

      {/* Ministry header */}
      <div style={{ padding: "16px", background: accent, flexShrink: 0 }}>
        <p style={{ fontSize: 24, margin: "0 0 4px", lineHeight: 1 }}>{cfg?.emoji ?? "⛪"}</p>
        <p style={{ color: "white", fontWeight: 700, fontSize: 15, margin: 0, lineHeight: 1.3, fontFamily: "Georgia, serif" }}>
          {cfg?.name ?? type}
        </p>
        {cfg?.ageRange && (
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: "4px 0 0" }}>{cfg.ageRange}</p>
        )}
        {isInvitationOnly(type) && (
          <span style={{ display: "inline-block", marginTop: 6, background: "rgba(255,255,255,0.2)", color: "white", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.05em" }}>
            INVITATION ONLY
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px 16px", scrollbarWidth: "none" }}>
        {navItems.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "8px",
                marginBottom: "2px",
                fontSize: "13px",
                fontWeight: active ? 700 : 500,
                textDecoration: "none",
                backgroundColor: active ? accent + "22" : "transparent",
                color: active ? accent : "rgba(255,255,255,0.75)",
                borderLeft: active ? `3px solid ${accent}` : "3px solid transparent",
                transition: "background-color 0.15s, color 0.15s",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(212,175,55,0.15)" }}>
        <Link href="/dashboard/settings" style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, textDecoration: "none" }}>
          ⚙️ Settings
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden" }}>
      {/* Desktop sidebar */}
      <aside style={{ width: 260, flexShrink: 0, display: "none" }} className="ms-sidebar-desktop">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 260,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          zIndex: 50,
        }}
        className="ms-sidebar-mobile"
      >
        <SidebarContent />
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", backgroundColor: "#f9fafb", display: "flex", flexDirection: "column" }}>
        {/* Mobile header bar */}
        <div className="ms-mobile-header" style={{ display: "none", alignItems: "center", gap: 12, padding: "10px 16px", background: accent, flexShrink: 0, position: "sticky", top: 0, zIndex: 30 }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "white", fontSize: 18, lineHeight: 1 }}
            aria-label="Open menu"
          >
            ☰
          </button>
          <p style={{ margin: 0, color: "white", fontWeight: 700, fontSize: 15, fontFamily: "Georgia, serif" }}>
            {cfg?.emoji} {cfg?.name ?? type}
          </p>
        </div>
        {children}
      </main>

      <style>{`
        @media (min-width: 768px) {
          .ms-sidebar-desktop { display: block !important; }
          .ms-sidebar-mobile { display: none !important; }
          .ms-mobile-header { display: none !important; }
        }
        @media (max-width: 767px) {
          .ms-sidebar-desktop { display: none !important; }
          .ms-mobile-header { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
