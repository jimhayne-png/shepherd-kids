"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Reviews", href: "/dashboard/reviews" },
  { label: "Settings", href: "/dashboard/settings" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/");
        return;
      }
      setUserEmail(session.user.email ?? null);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <AppShell navItems={navItems}>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#1A4A2E" }}>
          Welcome to ShepherdWell
        </h1>
        {userEmail && (
          <p className="text-gray-500 text-sm mb-8">Signed in as {userEmail}</p>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-lg">
          <h2 className="font-semibold text-amber-800 mb-1">Church not set up yet</h2>
          <p className="text-amber-700 text-sm mb-4">
            Complete onboarding to configure your church profile and get started.
          </p>
          <a
            href="/onboarding"
            className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1A4A2E" }}
          >
            Start Onboarding
          </a>
        </div>
      </div>
    </AppShell>
  );
}
