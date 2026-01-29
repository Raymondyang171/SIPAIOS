import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/production/login", "/production/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Guard all other /production/* routes
  if (pathname.startsWith("/production")) {
    const authToken = request.cookies.get("auth_token");

    if (!authToken?.value) {
      const loginUrl = new URL("/production/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/production/:path*"],
};
