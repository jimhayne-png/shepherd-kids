"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  isSection?: boolean;
}

interface AppShellProps {
  navItems: NavItem[];
  children: React.ReactNode;
}

interface Section {
  label: string;
  key: string;
  items: NavItem[];
}

// Converts flat navItems array into sections (grouped by isSection headers)
// Items before the first section header go into a "root" group rendered without a header
function buildSections(navItems: NavItem[]): { root: NavItem[]; sections: Section[] } {
  const root: NavItem[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const item of navItems) {
    if (item.isSection) {
      if (current) sections.push(current);
      current = { label: item.label, key: item.label, items: [] };
    } else {
      if (current) {
        current.items.push(item);
      } else {
        root.push(item);
      }
    }
  }
  if (current) sections.push(current);
  return { root, sections };
}

const STORAGE_KEY = "sw_sidebar_sections";

function loadCollapsed(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveCollapsed(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export default function AppShell({ navItems, children }: AppShellProps) {
  const pathname = usePathname();
  const { root, sections } = buildSections(navItems);

  // collapsed[sectionKey] = true means that section is collapsed
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = loadCollapsed();

    // Auto-open the section containing the current page; close all others by default
    const initial: Record<string, boolean> = {};
    for (const section of sections) {
      const hasActive = section.items.some(
        item => pathname === item.href || pathname.startsWith(item.href + "/")
      );
      // If stored preference exists, use it; otherwise open active section, collapse others
      if (section.key in stored) {
        initial[section.key] = stored[section.key];
      } else {
        initial[section.key] = !hasActive; // collapsed if doesn't contain active page
      }
    }
    setCollapsed(initial);
    setMounted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggle(key: string) {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsed(next);
      return next;
    });
  }

  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    backgroundColor: isActive ? "#F28C28" : "transparent",
    color: isActive ? "#1A4A2E" : "rgba(255,255,255,0.8)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    textDecoration: "none",
    transition: "background-color 0.15s",
  });

  // Don't render section toggles until mounted (avoids hydration mismatch)
  if (!mounted) {
    return (
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 flex-shrink-0 flex flex-col" style={{ backgroundColor: "#1A4A2E" }}>
          <LogoBlock />
          <nav className="flex-1 px-3 py-4 overflow-y-auto" />
        </aside>
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 flex-shrink-0 flex flex-col" style={{ backgroundColor: "#1A4A2E" }}>
        <LogoBlock />

        <nav className="flex-1 px-3 py-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

          {/* Root items (before first section) */}
          {root.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} style={linkStyle(isActive)}>
                {item.icon && <span style={{ width: 16, height: 16 }}>{item.icon}</span>}
                {item.label}
              </Link>
            );
          })}

          {/* Sections */}
          {sections.map(section => {
            const isCollapsed = collapsed[section.key] ?? true;
            const hasActive = section.items.some(
              item => pathname === item.href || pathname.startsWith(item.href + "/")
            );

            return (
              <div key={section.key} style={{ marginBottom: "2px" }}>
                {/* Section header / toggle */}
                <button
                  onClick={() => toggle(section.key)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px 4px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: hasActive && isCollapsed ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)",
                    fontSize: "10px",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    transition: "color 0.15s",
                  }}
                >
                  <span>
                    {section.label}
                    {isCollapsed && section.items.length > 0 && (
                      <span style={{
                        marginLeft: "6px",
                        background: "rgba(255,255,255,0.12)",
                        borderRadius: "10px",
                        padding: "1px 6px",
                        fontSize: "9px",
                        fontWeight: "600",
                        letterSpacing: "0",
                        textTransform: "none",
                        color: "rgba(255,255,255,0.5)",
                      }}>
                        {section.items.length}
                      </span>
                    )}
                  </span>
                  {/* Chevron */}
                  <svg
                    width="10" height="10" viewBox="0 0 10 10" fill="none"
                    style={{ flexShrink: 0, transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s ease", opacity: 0.5 }}
                  >
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Collapsible items */}
                <div
                  style={{
                    overflow: "hidden",
                    maxHeight: isCollapsed ? "0px" : `${section.items.length * 44}px`,
                    transition: "max-height 0.22s ease, opacity 0.15s ease",
                    opacity: isCollapsed ? 0 : 1,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingBottom: "4px" }}>
                    {section.items.map(item => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link key={item.href} href={item.href} style={linkStyle(isActive)}>
                          {item.icon && <span style={{ width: 16, height: 16 }}>{item.icon}</span>}
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  );
}

function LogoBlock() {
  return (
    <div style={{ padding: "16px", display: "flex", justifyContent: "center", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
      <img
        src="/shepherdwell-logo.png"
        alt="ShepherdWell"
        style={{ width: "140px", height: "140px", borderRadius: "50%", objectFit: "cover", objectPosition: "center", border: "2px solid rgba(240,192,64,0.4)" }}
      />
    </div>
  );
}
