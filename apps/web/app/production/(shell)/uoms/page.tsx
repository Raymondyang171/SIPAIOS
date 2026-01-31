"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface UOM {
  id?: string;
  code: string;
  name: string;
}

interface UomFormState {
  code: string;
  name: string;
}

const EMPTY_FORM: UomFormState = {
  code: "",
  name: "",
};

export default function UOMsPage() {
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [activeUom, setActiveUom] = useState<UOM | null>(null);
  const [formState, setFormState] = useState<UomFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchUOMs() {
      setLoading(true);
      setLoadError(null);

      try {
        const res = await fetch("/api/uoms");
        if (!res.ok) {
          const payload = await readResponseBody(res);
          throw new Error(extractMessage(payload, `API error: ${res.status}`));
        }
        const payload = await readResponseBody(res);
        const data = normalizeUoms(payload);
        setUoms(data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load UOMs");
      } finally {
        setLoading(false);
      }
    }

    fetchUOMs();
  }, [refreshKey]);

  function triggerRefresh() {
    setRefreshKey((value) => value + 1);
  }

  function openCreate() {
    setFormState(EMPTY_FORM);
    setActiveUom(null);
    setNotice(null);
    setActionError(null);
    setShowCreate(true);
  }

  function openEdit(uom: UOM) {
    setFormState({
      code: uom.code ?? "",
      name: uom.name ?? "",
    });
    setActiveUom(uom);
    setNotice(null);
    setActionError(null);
    setShowEdit(true);
  }

  function closeModals() {
    setShowCreate(false);
    setShowEdit(false);
    setSubmitting(false);
  }

  async function handleSubmit(isEdit: boolean) {
    setActionError(null);
    setNotice(null);

    const code = formState.code.trim();
    const name = formState.name.trim();
    if (!code || !name) {
      setActionError("code and name are required.");
      return;
    }
    if (isEdit && (!activeUom || !activeUom.id)) {
      setActionError("Edit not supported: missing UOM id.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        code,
        name,
      };
      const endpoint = isEdit ? `/api/uoms/${activeUom?.id ?? ""}` : "/api/uoms";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await readResponseBody(res);
        throw new Error(extractMessage(body, `API error: ${res.status}`));
      }

      setNotice(isEdit ? "UOM updated." : "UOM created.");
      closeModals();
      triggerRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(uom: UOM) {
    setActionError(null);
    setNotice(null);

    if (!uom.id) {
      setActionError("Delete not supported: missing UOM id.");
      return;
    }
    const confirmed = window.confirm(`Delete UOM ${uom.code}?`);
    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(`/api/uoms/${uom.id}`, { method: "DELETE" });
      if (!res.ok) {
        if (res.status === 405 || res.status === 501) {
          setActionError("Not supported yet.");
          return;
        }
        const body = await readResponseBody(res);
        throw new Error(extractMessage(body, `API error: ${res.status}`));
      }
      setNotice("UOM deleted.");
      triggerRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed");
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
            <span>Units of Measure</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Units of Measure
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {loadError && (
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
            >
              Retry
            </button>
          )}
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-colors"
          >
            + Add UOM
          </button>
        </div>
      </div>

      <Banner message={notice} variant="success" />
      <Banner message={actionError} variant="error" />

      {loading ? (
        <LoadingSkeleton />
      ) : loadError ? (
        <ErrorPlaceholder message={loadError} />
      ) : uoms.length === 0 ? (
        <EmptyPlaceholder />
      ) : (
        <UOMsTable uoms={uoms} onEdit={openEdit} onDelete={handleDelete} />
      )}

      {showCreate && (
        <UomModal
          title="Add UOM"
          submitLabel="Create"
          formState={formState}
          onChange={setFormState}
          onClose={closeModals}
          onSubmit={() => handleSubmit(false)}
          submitting={submitting}
        />
      )}

      {showEdit && activeUom && (
        <UomModal
          title={`Edit ${activeUom.code}`}
          submitLabel="Save"
          formState={formState}
          onChange={setFormState}
          onClose={closeModals}
          onSubmit={() => handleSubmit(true)}
          submitting={submitting}
        />
      )}
    </div>
  );
}

function UOMsTable({
  uoms,
  onEdit,
  onDelete,
}: {
  uoms: UOM[];
  onEdit: (uom: UOM) => void;
  onDelete: (uom: UOM) => void;
}) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Code
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {uoms.map((uom) => (
            <tr
              key={uom.id || uom.code}
              className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
            >
              <td className="px-4 py-3 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                {uom.code}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                {uom.name}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-3 text-sm">
                  <button
                    onClick={() => onEdit(uom)}
                    className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(uom)}
                    className="text-rose-600 dark:text-rose-400 hover:text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <div className="animate-pulse">
        <div className="h-10 bg-zinc-100 dark:bg-zinc-700" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-14 border-t border-zinc-200 dark:border-zinc-700 flex items-center px-4 gap-4"
          >
            <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-600 rounded" />
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-600 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorPlaceholder({ message }: { message: string }) {
  return (
    <div className="p-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 text-center">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
        Unable to load units of measure
      </p>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
        {message}
      </p>
    </div>
  );
}

function EmptyPlaceholder() {
  return (
    <div className="p-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 text-center">
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-xl font-bold mb-3">
        UM
      </span>
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        No Units of Measure Found
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        UOMs will appear here once master data is configured.
      </p>
      <div className="mt-4 p-4 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-left max-w-md mx-auto">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
          Expected fields:
        </p>
        <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 font-mono">
          <li>code (string) - Unit code (e.g., PCS, KG)</li>
          <li>name (string) - Unit name (e.g., Piece, Kilogram)</li>
        </ul>
      </div>
    </div>
  );
}

function Banner({
  message,
  variant,
}: {
  message: string | null;
  variant: "success" | "error";
}) {
  if (!message) {
    return null;
  }
  const styles =
    variant === "success"
      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
      : "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700";
  return (
    <div className={`px-4 py-2 rounded-md border text-sm ${styles}`}>
      {message}
    </div>
  );
}

function UomModal({
  title,
  submitLabel,
  formState,
  onChange,
  onClose,
  onSubmit,
  submitting,
}: {
  title: string;
  submitLabel: string;
  formState: UomFormState;
  onChange: (next: UomFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
          >
            Close
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Code
            </label>
            <input
              value={formState.code}
              onChange={(event) =>
                onChange({ ...formState, code: event.target.value })
              }
              className="mt-1 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              placeholder="PCS"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <input
              value={formState.name}
              onChange={(event) =>
                onChange({ ...formState, name: event.target.value })
              }
              className="mt-1 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              placeholder="Piece"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-50"
          >
            {submitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
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
    try {
      return JSON.stringify(record);
    } catch {
      return fallback;
    }
  }
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }
  return fallback;
}

function normalizeUoms(payload: unknown): UOM[] {
  if (!payload) {
    return [];
  }
  const data =
    Array.isArray(payload) ? payload : (payload as Record<string, unknown>).uoms;
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((uom) => {
    const record = uom as Record<string, unknown>;
    const code =
      (record.code as string | undefined) ??
      (record.uom_code as string | undefined) ??
      (record.uomCode as string | undefined) ??
      (record.unit_code as string | undefined) ??
      (record.unitCode as string | undefined) ??
      "";
    const name =
      (record.name as string | undefined) ??
      (record.uom_name as string | undefined) ??
      (record.uomName as string | undefined) ??
      (record.unit_name as string | undefined) ??
      (record.unitName as string | undefined) ??
      "";
    return { ...record, code, name } as UOM;
  });
}
