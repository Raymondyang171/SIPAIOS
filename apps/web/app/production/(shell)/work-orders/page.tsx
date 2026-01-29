"use client";

import { useState, useEffect, useCallback, FormEvent, useRef } from "react";
import Link from "next/link";

type PageStatus = "loading" | "connected" | "down" | "unauthorized";

interface WorkOrder {
  id: string;
  wo_no?: string;
  status?: string;
  item_id?: string;
  item_no?: string;
  item_name?: string;
  material_no?: string;
  planned_qty?: number;
  qty?: number;
  site_id?: string;
  site_code?: string;
  site_name?: string;
  primary_warehouse_id?: string;
  bom_version_id?: string;
  created_at?: string;
}

interface InventoryBalance {
  item_id: string;
  item_code: string;
  item_description?: string;
  qty: number;
  warehouse_code?: string;
}

interface InventoryState {
  isLoading: boolean;
  error: string | null;
  fgBalance: number;
  rawBalances: InventoryBalance[];
  lastRefresh: number;
}

interface MaterialPrecheck {
  item_id: string;
  item_no: string;
  item_name?: string;
  qty_needed: number;
  qty_available: number;
  status: "ok" | "insufficient";
}

interface MaterialPrecheckState {
  isLoading: boolean;
  error: string | null;
  materials: MaterialPrecheck[];
  canProduce: boolean;
  lastQtyChecked: number;
}

interface ReportModalState {
  isOpen: boolean;
  workOrder: WorkOrder | null;
}

interface ReportFormState {
  qtyProduced: string;
  note: string;
}

interface SubmitState {
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
}

// Safe number formatting helper - never throws, always returns string
function safeFormatQty(value: unknown, decimals = 2): string {
  if (value === null || value === undefined) return "0.00";
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(parsed)) return "0.00";
  return parsed.toFixed(decimals);
}

