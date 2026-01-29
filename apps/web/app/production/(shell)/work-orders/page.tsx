"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type PageStatus = "loading" | "connected" | "down" | "unauthorized";

interface WorkOrder {
  id: string;
  wo_no?: string;
  status?: string;
  // Backend returns item_no, legacy might use material_no
  item_no?: string;
  item_name?: string;
  material_no?: string;
  // Backend returns planned_qty, legacy might use qty
  planned_qty?: number;
  qty?: number;
  site_code?: string;
  site_name?: string;
  created_at?: string;
}

export default function WorkOrdersListPage() {
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchWorkOrders = useCallback(async () => {
    setIsRetrying(true);
    setPageStatus("loading");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch("/api/work-orders", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : data.work_orders || data.items || data.data || [];
        setWorkOrders(items);
        setPageStatus("connected");
        setError(null);
      } else if (response.status === 401) {
        setPageStatus("unauthorized");
        setError("Please sign in to view work orders");
        setWorkOrders([]);
      } else {
        const data = await response.json().catch(() => ({}));
        setPageStatus("down");
        setError(data.error || "Failed to fetch work orders");
        setWorkOrders([]);
      }
    } catch {
      setPageStatus("down");
      setError("Cannot connect to API");
      setWorkOrders([]);
    } finally {
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const statusConfig: Record<PageStatus, { label: string; color: string; bgColor: string }> = {
    loading: { label: "Loading...", color: "text-zinc-500", bgColor: "bg-zinc-100 dark:bg-zinc-800" },
    connected: { label: "Connected", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-900/20" },
    down: { label: "Down", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-900/20" },
    unauthorized: { label: "Not Signed In", color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-900/20" },
  };

  const currentStatus = statusConfig[pageStatus];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Work Orders
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${currentStatus.color}`}>
            {currentStatus.label}
          </span>
          {pageStatus !== "loading" && (
            <button
              onClick={fetchWorkOrders}
              disabled={isRetrying}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRetrying ? "Retrying..." : "Retry"}
            </button>
          )}
        </div>
      </header>

        {/* Auth Required Banner */}
        {pageStatus === "unauthorized" && (
          <div className={`rounded-lg border p-6 ${currentStatus.bgColor} border-yellow-200 dark:border-yellow-800`}>
            <div className="flex flex-col items-center gap-4">
              <p className={`text-sm ${currentStatus.color}`}>
                {error || "Please sign in to continue"}
              </p>
              <Link
                href="/production/login"
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Status Banner (when down) */}
        {pageStatus === "down" && (
          <div className={`rounded-lg border p-4 ${currentStatus.bgColor} border-red-200 dark:border-red-800`}>
            <p className={`text-sm ${currentStatus.color}`}>
              {error || "Unable to connect to API"}
            </p>
          </div>
        )}

        {/* Loading State */}
        {pageStatus === "loading" && (
          <div className="flex items-center justify-center py-12">
            <span className="inline-block w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Work Orders List */}
        {pageStatus === "connected" && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
            {workOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                No work orders found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      WO No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Item
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Site
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {workOrders.map((wo) => (
                    <tr
                      key={wo.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/production/work-orders/${wo.id}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {wo.wo_no || wo.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                          {wo.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-zinc-900 dark:text-zinc-100">
                          {wo.item_no || wo.material_no || "—"}
                        </span>
                        {wo.item_name && (
                          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                            {wo.item_name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                        {wo.planned_qty ?? wo.qty ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {wo.site_code || "—"}
                        {wo.site_name && (
                          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                            {wo.site_name}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
    </div>
  );
}
