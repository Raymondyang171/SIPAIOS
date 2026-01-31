"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

interface WidgetState {
  value: number | null;
  loading: boolean;
  error: boolean;
  hasMore?: boolean; // true if count might be truncated (e.g., API returns max 100)
}

interface DashboardStats {
  pendingWorkOrders: WidgetState;
  openPurchaseOrders: WidgetState;
  lowStockItems: WidgetState;
}

const initialWidgetState: WidgetState = {
  value: null,
  loading: true,
  error: false,
};

// Helper to extract items array from various API response formats
function extractItems<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  const obj = data as Record<string, unknown>;
  return (obj.items || obj.work_orders || obj.purchase_orders || obj.data || []) as T[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingWorkOrders: { ...initialWidgetState },
    openPurchaseOrders: { ...initialWidgetState },
    lowStockItems: { value: null, loading: false, error: false },
  });

  const fetchWorkOrders = useCallback(async () => {
    setStats((prev) => ({
      ...prev,
      pendingWorkOrders: { ...prev.pendingWorkOrders, loading: true, error: false },
    }));

    try {
      const res = await fetch("/api/work-orders", { cache: "no-store" });
      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const items = extractItems<{ status?: string }>(data);

      // Count PENDING, IN_PROGRESS, or RELEASED (active work orders)
      const activeStatuses = ["PENDING", "IN_PROGRESS", "RELEASED", "pending", "in_progress", "released"];
      const pendingCount = items.filter((wo) =>
        activeStatuses.includes(wo.status || "")
      ).length;

      setStats((prev) => ({
        ...prev,
        pendingWorkOrders: {
          value: pendingCount,
          loading: false,
          error: false,
          hasMore: items.length >= 100, // API might limit results
        },
      }));
    } catch {
      setStats((prev) => ({
        ...prev,
        pendingWorkOrders: { value: null, loading: false, error: true },
      }));
    }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    setStats((prev) => ({
      ...prev,
      openPurchaseOrders: { ...prev.openPurchaseOrders, loading: true, error: false },
    }));

    try {
      const res = await fetch("/api/purchase-orders", { cache: "no-store" });
      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const items = extractItems<{ status?: string }>(data);

      // Count open POs (not cancelled, not fully received)
      const openStatuses = ["DRAFT", "APPROVED", "CONFIRMED", "draft", "approved", "confirmed"];
      const openCount = items.filter((po) =>
        openStatuses.includes(po.status || "") || !po.status
      ).length;

      setStats((prev) => ({
        ...prev,
        openPurchaseOrders: {
          value: openCount,
          loading: false,
          error: false,
          hasMore: items.length >= 100,
        },
      }));
    } catch {
      setStats((prev) => ({
        ...prev,
        openPurchaseOrders: { value: null, loading: false, error: true },
      }));
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
    fetchPurchaseOrders();
  }, [fetchWorkOrders, fetchPurchaseOrders]);

  const anyLoading =
    stats.pendingWorkOrders.loading || stats.openPurchaseOrders.loading;

  const handleRefreshAll = () => {
    fetchWorkOrders();
    fetchPurchaseOrders();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        <button
          onClick={handleRefreshAll}
          disabled={anyLoading}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 transition-colors"
        >
          {anyLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Pending Work Orders"
          widgetState={stats.pendingWorkOrders}
          href="/production/work-orders"
          icon="W"
          onRetry={fetchWorkOrders}
        />
        <StatCard
          title="Open Purchase Orders"
          widgetState={stats.openPurchaseOrders}
          href="/purchase/orders"
          icon="P"
          onRetry={fetchPurchaseOrders}
        />
        <StatCard
          title="Low Stock Alerts"
          widgetState={stats.lowStockItems}
          href="/production/inventory"
          icon="!"
          noDataMessage="Not available"
          noDataTooltip="No inventory alert data source configured"
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
  widgetState,
  href,
  icon,
  onRetry,
  noDataMessage = "N/A",
  noDataTooltip,
}: {
  title: string;
  widgetState: WidgetState;
  href: string;
  icon: string;
  onRetry?: () => void;
  noDataMessage?: string;
  noDataTooltip?: string;
}) {
  const { value, loading, error, hasMore } = widgetState;

  const handleRetryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRetry?.();
  };

  // Format display value with "+" suffix if data might be truncated
  const displayValue = () => {
    if (loading) {
      return (
        <span className="inline-block w-8 h-6 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
      );
    }

    if (error) {
      return (
        <span className="flex items-center gap-2">
          <span className="text-zinc-400 dark:text-zinc-500">N/A</span>
          {onRetry && (
            <button
              onClick={handleRetryClick}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              Retry
            </button>
          )}
        </span>
      );
    }

    if (value !== null) {
      return (
        <span>
          {value}
          {hasMore && <span className="text-lg">+</span>}
        </span>
      );
    }

    // No data available (like Low Stock Alerts)
    return (
      <span
        className="text-zinc-400 dark:text-zinc-500 cursor-help"
        title={noDataTooltip}
      >
        {noDataMessage}
      </span>
    );
  };

  return (
    <Link
      href={href}
      className="block p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-lg font-bold">
          {icon}
        </span>
        <div className="flex-1">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {displayValue()}
          </p>
          {noDataTooltip && value === null && !loading && !error && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              {noDataTooltip}
            </p>
          )}
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
