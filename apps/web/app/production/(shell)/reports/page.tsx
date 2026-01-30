"use client";

import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Reports Hub
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Access production and purchasing reports
        </p>
      </div>

      {/* Report Categories */}
      <div className="space-y-6">
        {/* Production Reports */}
        <section>
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-3">
            Production
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReportCard
              title="Work Order Summary"
              description="Overview of all work orders with status breakdown"
              href="/production/work-orders"
              icon="W"
              badge="Live"
            />
            <ReportCard
              title="Production Output"
              description="Finished goods produced per work order"
              href="/production/work-orders"
              icon="FG"
            />
          </div>
        </section>

        {/* Purchase Reports */}
        <section>
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-3">
            Purchasing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReportCard
              title="Purchase Order History"
              description="View all purchase orders and their status"
              href="/purchase/orders"
              icon="PO"
              badge="Live"
            />
            <ReportCard
              title="Goods Receipt Notes"
              description="Track received materials from suppliers"
              href="/purchase/orders"
              icon="GRN"
            />
          </div>
        </section>

        {/* Demo Drill Section */}
        <section className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            Demo Walkthrough
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Follow these steps to explore the system capabilities:
          </p>
          <ol className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-medium">
                1
              </span>
              <span>
                <Link
                  href="/production/work-orders"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Work Orders
                </Link>{" "}
                &rarr; Select a work order &rarr; View Material Precheck
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-medium">
                2
              </span>
              <span>
                <Link
                  href="/purchase/orders/create"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Create Purchase Order
                </Link>{" "}
                &rarr; Fill form &rarr; Submit
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-medium">
                3
              </span>
              <span>
                <Link
                  href="/purchase/orders"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Purchase Orders
                </Link>{" "}
                &rarr; Select order &rarr; Create GRN
              </span>
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}

function ReportCard({
  title,
  description,
  href,
  icon,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="block p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-bold flex-shrink-0">
            {icon}
          </span>
          <div>
            <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          </div>
        </div>
        {badge && (
          <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
}
