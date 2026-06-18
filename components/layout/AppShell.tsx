"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MASTER_ADMIN_EMAIL = "jim@gratefulconsultinggroup.com";
const supabase = createClient();

// Kept for backward compat — pages pass navItems but the sidebar ignores it.
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

// ── Nav data ──────────────────────────────────────────────────────────────────

type NavChild = { label: string; href: string; exact?: boolean };
type NavGroup = { label: string; children: NavChild[] };

const TOP_ITEMS: NavChild[] = [
  { label: "Dashboard",     href: "/dashboard",            exact: true },
  { label: "Ministry Care", href: "/dashboard/ministry-care" },
];

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Check-In Center",
    children: [
      { label: "Check-In Setup",     href: "/dashboard/children-ministry/check-in/setup" },
      { label: "Live Check-In",      href: "/dashboard/children-ministry/live-checkin" },
      { label: "Label Printing",     href: "/dashboard/children-ministry/print-station" },
    ],
  },
  {
    label: "Follow-Up",
    children: [
      { label: "Follow-Up",          href: "/dashboard/children-ministry/follow-up" },
      { label: "Attendance Records", href: "/dashboard/children-ministry/attendance-report" },
    ],
  },
  {
    label: "Shepherd Kids",
    children: [
      { label: "Children",           href: "/dashboard/children-ministry/children" },
      { label: "Faith Journey",      href: "/dashboard/children-ministry/faith-journey" },
    ],
  },
  {
    label: "Shepherd Parents",
    children: [
      { label: "Parents",            href: "/dashboard/children-ministry/parents" },
      { label: "Parent Communication", href: "/dashboard/children-ministry/parent-update" },
    ],
  },
  {
    label: "Celebrations",
    children: [
      { label: "Birthdays",          href: "/dashboard/birthdays" },
      { label: "Certificates",       href: "/dashboard/children-ministry/certificates/new", exact: true },
    ],
  },
];

const BOTTOM_LINKS: NavChild[] = [
  { label: "⚙️ Settings",               href: "/dashboard/settings" },
  { label: "💳 Subscription & Billing",  href: "/dashboard/billing" },
];

// ── Active-state helpers ──────────────────────────────────────────────────────

function childActive(child: NavChild, pathname: string): boolean {
  if (child.exact) return pathname === child.href;
  return pathname === child.href || pathname.startsWith(child.href + "/");
}

function groupHasActive(group: NavGroup, pathname: string): boolean {
  return group.children.some(c => childActive(c, pathname));
}

// ── Styles ────────────────────────────────────────────────────────────────────

function topItemStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: active ? 600 : 400,
    color: active ? "#ffffff" : "rgba(255,255,255,0.80)",
    backgroundColor: active ? "rgba(123,44,191,0.85)" : "transparent",
    textDecoration: "none",
    transition: "background-color 0.15s",
  };
}

function groupHeaderStyle(hasActive: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: hasActive ? "#D4AF37" : "rgba(212,175,55,0.55)",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "color 0.15s",
  };
}

function childItemStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    padding: "7px 12px 7px 22px",
    borderRadius: "7px",
    fontSize: "13px",
    fontWeight: active ? 600 : 400,
    color: active ? "#ffffff" : "rgba(255,255,255,0.65)",
    backgroundColor: active ? "rgba(123,44,191,0.85)" : "transparent",
    textDecoration: "none",
    transition: "background-color 0.15s",
  };
}

function bottomLinkStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: active ? 600 : 400,
    color: active ? "#ffffff" : "rgba(255,255,255,0.65)",
    backgroundColor: active ? "rgba(123,44,191,0.85)" : "transparent",
    textDecoration: "none",
    transition: "background-color 0.15s",
  };
}

function masterAdminLinkStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    padding: "7px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    color: active ? "#120A1F" : "#fcd34d",
    backgroundColor: active ? "#f59e0b" : "rgba(245,158,11,0.12)",
    textDecoration: "none",
    transition: "background-color 0.15s",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const ASIDE_STYLE: React.CSSProperties = {
  width: 248,
  flexShrink: 0,
  height: "100vh",
  overflow: "hidden",
  backgroundColor: "#08060D",
  display: "flex",
  flexDirection: "column",
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Initialise with groups that have an active child; auto-open on navigation.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const g of NAV_GROUPS) if (groupHasActive(g, pathname)) s.add(g.label);
    return s;
  });

  useEffect(() => {
    for (const g of NAV_GROUPS) {
      if (groupHasActive(g, pathname)) {
        setOpenGroups(prev => prev.has(g.label) ? prev : new Set([...prev, g.label]));
      }
    }
  }, [pathname]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email ?? null));
    setMounted(true);
  }, []);

  function toggleGroup(label: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const isMasterAdmin =
    !!userEmail && userEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

  // Pre-mount skeleton — same layout, no active states.
  if (!mounted) {
    return (
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <aside style={ASIDE_STYLE}>
          <LogoBlock />
          <div style={{ flex: 1 }} />
        </aside>
        <main style={{ flex: 1, overflowY: "auto", backgroundColor: "#08060D" }}>{children}</main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <aside style={ASIDE_STYLE}>
        <LogoBlock />

        {/* ── Scrollable nav area ─────────────────────────────────────────── */}
        <nav style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "10px 8px 24px",
          scrollbarWidth: "none",
          display: "flex",
          flexDirection: "column",
          gap: "1px",
        } as React.CSSProperties}>

          {/* Top fixed items */}
          {TOP_ITEMS.map(item => (
            <Link key={item.href} href={item.href} style={topItemStyle(childActive(item, pathname))}>
              {item.label}
            </Link>
          ))}

          <div style={{ height: 6 }} />

          {/* Collapsible groups */}
          {NAV_GROUPS.map(group => {
            const hasActive = groupHasActive(group, pathname);
            const isOpen = openGroups.has(group.label);
            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  style={groupHeaderStyle(hasActive)}
                >
                  <span>{group.label}</span>
                  <span style={{
                    fontSize: "9px",
                    display: "inline-block",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s",
                    opacity: 0.7,
                  }}>
                    ▾
                  </span>
                </button>

                {isOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px", paddingBottom: 4 }}>
                    {group.children.map(child => (
                      <Link key={child.href} href={child.href} style={childItemStyle(childActive(child, pathname))}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Master Admin (only visible to jim@gratefulconsultinggroup.com) */}
          {isMasterAdmin && (
            <div style={{ borderTop: "1px solid rgba(212,175,55,0.15)", marginTop: 8, paddingTop: 6, display: "flex", flexDirection: "column", gap: 1 }}>
              <p style={{ padding: "4px 12px 2px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(252,211,77,0.5)", margin: 0 }}>
                Master Admin
              </p>
              <Link
                href="/dashboard/master-admin/subscriptions"
                style={masterAdminLinkStyle(pathname.startsWith("/dashboard/master-admin/subscriptions"))}
              >
                Subscription Management
              </Link>
            </div>
          )}
        </nav>

        {/* ── Bottom pinned area ──────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, borderTop: "1px solid rgba(212,175,55,0.15)", padding: "8px" }}>
          {BOTTOM_LINKS.map(link => (
            <Link key={link.href} href={link.href} style={bottomLinkStyle(pathname.startsWith(link.href))}>
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.65)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "color 0.15s, background-color 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(123,44,191,0.2)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: "auto", backgroundColor: "#08060D" }}>{children}</main>
    </div>
  );
}

function LogoBlock() {
  return (
    <div style={{
      flexShrink: 0,
      padding: "20px 16px 16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      borderBottom: "1px solid rgba(212,175,55,0.2)",
    }}>
      <img
        src="/shepherd-kids-logo.png"
        alt="ShepherdKids"
        style={{ width: 192, height: "auto", borderRadius: 12, border: "2px solid rgba(212,175,55,0.65)" }}
      />
      <p style={{
        margin: "10px 0 0",
        fontSize: 11,
        fontWeight: 600,
        color: "#ffffff",
        letterSpacing: "0.06em",
        textAlign: "center",
        opacity: 0.9,
      }}>
        {"Children's Ministry Platform"}
      </p>
    </div>
  );
}
