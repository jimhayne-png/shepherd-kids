"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface AppShellProps {
  navItems: NavItem[];
  children: React.ReactNode;
}

export default function AppShell({ navItems, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className="w-64 flex-shrink-0 flex flex-col"
        style={{ backgroundColor: "#1A4A2E" }}
      >
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="#f0c040" />
              <path
                d="M18 8 L18 28 M12 14 Q18 8 24 14"
                stroke="#1A4A2E"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span className="text-xl font-bold text-white">
              Shepherd<span style={{ color: "#f0c040" }}>Well</span>
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? "#f0c040" : "transparent",
                  color: isActive ? "#1A4A2E" : "rgba(255,255,255,0.8)",
                }}
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
