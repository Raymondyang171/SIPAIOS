"use client";

import Link from "next/link";

export default function InventoryPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Inventory Overview
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Monitor stock levels and inventory movements
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <NavCard
          title="Work Order Materials"
          description="View material requirements and allocations for work orders"
          href="/production/work-orders"
          icon="W"
        />
        <NavCard
          title="Purchase Orders"
          description="Track incoming materials from purchase orders"
          href="/purchase/orders"
          icon="P"
        />
        <NavCard
          title="Production Reports"
          description="View finished goods output from production"
          href="/production/reports"
          icon="R"
        />
      </div>

      {/* Placeholder Section */}
      <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600">
        <div className="text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-xl font-bold mb-3">
            I
          </span>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Inventory Balances
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Direct inventory balance viewing is available through the Work Order
            material precheck panel. Select a work order to view material
            availability.
          </p>
          <Link
            href="/production/work-orders"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Go to Work Orders
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function NavCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="block p-5 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-lg font-bold flex-shrink-0">
          {icon}
        </span>
        <div>
          <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
