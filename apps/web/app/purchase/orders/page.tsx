"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type PageStatus = "loading" | "connected" | "down" | "unauthorized";

interface PurchaseOrder {
  id: string;
  po_no: string;
  status: string;
  order_date?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_code?: string;
  site_id?: string;
  site_code?: string;
  site_name?: string;
  note?: string;
  created_at: string;
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

export default function PurchaseOrdersListPage() {
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchPurchaseOrders = useCallback(async () => {
    setIsRetrying(true);
    setPageStatus("loading");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("/api/purchase-orders", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data)
          ? data
          : data.purchase_orders || data.items || data.data || [];
        setPurchaseOrders(items);
        setPageStatus("connected");
        setError(null);
      } else if (response.status === 401) {
        setPageStatus("unauthorized");
        setError("Please sign in to view purchase orders");
        setPurchaseOrders([]);
      } else {
        const data = await response.json().catch(() => ({}));
        setPageStatus("down");
        setError(data.error || "Failed to fetch purchase orders");
        setPurchaseOrders([]);
      }
    } catch {
      setPageStatus("down");
      setError("Cannot connect to API");
      setPurchaseOrders([]);
    } finally {
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

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
    unauthorized: {
      label: "Not Signed In",
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    },
  };

  const currentStatus = statusConfig[pageStatus];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Purchase Orders
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${currentStatus.color}`}>
            {currentStatus.label}
          </span>
          {pageStatus === "connected" && (
            <Link
              href="/purchase/orders/create"
              className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              + New PO
            </Link>
          )}
          {pageStatus !== "loading" && (
            <button
              onClick={fetchPurchaseOrders}
              disabled={isRetrying}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRetrying ? "Retrying..." : "Refresh"}
            </button>
          )}
        </div>
      </header>

      {/* Auth Required Banner */}
      {pageStatus === "unauthorized" && (
        <div
          className={`rounded-lg border p-6 ${currentStatus.bgColor} border-yellow-200 dark:border-yellow-800`}
        >
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

      {/* Purchase Orders List */}
      {pageStatus === "connected" && (
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
          {purchaseOrders.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              No purchase orders found.{" "}
              <Link
                href="/purchase/orders/create"
                className="text-blue-600 hover:underline"
              >
                Create your first PO
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    PO No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Site
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {purchaseOrders.map((po) => (
                  <tr
                    key={po.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors"
                    onClick={() =>
                      (window.location.href = `/purchase/orders/${po.id}`)
                    }
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {po.po_no || po.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(po.status)}`}
                      >
                        {po.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-zinc-900 dark:text-zinc-100">
                        {po.supplier_code || po.supplier_name || "—"}
                      </span>
                      {po.supplier_name && po.supplier_code && (
                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                          {po.supplier_name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {po.site_code || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatDate(po.order_date || po.created_at)}
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
