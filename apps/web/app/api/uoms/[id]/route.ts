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

function extractBearerToken(authHeader: string | null) {
  if (!authHeader) {
    return null;
  }
  const trimmed = authHeader.trim();
  if (trimmed.toLowerCase().startsWith("bearer ")) {
    return trimmed.slice(7).trim();
  }
  return trimmed;
}

function decodeJwtPayload(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  const payload = parts[1];
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  try {
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveCompanyIdFromAuth(authHeader: string | null, cookieToken?: string) {
  const bearerToken = extractBearerToken(authHeader) ?? cookieToken ?? null;
  if (!bearerToken) {
    return null;
  }
  const payload = decodeJwtPayload(bearerToken);
  if (!payload) {
    return null;
  }
  const companyId = payload.company_id;
  if (typeof companyId === "string" && companyId.length > 0) {
    return companyId;
  }
  const tenantId = payload.tenant_id;
  if (typeof tenantId === "string" && tenantId.length > 0) {
    return tenantId;
  }
  return null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const { id } = await params;

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
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const headers: HeadersInit = { "Content-Type": "application/json" };
    const authHeader = resolveAuthHeader(request, token);
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const bodyObject = body && typeof body === "object" ? body : {};
    const companyValue = (bodyObject as Record<string, unknown>).company_id;
    let payload = bodyObject as Record<string, unknown>;

    if (typeof companyValue !== "string" || companyValue.length === 0) {
      const companyId = resolveCompanyIdFromAuth(authHeader, token);
      if (!companyId) {
        return NextResponse.json(
          { error: "TENANT_CONTEXT_MISSING", message: "TENANT_CONTEXT_MISSING" },
          { status: 401 }
        );
      }
      payload = { ...payload, company_id: companyId };
    }

    const response = await fetch(`${apiBase}/uoms/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const { id } = await params;

  if (!apiBase) {
    return NextResponse.json(
      { error: "API URL not configured" },
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

    const response = await fetch(`${apiBase}/uoms/${id}`, {
      method: "DELETE",
      headers,
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
