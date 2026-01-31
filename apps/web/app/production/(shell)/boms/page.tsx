"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface ItemOption {
  id: string;
  item_no: string;
  name: string;
  item_type?: string;
  base_uom_id?: string | null;
  uom_code?: string | null;
}

interface BomSummary {
  bom_header_id: string;
  fg_item_id: string;
  fg_item_no: string;
  fg_item_name: string;
  code?: string | null;
  latest_version_id?: string | null;
  latest_version_no?: number | null;
  latest_created_at?: string | null;
}

interface BomVersion {
  id: string;
  version_no: number;
  status: string;
  created_at: string;
  effective_from: string;
  note?: string | null;
}

interface BomLine {
  id: string;
  bom_version_id: string;
  line_no: number;
  component_item_id: string;
  component_item_no: string;
  component_item_name: string;
  qty_per: string;
  uom_id: string;
  uom_code?: string | null;
  scrap_factor: string;
  note?: string | null;
}

interface BomDetail {
  header: {
    id: string;
    fg_item_id: string;
    fg_item_no: string;
    fg_item_name: string;
    code?: string | null;
    created_at: string;
  };
  versions: BomVersion[];
  lines: BomLine[];
}

interface BomLineDraft {
  child_item_id: string;
  qty: string;
  uom_id: string;
}

const EMPTY_LINE: BomLineDraft = {
  child_item_id: "",
  qty: "",
  uom_id: "",
};

