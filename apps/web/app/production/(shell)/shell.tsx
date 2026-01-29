"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Home", href: "/production", icon: "H" },
  { label: "Work Orders", href: "/production/work-orders", icon: "W" },
];

export function ProductionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Production
          </span>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/production"
                ? pathname === "/production"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <span className="w-6 h-6 flex items-center justify-center rounded bg-zinc-200 dark:bg-zinc-600 text-xs font-bold">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-14 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between px-6">
          <h1 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Manufacturing System
          </h1>
          <Link
            href="/production/logout"
            className="px-3 py-1.5 text-sm font-medium rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Logout
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
