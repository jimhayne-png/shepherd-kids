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
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <img
            src="/shepherdwell-logo.png"
            alt="ShepherdWell"
            style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              objectFit: 'cover',
              objectPosition: 'center',
              border: '2px solid rgba(240,192,64,0.4)',
            }}
          />
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
                  backgroundColor: isActive ? "#F28C28" : "transparent",
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
