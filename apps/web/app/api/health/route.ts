import { NextResponse } from "next/server";

export async function GET() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBase) {
    return NextResponse.json(
      { status: "error", db: "unknown", error: "API URL not configured" },
      { status: 503 }
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${apiBase}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { status: "error", db: "unreachable", error: "Cannot connect to API" },
      { status: 503 }
    );
  }
}