export default function WorkOrdersListPage() {
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Report Modal state
  const [modal, setModal] = useState<ReportModalState>({
    isOpen: false,
    workOrder: null,
  });
  const [form, setForm] = useState<ReportFormState>({
    qtyProduced: "",
    note: "",
  });
  const [submitState, setSubmitState] = useState<SubmitState>({
    isSubmitting: false,
    error: null,
    success: false,
  });

  // Inventory state for modal
  const [inventory, setInventory] = useState<InventoryState>({
    isLoading: false,
    error: null,
    fgBalance: 0,
    rawBalances: [],
    lastRefresh: 0,
  });

  // Material precheck state for modal
  const [materialPrecheck, setMaterialPrecheck] = useState<MaterialPrecheckState>({
    isLoading: false,
    error: null,
    materials: [],
    canProduce: true,
    lastQtyChecked: 0,
  });

  // Ref to store latest fetchWorkOrders for use in setTimeout
  const fetchWorkOrdersRef = useRef<() => Promise<void>>(undefined);

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

  // Fetch inventory for a work order (FG item)
  const fetchInventory = useCallback(async (wo: WorkOrder) => {
    if (!wo.item_id) {
      setInventory({
        isLoading: false,
        error: "No item_id available",
        fgBalance: 0,
        rawBalances: [],
        lastRefresh: Date.now(),
      });
      return;
    }

    setInventory(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch FG balance
      const fgParams = new URLSearchParams({ item_id: wo.item_id });
      if (wo.site_id) fgParams.append("site_id", wo.site_id);

      const fgResponse = await fetch(`/api/inventory-balances?${fgParams}`, {
        cache: "no-store",
      });

      if (!fgResponse.ok) {
        throw new Error("Failed to fetch inventory");
      }

      const fgData = await fgResponse.json();

      // Defensive parsing: handle array or object response
      const balances = Array.isArray(fgData)
        ? fgData
        : (fgData.balances || fgData.items || fgData.data || []);

      // Sum qty with defensive number conversion
      const fgTotal = balances.reduce((sum: number, b: Record<string, unknown>) => {
        // Try common field names: qty, on_hand, balance_qty
        const rawQty = b.qty ?? b.on_hand ?? b.balance_qty ?? 0;
        const parsed = parseFloat(String(rawQty));
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0);

      // Normalize rawBalances with safe qty values
      const safeBalances: InventoryBalance[] = balances.map((b: Record<string, unknown>) => {
        const rawQty = b.qty ?? b.on_hand ?? b.balance_qty ?? 0;
        const parsed = parseFloat(String(rawQty));
        return {
          item_id: String(b.item_id || ""),
          item_code: String(b.item_code || b.item_no || "—"),
          item_description: b.item_description ? String(b.item_description) : undefined,
          qty: Number.isFinite(parsed) ? parsed : 0,
          warehouse_code: b.warehouse_code ? String(b.warehouse_code) : undefined,
        };
      });

      setInventory({
        isLoading: false,
        error: null,
        fgBalance: Number.isFinite(fgTotal) ? fgTotal : 0,
        rawBalances: safeBalances,
        lastRefresh: Date.now(),
      });
    } catch {
      setInventory({
        isLoading: false,
        error: "Failed to load inventory",
        fgBalance: 0,
        rawBalances: [],
        lastRefresh: Date.now(),
      });
    }
  }, []);

  // Fetch material precheck for a work order
  const fetchMaterialPrecheck = useCallback(async (wo: WorkOrder, qtyProduced: number) => {
    if (!wo.id || qtyProduced <= 0) {
      setMaterialPrecheck({
        isLoading: false,
        error: null,
        materials: [],
        canProduce: true,
        lastQtyChecked: qtyProduced,
      });
      return;
    }

    setMaterialPrecheck(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const params = new URLSearchParams({ qty_produced: qtyProduced.toString() });
      const response = await fetch(`/api/work-orders/${wo.id}/material-precheck?${params}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch material precheck");
      }

      const data = await response.json();

      // Normalize materials array
      const materials: MaterialPrecheck[] = (data.materials || []).map((m: Record<string, unknown>) => ({
        item_id: String(m.item_id || ""),
        item_no: String(m.item_no || "—"),
        item_name: m.item_name ? String(m.item_name) : undefined,
        qty_needed: parseFloat(String(m.qty_needed ?? 0)),
        qty_available: parseFloat(String(m.qty_available ?? 0)),
        status: m.status === "ok" ? "ok" : "insufficient",
      }));

      setMaterialPrecheck({
        isLoading: false,
        error: null,
        materials,
        canProduce: data.can_produce ?? true,
        lastQtyChecked: qtyProduced,
      });
    } catch {
      setMaterialPrecheck({
        isLoading: false,
        error: "Failed to load material availability",
        materials: [],
        canProduce: false,
        lastQtyChecked: qtyProduced,
      });
    }
  }, []);

  // Debounce ref for material precheck
  const precheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref updated for use in setTimeout callbacks
  useEffect(() => {
    fetchWorkOrdersRef.current = fetchWorkOrders;
  }, [fetchWorkOrders]);

  // Re-fetch material precheck when qty changes (debounced)
  useEffect(() => {
    if (!modal.isOpen || !modal.workOrder) return;

    const qtyValue = parseFloat(form.qtyProduced);
    if (isNaN(qtyValue) || qtyValue <= 0) return;

    // Clear existing timeout
    if (precheckTimeoutRef.current) {
      clearTimeout(precheckTimeoutRef.current);
    }

    // Debounce the precheck call
    precheckTimeoutRef.current = setTimeout(() => {
      fetchMaterialPrecheck(modal.workOrder!, qtyValue);
    }, 300);

    return () => {
      if (precheckTimeoutRef.current) {
        clearTimeout(precheckTimeoutRef.current);
      }
    };
  }, [form.qtyProduced, modal.isOpen, modal.workOrder, fetchMaterialPrecheck]);

  // Open report modal
  const openReportModal = (wo: WorkOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    setModal({ isOpen: true, workOrder: wo });
    setForm({ qtyProduced: "", note: "" });
    setSubmitState({ isSubmitting: false, error: null, success: false });
    setInventory({ isLoading: true, error: null, fgBalance: 0, rawBalances: [], lastRefresh: 0 });
    setMaterialPrecheck({ isLoading: true, error: null, materials: [], canProduce: true, lastQtyChecked: 0 });
    fetchInventory(wo);
    fetchMaterialPrecheck(wo, 1); // Initial precheck with qty=1
  };

  // Close modal
  const closeModal = () => {
    if (submitState.isSubmitting) return;
    setModal({ isOpen: false, workOrder: null });
    setForm({ qtyProduced: "", note: "" });
    setSubmitState({ isSubmitting: false, error: null, success: false });
    setMaterialPrecheck({ isLoading: false, error: null, materials: [], canProduce: true, lastQtyChecked: 0 });
  };

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!modal.workOrder || submitState.isSubmitting) return;

    const qtyValue = parseFloat(form.qtyProduced);
    if (isNaN(qtyValue) || qtyValue <= 0) {
      setSubmitState({
        isSubmitting: false,
        error: "Quantity must be greater than 0",
        success: false,
      });
      return;
    }

    setSubmitState({ isSubmitting: true, error: null, success: false });

    try {
      const response = await fetch("/api/production-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_order_id: modal.workOrder.id,
          qty_produced: qtyValue,
          note: form.note || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitState({ isSubmitting: false, error: null, success: true });
        // Refresh inventory immediately to show updated balance
        if (modal.workOrder) {
          fetchInventory(modal.workOrder);
        }
        // Auto close after delay and refresh list
        setTimeout(() => {
          // Close modal first
          setModal({ isOpen: false, workOrder: null });
          setForm({ qtyProduced: "", note: "" });
          setSubmitState({ isSubmitting: false, error: null, success: false });
          setMaterialPrecheck({ isLoading: false, error: null, materials: [], canProduce: true, lastQtyChecked: 0 });
          // Then refresh list using ref to get latest function
          fetchWorkOrdersRef.current?.();
        }, 2000); // Extended to 2s so user can see inventory change
      } else {
        // Handle specific error types
        let errorMessage = data.message || data.error || "Failed to submit report";
        if (data.error === "INSUFFICIENT_STOCK" && data.details) {
          errorMessage = `Insufficient stock for ${data.details.item_no || "item"}: need ${safeFormatQty(data.details.qty_needed)}, available ${safeFormatQty(data.details.qty_available)}`;
        } else if (data.error === "INVALID_STATUS") {
          errorMessage = data.message || "Work order must be in 'released' status";
        }
        setSubmitState({ isSubmitting: false, error: errorMessage, success: false });
      }
    } catch {
      setSubmitState({
        isSubmitting: false,
        error: "Cannot connect to server",
        success: false,
      });
    }
  };

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
                    <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Action
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
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => openReportModal(wo, e)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                          Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

      {/* Report Modal */}
      {modal.isOpen && modal.workOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Production Report
            </h3>

            {/* Work Order Info */}
            <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-700 rounded-md">
              <div className="text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">WO: </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {modal.workOrder.wo_no || modal.workOrder.id.slice(0, 8)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Item: </span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {modal.workOrder.item_no || modal.workOrder.material_no || "—"}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Planned Qty: </span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {modal.workOrder.planned_qty ?? modal.workOrder.qty ?? "—"}
                </span>
              </div>
            </div>

            {/* FG Inventory Panel */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  FG Inventory (On-Hand)
                </span>
                {inventory.isLoading && (
                  <span className="inline-block w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              {inventory.error ? (
                <p className="text-xs text-red-500">{inventory.error}</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {modal.workOrder.item_no || "—"}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {inventory.isLoading ? "..." : safeFormatQty(inventory.fgBalance)}
                    </span>
                  </div>
                  {inventory.rawBalances.length > 0 && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 pt-1 border-t border-blue-200 dark:border-blue-700">
                      {inventory.rawBalances.slice(0, 3).map((b, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{b.item_code || "—"}</span>
                          <span>{safeFormatQty(b.qty)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Materials Inventory Panel */}
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Materials Inventory
                </span>
                {materialPrecheck.isLoading && (
                  <span className="inline-block w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              {materialPrecheck.error ? (
                <p className="text-xs text-red-500">{materialPrecheck.error}</p>
              ) : materialPrecheck.materials.length === 0 && !materialPrecheck.isLoading ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">No BOM materials</p>
              ) : (
                <div className="space-y-2">
                  {materialPrecheck.materials.map((m, i) => (
                    <div key={i} className="text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                          {m.item_no}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          m.status === "ok"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        }`}>
                          {m.status === "ok" ? "OK" : "Insufficient"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        <span>On-hand: {safeFormatQty(m.qty_available)}</span>
                        <span>Need: {safeFormatQty(m.qty_needed)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Success Message */}
            {submitState.success && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Report submitted successfully!
                </p>
              </div>
            )}

            {/* Error Message */}
            {submitState.error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {submitState.error}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="qtyProduced"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Quantity Produced *
                  </label>
                  <input
                    type="number"
                    id="qtyProduced"
                    step="0.0001"
                    min="0.0001"
                    value={form.qtyProduced}
                    onChange={(e) => setForm({ ...form, qtyProduced: e.target.value })}
                    disabled={submitState.isSubmitting || submitState.success}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter quantity"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="note"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Note (optional)
                  </label>
                  <textarea
                    id="note"
                    rows={2}
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    disabled={submitState.isSubmitting || submitState.success}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    placeholder="Optional note"
                  />
                </div>
              </div>

              {/* Insufficient Materials Warning */}
              {!materialPrecheck.canProduce && materialPrecheck.materials.length > 0 && !materialPrecheck.isLoading && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Cannot submit: Insufficient material stock for{" "}
                    {materialPrecheck.materials
                      .filter(m => m.status === "insufficient")
                      .map(m => m.item_no)
                      .join(", ")}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitState.isSubmitting}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitState.isSubmitting || submitState.success || !form.qtyProduced || !materialPrecheck.canProduce}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {submitState.isSubmitting && (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {submitState.isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
