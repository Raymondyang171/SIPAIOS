"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type PageStatus = "loading" | "connected" | "down";
type TabId = "progress" | "bom" | "logs";

interface WorkOrder {
  id: string;
  wo_no: string;
  status: string;
  item_id: string;
  item_no: string;
  item_name?: string;
  planned_qty: number;
  uom_id: string;
  bom_version_id: string;
  primary_warehouse_id: string;
  site_id: string;
  site_code: string;
  site_name?: string;
  warehouse_code: string;
  warehouse_name?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  released_at?: string;
  completed_at?: string;
  created_at: string;
  note?: string;
}

interface MaterialPrecheck {
  work_order_id: string;
  wo_no: string;
  qty_to_produce: number;
  materials: Array<{
    item_id: string;
    item_no: string;
    item_name: string;
    qty_per: number;
    scrap_factor: number;
    qty_needed: number;
    qty_available: number;
    status: "ok" | "insufficient";
    available_lots: Array<{
      lot_id: string;
      lot_code: string;
      qty: number;
    }>;
  }>;
  can_produce: boolean;
  scope_resolved_by?: string;
}

// Helper: format date or return placeholder
function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

// Helper: format datetime or return placeholder
function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// Helper: display value or placeholder
function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

// Status badge color mapping
function getStatusBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case "released":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "completed":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    case "draft":
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
  }
}