export default function BomEditorPage() {
  const [items, setItems] = useState<ItemOption[]>([]);
  const [boms, setBoms] = useState<BomSummary[]>([]);
  const [detail, setDetail] = useState<BomDetail | null>(null);
  const [parentItemId, setParentItemId] = useState("");
  const [lines, setLines] = useState<BomLineDraft[]>([{ ...EMPTY_LINE }]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError(null);
      try {
        const [itemsRes, bomsRes] = await Promise.all([
          fetch("/api/items"),
          fetch("/api/boms"),
        ]);

        if (!itemsRes.ok) {
          const payload = await readResponseBody(itemsRes);
          throw new Error(extractMessage(payload, `Items error: ${itemsRes.status}`));
        }
        if (!bomsRes.ok) {
          const payload = await readResponseBody(bomsRes);
          throw new Error(extractMessage(payload, `BOMs error: ${bomsRes.status}`));
        }

        const itemsPayload = await readResponseBody(itemsRes);
        const bomsPayload = await readResponseBody(bomsRes);

        const itemsList = normalizeItems(itemsPayload);
        const bomsList = normalizeBoms(bomsPayload);

        setItems(itemsList);
        setBoms(bomsList);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [refreshKey]);

  useEffect(() => {
    if (!parentItemId) {
      setDetail(null);
      return;
    }
    const matched = boms.find((bom) => bom.fg_item_id === parentItemId);
    if (!matched) {
      setDetail(null);
      return;
    }
    fetchDetail(matched.bom_header_id);
  }, [parentItemId, boms]);

  const itemMap = useMemo(() => {
    return new Map(items.map((item) => [item.id, item]));
  }, [items]);

  const parentOptions = useMemo(() => {
    return items.filter((item) => {
      const type = (item.item_type || "").toLowerCase();
      return type === "fg" || type === "wip" || type === "product" || type === "";
    });
  }, [items]);

  function triggerRefresh() {
    setRefreshKey((value) => value + 1);
  }

  async function fetchDetail(headerId: string) {
    try {
      const res = await fetch(`/api/boms/${headerId}`);
      if (!res.ok) {
        const payload = await readResponseBody(res);
        throw new Error(extractMessage(payload, `Detail error: ${res.status}`));
      }
      const payload = await readResponseBody(res);
      setDetail(payload as BomDetail);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to load BOM detail"
      );
    }
  }

  function updateLine(index: number, next: Partial<BomLineDraft>) {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...next };
      return updated;
    });
  }

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function resolveUomInfo(itemId: string) {
    const item = itemMap.get(itemId);
    return {
      uomId: item?.base_uom_id ?? "",
      uomCode: item?.uom_code ?? "",
    };
  }

  async function handleSave() {
    setActionError(null);
    setNotice(null);

    if (!parentItemId) {
      setActionError("Parent item is required.");
      return;
    }
    if (!lines.length) {
      setActionError("At least one line is required.");
      return;
    }

    for (const [index, line] of lines.entries()) {
      if (!line.child_item_id) {
        setActionError(`Line ${index + 1}: child item is required.`);
        return;
      }
      const qtyValue = Number(line.qty);
      if (!line.qty || Number.isNaN(qtyValue) || qtyValue <= 0) {
        setActionError(`Line ${index + 1}: qty must be greater than 0.`);
        return;
      }
    }

    const payload = {
      parent_item_id: parentItemId,
      note: note.trim() || undefined,
      lines: lines.map((line) => ({
        child_item_id: line.child_item_id,
        qty: line.qty,
        uom_id: line.uom_id || undefined,
      })),
    };

    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `bom-${Date.now()}`;

    setSaving(true);
    try {
      const res = await fetch("/api/boms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await readResponseBody(res);
        throw new Error(extractMessage(body, `Save error: ${res.status}`));
      }
      const body = await readResponseBody(res);
      setNotice(
        `Saved BOM v${(body as { version_no?: number }).version_no ?? ""}`
      );
      setNote("");
      setLines([{ ...EMPTY_LINE }]);
      triggerRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-1">
            <Link
              href="/production/master-data"
              className="hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Master Data
            </Link>
            <span>/</span>
            <span className="text-zinc-700 dark:text-zinc-200">BOMs</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            BOM Editor
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Create versioned BOMs and track latest revisions.
          </p>
        </div>
        <button
          onClick={triggerRefresh}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
        >
          Refresh
        </button>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}
      {actionError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              BOM List
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {boms.length} BOMs
            </span>
          </div>
          {loading ? (
            <div className="text-sm text-zinc-500">Loading...</div>
          ) : (
            <div className="overflow-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500">
                  <tr>
                    <th className="text-left px-3 py-2">Parent Item</th>
                    <th className="text-left px-3 py-2">Latest Version</th>
                    <th className="text-left px-3 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {boms.map((bom) => (
                    <tr
                      key={bom.bom_header_id}
                      className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                      onClick={() => setParentItemId(bom.fg_item_id)}
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {bom.fg_item_no}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {bom.fg_item_name}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {bom.latest_version_no ? `v${bom.latest_version_no}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {bom.latest_created_at
                          ? new Date(bom.latest_created_at).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                  {boms.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-6 text-center text-sm text-zinc-400"
                      >
                        No BOMs yet. Create the first version on the right.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              New Version
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Saving always creates a new version.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Parent Item
            </label>
            <select
              value={parentItemId}
              onChange={(event) => setParentItemId(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            >
              <option value="">Select parent item</option>
              {parentOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.item_no} - {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Lines
              </label>
              <button
                type="button"
                onClick={addLine}
                className="text-xs font-medium text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700"
              >
                + Add Line
              </button>
            </div>
            {lines.map((line, index) => {
              const uomInfo = resolveUomInfo(line.child_item_id);
              return (
                <div
                  key={`line-${index}`}
                  className="grid grid-cols-[1fr_110px_90px_auto] gap-2 items-center"
                >
                  <select
                    value={line.child_item_id}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      const uom = resolveUomInfo(nextId);
                      updateLine(index, {
                        child_item_id: nextId,
                        uom_id: uom.uomId,
                      });
                    }}
                    className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-2 text-sm"
                  >
                    <option value="">Select item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.item_no} - {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={line.qty}
                    onChange={(event) =>
                      updateLine(index, { qty: event.target.value })
                    }
                    className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-2 text-sm"
                    placeholder="Qty"
                  />
                  <input
                    type="text"
                    value={uomInfo.uomCode || ""}
                    disabled
                    className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-2 text-xs text-zinc-500"
                    placeholder="UOM"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    disabled={lines.length === 1}
                    className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Note
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2 text-sm font-semibold rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save New Version"}
          </button>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-2">
              Version History
            </h3>
            {!detail ? (
              <div className="text-xs text-zinc-500">
                Select a parent item to view versions.
              </div>
            ) : (
              <div className="space-y-2">
                {detail.versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 rounded-md"
                  >
                    <span>
                      v{version.version_no} - {version.status}
                    </span>
                    <span>{new Date(version.created_at).toLocaleString()}</span>
                  </div>
                ))}
                {detail.versions.length === 0 ? (
                  <div className="text-xs text-zinc-400">No versions yet.</div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function normalizeItems(payload: unknown): ItemOption[] {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload as ItemOption[];
  }
  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const items = record.items;
    if (Array.isArray(items)) {
      return items as ItemOption[];
    }
  }
  return [];
}

function normalizeBoms(payload: unknown): BomSummary[] {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload as BomSummary[];
  }
  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const items = record.boms;
    if (Array.isArray(items)) {
      return items as BomSummary[];
    }
  }
  return [];
}

async function readResponseBody(response: Response) {
  const raw = await response.text();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
  }
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }
  return fallback;
}
