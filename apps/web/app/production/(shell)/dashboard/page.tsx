"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardStats {
  pendingWorkOrders: number | null;
  recentPurchaseOrders: number | null;
  lowStockItems: number | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingWorkOrders: null,
    recentPurchaseOrders: null,
    lowStockItems: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);

      try {
        const [woRes, poRes] = await Promise.all([
          fetch("/api/work-orders").catch(() => null),
          fetch("/api/purchase-orders").catch(() => null),
        ]);

        const woData = woRes?.ok ? await woRes.json() : null;
        const poData = poRes?.ok ? await poRes.json() : null;

        const pendingWOs = woData?.items?.filter(
          (wo: { status: string }) =>
            wo.status === "PENDING" || wo.status === "IN_PROGRESS"
        ).length;

        const recentPOs = poData?.items?.length;

        setStats({
          pendingWorkOrders: pendingWOs ?? null,
          recentPurchaseOrders: recentPOs ?? null,
          lowStockItems: null, // Placeholder - no endpoint available
        });
      } catch {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        {error && (
          <button
            onClick={handleRetry}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
          >
            Retry
          </button>
        )}
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Pending Work Orders"
          value={stats.pendingWorkOrders}
          loading={loading}
          href="/production/work-orders"
          icon="W"
        />
        <StatCard
          title="Purchase Orders"
          value={stats.recentPurchaseOrders}
          loading={loading}
          href="/purchase/orders"
          icon="P"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStockItems}
          loading={loading}
          href="/production/inventory"
          icon="!"
          placeholder="N/A"
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickActionCard
            title="Create Purchase Order"
            description="Start a new purchase order"
            href="/purchase/orders/create"
            icon="+"
          />
          <QuickActionCard
            title="View Work Orders"
            description="Manage production work orders"
            href="/production/work-orders"
            icon="W"
          />
          <QuickActionCard
            title="Inventory Overview"
            description="Check stock levels"
            href="/production/inventory"
            icon="I"
          />
          <QuickActionCard
            title="Reports"
            description="View production reports"
            href="/production/reports"
            icon="R"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  loading,
  href,
  icon,
  placeholder = "N/A",
}: {
  title: string;
  value: number | null;
  loading: boolean;
  href: string;
  icon: string;
  placeholder?: string;
}) {
  return (
    <Link
      href={href}
      className="block p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-lg font-bold">
          {icon}
        </span>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {loading ? (
              <span className="inline-block w-8 h-6 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            ) : value !== null ? (
              value
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500">
                {placeholder}
              </span>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors"
    >
      <span className="w-8 h-8 flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-bold">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {title}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
    </Link>
  );
}
