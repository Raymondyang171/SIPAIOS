"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PurchaseGrnModal } from "../../_components/PurchaseGrnModal";

type PageStatus = "loading" | "connected" | "down";

interface POLine {
  id: string;
  line_no: number;
  item_id: string;
  item_no?: string;
  item_name?: string;
  qty: number;
  uom_id: string;
  uom_code?: string;
  unit_price?: number | string | null;
}

interface GoodsReceipt {
  id: string;
  grn_no: string;
  status: string;
  received_at?: string;
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  po_no: string;
  status: string;
  order_date?: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_code?: string;
  site_id: string;
  site_code?: string;
  site_name?: string;
  note?: string;
  created_at: string;
  lines: POLine[];
  goods_receipts: GoodsReceipt[];
}

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

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatUnitPrice(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const maybeValue =
    typeof value === "object" && value !== null && "value" in value
      ? (value as { value?: unknown }).value
      : value;
  const numeric =
    typeof maybeValue === "number"
      ? maybeValue
      : typeof maybeValue === "bigint"
        ? Number(maybeValue)
        : Number(maybeValue);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "—";
}

function getStatusBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case "approved":
    case "confirmed":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    case "received":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    case "draft":
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
  }
}

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // GRN Modal state
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);

  const fetchPurchaseOrder = useCallback(async () => {
    if (!id) return;

    setIsRetrying(true);
    setPageStatus("loading");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setPurchaseOrder(data);
        setPageStatus("connected");
        setError(null);
      } else {
        const data = await response.json().catch(() => ({}));
        setPageStatus("down");
        setError(data.error || data.message || "Failed to fetch purchase order");
        setPurchaseOrder(null);
      }
    } catch {
      setPageStatus("down");
      setError("Cannot connect to API");
      setPurchaseOrder(null);
    } finally {
      setIsRetrying(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPurchaseOrder();
  }, [fetchPurchaseOrder]);

  const handleGrnSuccess = () => {
    setIsGrnModalOpen(false);
    fetchPurchaseOrder(); // Refresh to show updated GRN list
  };

  const statusConfig: Record<
    PageStatus,
    { label: string; color: string; bgColor: string }
  > = {
    loading: {
      label: "Loading...",
      color: "text-zinc-500",
      bgColor: "bg-zinc-100 dark:bg-zinc-800",
    },
    connected: {
      label: "Connected",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    down: {
      label: "Down",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-900/20",
    },
  };

  const currentStatus = statusConfig[pageStatus];

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation */}
        <nav className="flex items-center gap-3">
          <Link
            href="/purchase/orders"
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
                  {purchaseOrder ? displayValue(purchaseOrder.po_no) : "Purchase Order"}
                </h1>
                {purchaseOrder && (
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeClass(purchaseOrder.status)}`}
                  >
                    {displayValue(purchaseOrder.status)}
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
              {pageStatus === "connected" && purchaseOrder && (
                <button
                  onClick={() => setIsGrnModalOpen(true)}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  Receive Goods
                </button>
              )}
              {pageStatus !== "loading" && (
                <button
                  onClick={fetchPurchaseOrder}
                  disabled={isRetrying}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRetrying ? "Retrying..." : "Refresh"}
                </button>
              )}
            </div>
          </div>

          {/* Info Grid */}
          {pageStatus === "connected" && purchaseOrder && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Supplier
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {displayValue(purchaseOrder.supplier_code)}
                </dd>
                <dd className="text-xs text-zinc-500 dark:text-zinc-400">
                  {displayValue(purchaseOrder.supplier_name)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Site
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {displayValue(purchaseOrder.site_code)}
                </dd>
                <dd className="text-xs text-zinc-500 dark:text-zinc-400">
                  {displayValue(purchaseOrder.site_name)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Order Date
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatDate(purchaseOrder.order_date || purchaseOrder.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Created
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatDateTime(purchaseOrder.created_at)}
                </dd>
              </div>
            </div>
          )}
        </header>

        {/* Status Banner (when down) */}
        {pageStatus === "down" && (
          <div
            className={`rounded-lg border p-4 ${currentStatus.bgColor} border-red-200 dark:border-red-800`}
          >
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

        {/* Lines Section */}
        {pageStatus === "connected" && purchaseOrder && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Line Items
              </h3>
            </div>
            {purchaseOrder.lines.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                No line items
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Item
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      UOM
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Unit Price
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {purchaseOrder.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {line.line_no}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {displayValue(line.item_no)}
                        </span>
                        {line.item_name && (
                          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                            {line.item_name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">
                        {line.qty}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {displayValue(line.uom_code)}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                        {formatUnitPrice(line.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* Goods Receipts Section */}
        {pageStatus === "connected" && purchaseOrder && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Goods Receipts
              </h3>
            </div>
            {!purchaseOrder.goods_receipts ||
            purchaseOrder.goods_receipts.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                No goods receipts yet.{" "}
                <button
                  onClick={() => setIsGrnModalOpen(true)}
                  className="text-blue-600 hover:underline"
                >
                  Receive goods
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      GRN No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Received At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {purchaseOrder.goods_receipts.map((grn) => (
                    <tr key={grn.id}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {grn.grn_no}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(grn.status)}`}
                        >
                          {grn.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {formatDateTime(grn.received_at || grn.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* Note Section */}
        {pageStatus === "connected" && purchaseOrder && purchaseOrder.note && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Note
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {purchaseOrder.note}
            </p>
          </section>
        )}

        {/* Not Found */}
        {pageStatus === "connected" && !purchaseOrder && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              Purchase order not found
            </p>
          </div>
        )}
      </div>

      {/* GRN Modal */}
      {purchaseOrder && (
        <PurchaseGrnModal
          isOpen={isGrnModalOpen}
          onClose={() => setIsGrnModalOpen(false)}
          onSuccess={handleGrnSuccess}
          purchaseOrderId={purchaseOrder.id}
          supplierId={purchaseOrder.supplier_id}
          siteId={purchaseOrder.site_id}
          poNo={purchaseOrder.po_no}
          lines={purchaseOrder.lines}
        />
      )}
    </main>
  );
}
