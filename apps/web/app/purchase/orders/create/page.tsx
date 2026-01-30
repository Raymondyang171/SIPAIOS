"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Supplier {
  id: string;
  code: string;
  name: string;
}

interface Site {
  id: string;
  code: string;
  name: string;
}

interface Item {
  id: string;
  item_no: string;
  name: string;
  item_type?: string;
}

interface Uom {
  id: string;
  code: string;
  name: string;
}

interface POLine {
  item_id: string;
  qty: number;
  uom_id: string;
  unit_price: number;
  note?: string;
}

interface FormState {
  supplier_id: string;
  site_id: string;
  note: string;
  lines: POLine[];
}

interface SubmitState {
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [uoms, setUoms] = useState<Uom[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);
  const [masterError, setMasterError] = useState<string | null>(null);
  const [itemsWarning, setItemsWarning] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    supplier_id: "",
    site_id: "",
    note: "",
    lines: [{ item_id: "", qty: 1, uom_id: "", unit_price: 0 }],
  });

  const [submitState, setSubmitState] = useState<SubmitState>({
    isSubmitting: false,
    error: null,
    success: false,
  });

  // Load master data
  const loadMasterData = useCallback(async () => {
    setIsLoadingMaster(true);
    setMasterError(null);
    setItemsWarning(null);
    try {
      const [suppliersRes, sitesRes, itemsRes, uomsRes] = await Promise.all([
        fetch("/api/suppliers", { cache: "no-store" }),
        fetch("/api/sites", { cache: "no-store" }),
        fetch("/api/items?type=fg,rm", { cache: "no-store" }),
        fetch("/api/uoms", { cache: "no-store" }),
      ]);

      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data.suppliers || []);
      } else {
        setMasterError("Failed to load suppliers");
      }
      if (sitesRes.ok) {
        const data = await sitesRes.json();
        setSites(data.sites || []);
      } else {
        setMasterError("Failed to load sites");
      }
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        const nextItems = data.items || [];
        setItems(nextItems);
        if (nextItems.length === 0) {
          setItemsWarning(
            "Items list is empty. Possible causes: no item seed data, company/site scope filters, or item_type mismatch (expected FG/RM)."
          );
        }
      } else if (itemsRes.status === 401) {
        setItemsWarning("Items not loaded: please log in again (401).");
      } else if (itemsRes.status === 403) {
        setItemsWarning("Items not loaded: no permission for this company/site (403).");
      } else if (itemsRes.status >= 500) {
        setItemsWarning("Items not loaded: server error (5xx).");
      } else {
        setItemsWarning("Items not loaded: unexpected response from server.");
      }
      if (uomsRes.ok) {
        const data = await uomsRes.json();
        setUoms(data.uoms || []);
      } else {
        setMasterError("Failed to load UOMs");
      }
    } catch {
      setMasterError("Cannot connect to server while loading master data");
    } finally {
      setIsLoadingMaster(false);
    }
  }, []);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        { item_id: "", qty: 1, uom_id: "", unit_price: 0 },
      ],
    }));
  };

  const removeLine = (index: number) => {
    if (form.lines.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const updateLine = (index: number, field: keyof POLine, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      ),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitState.isSubmitting) return;

    // Validation
    if (!form.supplier_id || !form.site_id) {
      setSubmitState({
        isSubmitting: false,
        error: "Supplier and Site are required",
        success: false,
      });
      return;
    }

    const validLines = form.lines.filter(
      (line) => line.item_id && line.qty > 0 && line.uom_id
    );

    if (validLines.length === 0) {
      setSubmitState({
        isSubmitting: false,
        error: "At least one valid line is required",
        success: false,
      });
      return;
    }

    setSubmitState({ isSubmitting: true, error: null, success: false });

    try {
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: form.supplier_id,
          site_id: form.site_id,
          note: form.note || undefined,
          lines: validLines,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitState({ isSubmitting: false, error: null, success: true });
        // Navigate to detail page or list
        setTimeout(() => {
          router.push(`/purchase/orders/${data.id}`);
        }, 1000);
      } else {
        setSubmitState({
          isSubmitting: false,
          error: data.message || data.error || "Failed to create PO",
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

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Navigation */}
      <nav className="flex items-center gap-3">
        <Link
          href="/purchase/orders"
          className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-sm"
        >
          ← Back to List
        </Link>
      </nav>

      {/* Header */}
      <header>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Create Purchase Order
        </h2>
      </header>

      {/* Loading Master Data */}
      {isLoadingMaster && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span className="inline-block w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          Loading master data...
        </div>
      )}
      {!isLoadingMaster && masterError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{masterError}</p>
        </div>
      )}
      {!isLoadingMaster && itemsWarning && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {itemsWarning}
          </p>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6"
      >
        {/* Header Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="supplier"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Supplier *
            </label>
            <select
              id="supplier"
              value={form.supplier_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, supplier_id: e.target.value }))
              }
              disabled={submitState.isSubmitting || submitState.success}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              required
            >
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="site"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Site *
            </label>
            <select
              id="site"
              value={form.site_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, site_id: e.target.value }))
              }
              disabled={submitState.isSubmitting || submitState.success}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              required
            >
              <option value="">Select site...</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="note"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Note
          </label>
          <textarea
            id="note"
            rows={2}
            value={form.note}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, note: e.target.value }))
            }
            disabled={submitState.isSubmitting || submitState.success}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 resize-none"
            placeholder="Optional note..."
          />
        </div>

        {/* Lines Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Line Items
            </h3>
            <button
              type="button"
              onClick={addLine}
              disabled={submitState.isSubmitting || submitState.success}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 transition-colors"
            >
              + Add Line
            </button>
          </div>

          <div className="space-y-3">
            {form.lines.map((line, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 items-end p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-md"
              >
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Item *
                  </label>
                  <select
                    value={line.item_id}
                    onChange={(e) =>
                      updateLine(index, "item_id", e.target.value)
                    }
                    disabled={submitState.isSubmitting || submitState.success}
                    className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  >
                    <option value="">Select item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.item_no} - {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Qty *
                  </label>
                  <input
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    value={line.qty}
                    onChange={(e) =>
                      updateLine(index, "qty", parseFloat(e.target.value) || 0)
                    }
                    disabled={submitState.isSubmitting || submitState.success}
                    className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    UOM *
                  </label>
                  <select
                    value={line.uom_id}
                    onChange={(e) =>
                      updateLine(index, "uom_id", e.target.value)
                    }
                    disabled={submitState.isSubmitting || submitState.success}
                    className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  >
                    <option value="">UOM...</option>
                    {uoms.map((uom) => (
                      <option key={uom.id} value={uom.id}>
                        {uom.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Unit Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) =>
                      updateLine(
                        index,
                        "unit_price",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    disabled={submitState.isSubmitting || submitState.success}
                    className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  />
                </div>

                <div className="col-span-2 flex justify-end">
                  {form.lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={submitState.isSubmitting || submitState.success}
                      className="px-2 py-1.5 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Success Message */}
        {submitState.success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-600 dark:text-green-400">
              Purchase Order created successfully! Redirecting...
            </p>
          </div>
        )}

        {/* Error Message */}
        {submitState.error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">
              {submitState.error}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <Link
            href="/purchase/orders"
            className="px-4 py-2 text-sm font-medium rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitState.isSubmitting || submitState.success}
            className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {submitState.isSubmitting && (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {submitState.isSubmitting ? "Creating..." : "Create PO"}
          </button>
        </div>
      </form>
    </div>
  );
}
