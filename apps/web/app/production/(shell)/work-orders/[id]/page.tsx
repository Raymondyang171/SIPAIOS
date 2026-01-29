"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type PageStatus = "loading" | "connected" | "down";

export default function WorkOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [workOrder, setWorkOrder] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchWorkOrder = useCallback(async () => {
    if (!id) return;

    setIsRetrying(true);
    setPageStatus("loading");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`/api/work-orders/${id}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setWorkOrder(data);
        setPageStatus("connected");
        setError(null);
      } else {
        const data = await response.json().catch(() => ({}));
        setPageStatus("down");
        setError(data.error || data.message || "Failed to fetch work order");
        setWorkOrder(null);
      }
    } catch {
      setPageStatus("down");
      setError("Cannot connect to API");
      setWorkOrder(null);
    } finally {
      setIsRetrying(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkOrder();
  }, [fetchWorkOrder]);

  const statusConfig: Record<PageStatus, { label: string; color: string; bgColor: string }> = {
    loading: { label: "Loading...", color: "text-zinc-500", bgColor: "bg-zinc-100 dark:bg-zinc-800" },
    connected: { label: "Connected", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-900/20" },
    down: { label: "Down", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-900/20" },
  };

  const currentStatus = statusConfig[pageStatus];

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/production/work-orders"
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                ← Back to List
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Work Order Detail
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 font-mono">
              {id}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${currentStatus.color}`}>
              {currentStatus.label}
            </span>
            {pageStatus !== "loading" && (
              <button
                onClick={fetchWorkOrder}
                disabled={isRetrying}
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRetrying ? "Retrying..." : "Retry"}
              </button>
            )}
          </div>
        </header>

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

        {/* Work Order Detail Card */}
        {pageStatus === "connected" && workOrder && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 space-y-6">
            {/* Header with WO No and Status */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {(workOrder.wo_no as string) || "—"}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-1">
                  {workOrder.id as string}
                </p>
              </div>
              <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                {(workOrder.status as string) || "—"}
              </span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Item</dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {(workOrder.item_no as string) || "—"}
                </dd>
                {workOrder.item_name && (
                  <dd className="text-xs text-zinc-500 dark:text-zinc-400">{workOrder.item_name as string}</dd>
                )}
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Planned Qty</dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {(workOrder.planned_qty as number) ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Site</dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {(workOrder.site_code as string) || "—"}
                </dd>
                {workOrder.site_name && (
                  <dd className="text-xs text-zinc-500 dark:text-zinc-400">{workOrder.site_name as string}</dd>
                )}
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Warehouse</dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {(workOrder.warehouse_code as string) || "—"}
                </dd>
                {workOrder.warehouse_name && (
                  <dd className="text-xs text-zinc-500 dark:text-zinc-400">{workOrder.warehouse_name as string}</dd>
                )}
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Scheduled Start</dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {workOrder.scheduled_start ? new Date(workOrder.scheduled_start as string).toLocaleDateString() : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Created</dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {workOrder.created_at ? new Date(workOrder.created_at as string).toLocaleDateString() : "—"}
                </dd>
              </div>
            </div>

            {/* Collapsible Raw JSON */}
            <details className="pt-4 border-t border-zinc-200 dark:border-zinc-700" open>
              <summary className="cursor-pointer text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide hover:text-zinc-700 dark:hover:text-zinc-300">
                Raw JSON
              </summary>
              <pre className="mt-4 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-sm font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto">
                {JSON.stringify(workOrder, null, 2)}
              </pre>
            </details>
          </section>
        )}

        {/* Not Found */}
        {pageStatus === "connected" && !workOrder && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              Work order not found
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
