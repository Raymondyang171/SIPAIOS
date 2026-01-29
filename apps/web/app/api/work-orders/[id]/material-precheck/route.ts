import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBase) {
    return NextResponse.json(
      { error: "API URL not configured", materials: [], can_produce: false },
      { status: 503 }
    );
  }

  // Get auth token from cookie
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED", message: "Authorization required", materials: [], can_produce: false },
      { status: 401 }
    );
  }

  try {
    // Forward query params (e.g., qty_produced)
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = `${apiBase}/work-orders/${id}/material-precheck${queryString ? `?${queryString}` : ""}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Cannot connect to API", materials: [], can_produce: false },
      { status: 503 }
    );
  }
}
