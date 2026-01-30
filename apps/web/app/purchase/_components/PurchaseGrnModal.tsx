"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";

interface POLine {
  id: string;
  line_no: number;
  item_id: string;
  item_no?: string;
  item_name?: string;
  qty: number;
  uom_id: string;
  uom_code?: string;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  site_id: string;
}

interface GRNLine {
  item_id: string;
  item_no?: string;
  qty_received: number;
  uom_id: string;
  warehouse_id: string;
}

interface SubmitState {
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
}

interface PurchaseGrnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrderId: string;
  supplierId: string;
  siteId: string;
  poNo: string;
  lines: POLine[];
}

export function PurchaseGrnModal({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrderId,
  supplierId,
  siteId,
  poNo,
  lines,
}: PurchaseGrnModalProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);

  const [grnLines, setGrnLines] = useState<GRNLine[]>([]);
  const [note, setNote] = useState("");

  const [submitState, setSubmitState] = useState<SubmitState>({
    isSubmitting: false,
    error: null,
    success: false,
  });

  // Load warehouses for the site
  const loadWarehouses = useCallback(async () => {
    if (!siteId) return;

    setIsLoadingWarehouses(true);
    try {
      const response = await fetch(`/api/warehouses?site_id=${siteId}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.warehouses || []);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingWarehouses(false);
    }
  }, [siteId]);

  // Initialize GRN lines from PO lines
  useEffect(() => {
    if (isOpen && lines.length > 0) {
      setGrnLines(
        lines.map((line) => ({
          item_id: line.item_id,
          item_no: line.item_no,
          qty_received: line.qty,
          uom_id: line.uom_id,
          warehouse_id: "",
        }))
      );
      setNote("");
      setSubmitState({ isSubmitting: false, error: null, success: false });
      loadWarehouses();
    }
  }, [isOpen, lines, loadWarehouses]);

  const updateLine = (
    index: number,
    field: keyof GRNLine,
    value: string | number
  ) => {
    setGrnLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitState.isSubmitting) return;

    // Validate lines
    const validLines = grnLines.filter(
      (line) =>
        line.item_id && line.qty_received > 0 && line.uom_id && line.warehouse_id
    );

    if (validLines.length === 0) {
      setSubmitState({
        isSubmitting: false,
        error: "At least one line with warehouse selected is required",
        success: false,
      });
      return;
    }

    setSubmitState({ isSubmitting: true, error: null, success: false });

    try {
      const response = await fetch("/api/goods-receipt-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId,
          site_id: siteId,
          purchase_order_id: purchaseOrderId,
          note: note || undefined,
          lines: validLines.map((line) => ({
            item_id: line.item_id,
            qty_received: line.qty_received,
            uom_id: line.uom_id,
            warehouse_id: line.warehouse_id,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitState({ isSubmitting: false, error: null, success: true });
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setSubmitState({
          isSubmitting: false,
          error: data.message || data.error || "Failed to create GRN",
          success: false,
        });
      }
    } catch {
      setSubmitState({
        isSubmitting: false,
        error: "Cannot connect to server",
        success: false,
      });
    }
  };

  const handleClose = () => {
    if (submitState.isSubmitting) return;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Receive Goods (GRN)
          </h3>

          {/* PO Info */}
          <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-700 rounded-md">
            <div className="text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">
                Purchase Order:{" "}
              </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {poNo}
              </span>
            </div>
          </div>

          {/* Loading Warehouses */}
          {isLoadingWarehouses && (
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
              <span className="inline-block w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              Loading warehouses...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Lines */}
            <div className="space-y-3 mb-4">
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Items to Receive
              </h4>
              {grnLines.map((line, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-end p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-md"
                >
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Item
                    </label>
                    <div className="px-2 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100">
                      {line.item_no || "—"}
                    </div>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Qty Received
                    </label>
                    <input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value={line.qty_received}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "qty_received",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={submitState.isSubmitting || submitState.success}
                      className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                    />
                  </div>

                  <div className="col-span-5">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Warehouse *
                    </label>
                    <select
                      value={line.warehouse_id}
                      onChange={(e) =>
                        updateLine(index, "warehouse_id", e.target.value)
                      }
                      disabled={submitState.isSubmitting || submitState.success}
                      className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                    >
                      <option value="">Select warehouse...</option>
                      {warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.code} - {wh.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Note */}
            <div className="mb-4">
              <label
                htmlFor="grn-note"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Note (optional)
              </label>
              <textarea
                id="grn-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={submitState.isSubmitting || submitState.success}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 resize-none"
                placeholder="Optional note..."
              />
            </div>

            {/* Success Message */}
            {submitState.success && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Goods received successfully! Inventory updated.
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

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitState.isSubmitting}
                className="px-4 py-2 text-sm font-medium rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitState.isSubmitting || submitState.success}
                className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {submitState.isSubmitting && (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {submitState.isSubmitting ? "Processing..." : "Confirm Receipt"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
