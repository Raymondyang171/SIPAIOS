"use client";

import { useState, useEffect, useCallback } from "react";

type HealthStatus = "loading" | "connected" | "degraded" | "down";

interface HealthResponse {
  status: string;
  db: string;
  error?: string;
}

export default function ProductionHomePage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("loading");
  const [healthDetails, setHealthDetails] = useState<HealthResponse | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  const checkHealth = useCallback(async () => {
    setIsRetrying(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch("/api/health", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: HealthResponse = await response.json();
        if (data.status === "ok" && data.db === "connected") {
          setHealthStatus("connected");
        } else {
          setHealthStatus("degraded");
        }
        setHealthDetails(data);
      } else {
        const data = await response.json().catch(() => ({}));
        setHealthStatus("down");
        setHealthDetails({ status: "error", db: "disconnected", ...data });
      }
    } catch {
      setHealthStatus("down");
      setHealthDetails({ status: "error", db: "unreachable", error: "Cannot connect to API" });
    } finally {
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const statusConfig: Record<HealthStatus, { label: string; color: string; bgColor: string }> = {
    loading: { label: "Checking...", color: "text-zinc-500", bgColor: "bg-zinc-100 dark:bg-zinc-800" },
    connected: { label: "Connected", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-900/20" },
    degraded: { label: "Degraded", color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-900/20" },
    down: { label: "Down", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-900/20" },
  };

  const currentStatus = statusConfig[healthStatus];

  const menuItems = [
    { title: "Work Orders", description: "Manage manufacturing orders", icon: "📋" },
    { title: "Production Report", description: "View production metrics", icon: "📊" },
    { title: "Inventory", description: "Check stock levels", icon: "📦" },
    { title: "Settings", description: "Configure system options", icon: "⚙️" },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Production Home
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Manufacturing execution dashboard
          </p>
        </header>

        {/* Health Status Card */}
        <section className={`rounded-lg border p-6 ${currentStatus.bgColor} border-zinc-200 dark:border-zinc-700`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                API Status
              </h2>
              <div className="mt-2 flex items-center gap-3">
                <span className={`text-2xl font-semibold ${currentStatus.color}`}>
                  {currentStatus.label}
                </span>
                {healthStatus === "loading" && (
                  <span className="inline-block w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              {healthDetails && healthStatus !== "loading" && (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  DB: {healthDetails.db}
                  {healthDetails.error && ` · ${healthDetails.error}`}
                </p>
              )}
            </div>
            {healthStatus !== "loading" && (
              <button
                onClick={checkHealth}
                disabled={isRetrying}
                className="px-4 py-2 text-sm font-medium rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRetrying ? "Retrying..." : "Retry"}
              </button>
            )}
          </div>
        </section>

        {/* Menu Cards */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* API Base Info */}
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">API Base:</span>
            <code className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono text-xs">
              {apiBase || "(not configured)"}
            </code>
          </div>
        </section>
      </div>
    </main>
  );
}
