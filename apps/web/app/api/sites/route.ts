import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBase) {
    return NextResponse.json(
      { error: "API URL not configured", sites: [] },
      { status: 503 }
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${apiBase}/sites`, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Cannot connect to API", sites: [] },
      { status: 503 }
    );
  }
}