export default function WorkOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<TabId>("progress");

  // BOM/Material precheck state
  const [precheck, setPrecheck] = useState<MaterialPrecheck | null>(null);
  const [precheckLoading, setPrecheckLoading] = useState(false);
  const [precheckError, setPrecheckError] = useState<string | null>(null);

  const fetchWorkOrder = useCallback(async () => {
    if (!id) return;

    setIsRetrying(true);
    setPageStatus("loading");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

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

  const fetchPrecheck = useCallback(async () => {
    if (!id || !workOrder) return;

    setPrecheckLoading(true);
    setPrecheckError(null);

    try {
      const response = await fetch(
        `/api/work-orders/${id}/material-precheck?qty_produced=${workOrder.planned_qty}`,
        { method: "GET", cache: "no-store" }
      );

      if (response.ok) {
        const data = await response.json();
        setPrecheck(data);
      } else {
        const data = await response.json().catch(() => ({}));
        setPrecheckError(data.message || "Failed to fetch material precheck");
      }
    } catch {
      setPrecheckError("Cannot connect to API");
    } finally {
      setPrecheckLoading(false);
    }
  }, [id, workOrder]);

  useEffect(() => {
    fetchWorkOrder();
  }, [fetchWorkOrder]);

  // Fetch precheck when switching to BOM tab
  useEffect(() => {
    if (activeTab === "bom" && workOrder && !precheck && !precheckLoading) {
      fetchPrecheck();
    }
  }, [activeTab, workOrder, precheck, precheckLoading, fetchPrecheck]);

  const statusConfig: Record<PageStatus, { label: string; color: string; bgColor: string }> = {
    loading: { label: "Loading...", color: "text-zinc-500", bgColor: "bg-zinc-100 dark:bg-zinc-800" },
    connected: { label: "Connected", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-900/20" },
    down: { label: "Down", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-900/20" },
  };

  const currentStatus = statusConfig[pageStatus];

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "progress", label: "Progress" },
    { id: "bom", label: "BOM / Materials" },
    { id: "logs", label: "Logs" },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation */}
        <nav className="flex items-center gap-3">
          <Link
            href="/production/work-orders"
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-sm"
          >
            ← Back to List
          </Link>
        </nav>

        {/* Header Card */}
        <header className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {workOrder ? displayValue(workOrder.wo_no) : "Work Order"}
                </h1>
                {workOrder && (
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeClass(workOrder.status)}`}>
                    {displayValue(workOrder.status)}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
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
                  {isRetrying ? "Retrying..." : "Refresh"}
                </button>
              )}
            </div>
          </div>

          {/* Info Grid (always shown when connected) */}
          {pageStatus === "connected" && workOrder && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Item</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {displayValue(workOrder.item_no)}
                </dd>
                <dd className="text-xs text-zinc-500 dark:text-zinc-400">
                  {displayValue(workOrder.item_name)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Planned Qty</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {displayValue(workOrder.planned_qty)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Site</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {displayValue(workOrder.site_code)}
                </dd>
                <dd className="text-xs text-zinc-500 dark:text-zinc-400">
                  {displayValue(workOrder.site_name)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Warehouse</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {displayValue(workOrder.warehouse_code)}
                </dd>
                <dd className="text-xs text-zinc-500 dark:text-zinc-400">
                  {displayValue(workOrder.warehouse_name)}
                </dd>
              </div>
            </div>
          )}
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

        {/* Tabs Section */}
        {pageStatus === "connected" && workOrder && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-zinc-200 dark:border-zinc-700">
              <nav className="flex -mb-px">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Progress Tab */}
              {activeTab === "progress" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Production Progress</h3>

                  {/* Timeline / Milestones */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                        ✓
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Created</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDateTime(workOrder.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        workOrder.released_at
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500"
                      }`}>
                        {workOrder.released_at ? "✓" : "○"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Released</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {workOrder.released_at ? formatDateTime(workOrder.released_at) : "尚無資料"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        workOrder.completed_at
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500"
                      }`}>
                        {workOrder.completed_at ? "✓" : "○"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Completed</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {workOrder.completed_at ? formatDateTime(workOrder.completed_at) : "尚無資料"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Schedule</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-xs text-zinc-500 dark:text-zinc-400">Scheduled Start</dt>
                        <dd className="text-sm text-zinc-900 dark:text-zinc-100">{formatDate(workOrder.scheduled_start)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-500 dark:text-zinc-400">Scheduled End</dt>
                        <dd className="text-sm text-zinc-900 dark:text-zinc-100">{formatDate(workOrder.scheduled_end)}</dd>
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  {workOrder.note && (
                    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Note</h4>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{workOrder.note}</p>
                    </div>
                  )}
                </div>
              )}

              {/* BOM / Materials Tab */}
              {activeTab === "bom" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">BOM / Material Precheck</h3>
                    {precheck && (
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                        precheck.can_produce
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      }`}>
                        {precheck.can_produce ? "Can Produce" : "Insufficient Stock"}
                      </span>
                    )}
                  </div>

                  {precheckLoading && (
                    <div className="flex items-center justify-center py-8">
                      <span className="inline-block w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                      <span className="ml-2 text-sm text-zinc-500">Loading materials...</span>
                    </div>
                  )}

                  {precheckError && (
                    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                      <p className="text-sm text-red-600 dark:text-red-400">{precheckError}</p>
                      <button
                        onClick={fetchPrecheck}
                        className="mt-2 text-sm text-red-700 dark:text-red-300 underline hover:no-underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {precheck && precheck.materials.length === 0 && (
                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                      尚無資料 — No BOM materials defined
                    </div>
                  )}

                  {precheck && precheck.materials.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-zinc-700">
                            <th className="text-left py-3 px-2 font-medium text-zinc-500 dark:text-zinc-400">Item</th>
                            <th className="text-right py-3 px-2 font-medium text-zinc-500 dark:text-zinc-400">Qty/Unit</th>
                            <th className="text-right py-3 px-2 font-medium text-zinc-500 dark:text-zinc-400">Needed</th>
                            <th className="text-right py-3 px-2 font-medium text-zinc-500 dark:text-zinc-400">Available</th>
                            <th className="text-center py-3 px-2 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {precheck.materials.map((m, idx) => (
                            <tr key={idx} className="border-b border-zinc-100 dark:border-zinc-700/50 last:border-0">
                              <td className="py-3 px-2">
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">{m.item_no}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{m.item_name}</p>
                              </td>
                              <td className="text-right py-3 px-2 text-zinc-700 dark:text-zinc-300">
                                {m.qty_per.toFixed(2)}
                              </td>
                              <td className="text-right py-3 px-2 text-zinc-700 dark:text-zinc-300">
                                {m.qty_needed.toFixed(2)}
                              </td>
                              <td className="text-right py-3 px-2 text-zinc-700 dark:text-zinc-300">
                                {m.qty_available.toFixed(2)}
                              </td>
                              <td className="text-center py-3 px-2">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                                  m.status === "ok"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                }`}>
                                  {m.status === "ok" ? "OK" : "Insufficient"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Precheck metadata */}
                  {precheck && precheck.scope_resolved_by && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 pt-2">
                      Scope resolved by: {precheck.scope_resolved_by}
                    </p>
                  )}
                </div>
              )}

              {/* Logs Tab */}
              {activeTab === "logs" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Activity Logs</h3>
                  <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                    尚無資料 — No activity logs available
                  </div>
                </div>
              )}
            </div>
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
