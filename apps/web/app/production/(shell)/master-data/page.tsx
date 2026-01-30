"use client";

import Link from "next/link";

const masterDataItems = [
  {
    title: "Items",
    description: "Manage materials, finished goods, and consumables",
    href: "/production/items",
    icon: "IT",
    available: true,
  },
  {
    title: "Suppliers",
    description: "Manage supplier information and contacts",
    href: "/production/suppliers",
    icon: "SP",
    available: true,
  },
  {
    title: "Units of Measure",
    description: "Define measurement units (PCS, KG, M, etc.)",
    href: "/production/master-data",
    icon: "UM",
    available: false,
  },
  {
    title: "Warehouses",
    description: "Manage storage locations and zones",
    href: "/production/master-data",
    icon: "WH",
    available: false,
  },
  {
    title: "Bill of Materials",
    description: "Define product structures and components",
    href: "/production/master-data",
    icon: "BM",
    available: false,
  },
  {
    title: "Sites",
    description: "Manage factory sites and locations",
    href: "/production/master-data",
    icon: "ST",
    available: false,
  },
];

export default function MasterDataPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Master Data
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage core reference data for the manufacturing system
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {masterDataItems.map((item) => (
          <MasterDataCard key={item.title} {...item} />
        ))}
      </div>
    </div>
  );
}

function MasterDataCard({
  title,
  description,
  href,
  icon,
  available,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  available: boolean;
}) {
  const content = (
    <div
      className={`block p-5 bg-white dark:bg-zinc-800 rounded-lg border transition-all ${
        available
          ? "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm cursor-pointer"
          : "border-dashed border-zinc-300 dark:border-zinc-600 opacity-60"
      }`}
    >
      <div className="flex items-start gap-4">
        <span
          className={`w-12 h-12 flex items-center justify-center rounded-lg text-sm font-bold flex-shrink-0 ${
            available
              ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
              : "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
            {!available && (
              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
                Soon
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );

  if (available) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
