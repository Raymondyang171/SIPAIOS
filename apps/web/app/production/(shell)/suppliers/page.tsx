"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSuppliers() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/suppliers");
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json();
        setSuppliers(data.suppliers || data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load suppliers"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchSuppliers();
  }, []);

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
            <span>Suppliers</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Suppliers
          </h1>
        </div>
        {error && (
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
          >
            Retry
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorPlaceholder message={error} />
      ) : suppliers.length === 0 ? (
        <EmptyPlaceholder />
      ) : (
        <SuppliersTable suppliers={suppliers} />
      )}
    </div>
  );
}

function SuppliersTable({ suppliers }: { suppliers: Supplier[] }) {
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
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Phone
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {suppliers.map((supplier) => (
            <tr
              key={supplier.id || supplier.code}
              className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
            >
              <td className="px-4 py-3 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                {supplier.code}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                {supplier.name}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                {supplier.contact_name || "-"}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                {supplier.contact_phone || "-"}
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
            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-600 rounded" />
            <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-600 rounded" />
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-600 rounded" />
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-600 rounded" />
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
        Unable to load suppliers
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
        SP
      </span>
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        No Suppliers Found
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Suppliers will appear here once master data is configured.
      </p>
      <div className="mt-4 p-4 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-left max-w-md mx-auto">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
          Expected fields:
        </p>
        <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 font-mono">
          <li>code (string) - Supplier code</li>
          <li>name (string) - Supplier name</li>
          <li>contact_name (string) - Contact person</li>
          <li>contact_phone (string) - Phone number</li>
        </ul>
      </div>
    </div>
  );
}
