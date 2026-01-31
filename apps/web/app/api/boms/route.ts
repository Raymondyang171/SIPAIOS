import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

async function toNextResponse(response: Response) {
  const rawBody = await response.text();
  if (!rawBody) {
    return new NextResponse(null, { status: response.status });
  }

  const contentType = response.headers.get("content-type") ?? "text/plain";
  if (contentType.includes("application/json")) {
    try {
      const data = JSON.parse(rawBody);
      return NextResponse.json(data, { status: response.status });
    } catch {
      return new NextResponse(rawBody, {
        status: response.status,
        headers: { "content-type": contentType },
      });
    }
  }

  return new NextResponse(rawBody, {
    status: response.status,
    headers: { "content-type": contentType },
  });
}

function resolveAuthHeader(request: NextRequest, token?: string) {
  const incomingAuth = request.headers.get("authorization");
  if (incomingAuth) {
    return incomingAuth;
  }
  if (token) {
    return `Bearer ${token}`;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBase) {
    return NextResponse.json(
      { error: "API URL not configured", boms: [] },
      { status: 503 }
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const headers: HeadersInit = {};
    const authHeader = resolveAuthHeader(request, token);
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(`${apiBase}/boms`, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return await toNextResponse(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "UPSTREAM_UNREACHABLE", message },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBase) {
    return NextResponse.json(
      { error: "API URL not configured" },
      { status: 503 }
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  try {
    const body = await request.json();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const headers: HeadersInit = { "Content-Type": "application/json" };
    const authHeader = resolveAuthHeader(request, token);
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const idempotencyKey = request.headers.get("idempotency-key");
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const response = await fetch(`${apiBase}/boms`, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return await toNextResponse(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "UPSTREAM_UNREACHABLE", message },
      { status: 502 }
    );
  }
}
