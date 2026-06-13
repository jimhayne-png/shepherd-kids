"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MASTER_ADMIN_EMAIL = "jim@gratefulconsultinggroup.com";
const supabase = createClient();

// Kept for backward compat — pages still pass navItems but the sidebar
// uses the hardcoded SK_ITEMS structure below.
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

type SkItem = { label: string; href: string; emoji: string; exact?: boolean };

const SK_ITEMS: SkItem[] = [
  { label: "Ministry Care",          href: "/dashboard/children-ministry",                emoji: "", exact: true },
  { label: "Check-In Settings",      href: "/dashboard/children-ministry/checkin-setup",  emoji: "" },
  { label: "Follow Up",              href: "/dashboard/children-ministry/followup",        emoji: "" },
  { label: "ShepherdKids",           href: "/dashboard/children-ministry/children",        emoji: "" },
  { label: "Shepherd Families",      href: "/dashboard/children-ministry/parents",         emoji: "" },
  { label: "Parent Communication",   href: "/dashboard/children-ministry/parent-update",   emoji: "" },
  { label: "Faith Journey",          href: "/dashboard/children-ministry/faith-journey",   emoji: "" },
  { label: "Celebrations",           href: "/dashboard/birthdays",                         emoji: "" },
  { label: "Certificates",           href: "/dashboard/children-ministry/certificates/new", emoji: "", exact: true },
];

function pathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function isItemActive(pathname: string, item: SkItem) {
  return item.exact ? pathname === item.href : pathActive(pathname, item.href);
}

function itemStyle(active: boolean): React.CSSProperties {
  return {
    backgroundColor: active ? "rgba(123,44,191,0.85)" : "transparent",
    color: active ? "#ffffff" : "rgba(255,255,255,0.80)",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "8px 12px 8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: active ? 600 : 400,
    textDecoration: "none",
    transition: "background-color 0.15s",
  };
}

function masterAdminItemStyle(active: boolean): React.CSSProperties {
  return {
    backgroundColor: active ? "#f59e0b" : "rgba(245,158,11,0.12)",
    color: active ? "#120A1F" : "#fcd34d",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 12px 7px 16px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    textDecoration: "none",
    transition: "background-color 0.15s",
  };
}

export default function AppShell(props: AppShellProps) {
  const { children } = props;
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
    setMounted(true);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const isMasterAdmin =
    !!userEmail && userEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

  if (!mounted) {
    return (
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <aside style={{ width: 248, flexShrink: 0, backgroundColor: "#08060D", display: "flex", flexDirection: "column" }}>
          <LogoBlock />
          <div style={{ flex: 1 }} />
        </aside>
        <main style={{ flex: 1, overflowY: "auto", backgroundColor: "#08060D" }}>{children}</main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <aside style={{ width: 248, flexShrink: 0, height: "100vh", overflowX: "hidden", backgroundColor: "#08060D", display: "flex", flexDirection: "column" }}>
        <LogoBlock />

        <nav
          style={{
            flex: 1,
            minHeight: 0,
            padding: "10px 8px 8px",
            overflowY: "auto",
            scrollbarWidth: "none",
          } as React.CSSProperties}
        >
          {/* Dashboard home */}
          <Link
            href="/dashboard"
            style={{
              backgroundColor: pathname === "/dashboard" ? "rgba(123,44,191,0.85)" : "transparent",
              color: pathname === "/dashboard" ? "#ffffff" : "rgba(255,255,255,0.85)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 12px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              transition: "background-color 0.15s",
              marginBottom: "8px",
            }}
          >
            Dashboard
          </Link>

          {/* ShepherdKids section label */}
          <p style={{
            padding: "4px 12px 4px",
            margin: "0 0 3px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(212,175,55,0.85)",
          }}>
            ShepherdKids
          </p>

          {/* Nav items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {SK_ITEMS.map(item => (
              <Link key={item.href} href={item.href} style={itemStyle(isItemActive(pathname, item))}>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Master Admin */}
          {isMasterAdmin && (
            <div style={{ borderTop: "1px solid rgba(212,175,55,0.15)", marginTop: "8px", paddingTop: "6px", display: "flex", flexDirection: "column", gap: "1px" }}>
              <p style={{ padding: "4px 12px 2px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(252,211,77,0.5)", margin: 0 }}>
                Master Admin
              </p>
              <Link
                href="/dashboard/master-admin/subscriptions"
                style={masterAdminItemStyle(pathActive(pathname, "/dashboard/master-admin/subscriptions"))}
              >
                Subscription Management
              </Link>
            </div>
          )}
        </nav>

        {/* Sign Out */}
        <div style={{ padding: "8px", borderTop: "1px solid rgba(212,175,55,0.15)", flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px 8px 16px",
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
      padding: "20px 16px 16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      borderBottom: "1px solid rgba(212,175,55,0.2)",
    }}>
      <img
        src="/shepherd-kids-logo.png"
        alt="ShepherdKids"
        style={{
          width: "192px",
          height: "auto",
          borderRadius: "12px",
          border: "2px solid rgba(212,175,55,0.65)",
        }}
      />
      <p style={{
        margin: "10px 0 0",
        fontSize: "11px",
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
