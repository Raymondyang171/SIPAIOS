"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Item {
  id: string;
  item_no: string;
  name: string;
  type: string;
  uom?: string;
  description?: string;
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/items");
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json();
        setItems(data.items || data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load items");
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
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
            <span>Items</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Items
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
      ) : items.length === 0 ? (
        <EmptyPlaceholder />
      ) : (
        <ItemsTable items={items} />
      )}
    </div>
  );
}

function ItemsTable({ items }: { items: Item[] }) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Item No
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              UOM
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {items.map((item) => (
            <tr
              key={item.id || item.item_no}
              className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
            >
              <td className="px-4 py-3 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                {item.item_no}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                {item.name}
              </td>
              <td className="px-4 py-3">
                <TypeBadge type={item.type} />
              </td>
              <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                {item.uom || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    RAW: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    FG: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    WIP: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
        colors[type] ||
        "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
      }`}
    >
      {type}
    </span>
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
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-600 rounded" />
            <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-600 rounded" />
            <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-600 rounded" />
            <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-600 rounded" />
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
        Unable to load items
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
        IT
      </span>
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        No Items Found
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Items will appear here once master data is configured.
      </p>
      <div className="mt-4 p-4 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-left max-w-md mx-auto">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
          Expected fields:
        </p>
        <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 font-mono">
          <li>item_no (string) - Unique identifier</li>
          <li>name (string) - Item name</li>
          <li>type (RAW | FG | WIP) - Item category</li>
          <li>uom (string) - Unit of measure</li>
        </ul>
      </div>
    </div>
  );
}
