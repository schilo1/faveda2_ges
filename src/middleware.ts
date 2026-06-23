// src/middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const publicRoutes  = ["/login"];
const adminRoutes   = ["/users", "/settings"];
const commercialRoutes = ["/preorders"];
const commercialApiRoutes = ["/api/preorders"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn   = !!session;
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Redirect authenticated users away from login
  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Restrict admin-only routes
  if (isLoggedIn) {
    const role = (session?.user as any)?.role;
    const isAdminRoute = adminRoutes.some((r) => nextUrl.pathname.startsWith(r));

    if (isAdminRoute && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    if (role === "COMMERCIAL") {
      const canAccessRoute = commercialRoutes.some((r) => nextUrl.pathname.startsWith(r));
      const canAccessApi = commercialApiRoutes.some((r) => nextUrl.pathname.startsWith(r));
      if (nextUrl.pathname.startsWith("/api/")) {
        if (!canAccessApi && nextUrl.pathname !== "/api/auth/session") {
          return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
        }
      } else if (!canAccessRoute && !isPublicRoute) {
        return NextResponse.redirect(new URL("/preorders", nextUrl));
      }
    }

    // SURVEILLANT can only read
    if (role === "SURVEILLANT") {
      const isWriteAttempt =
        req.method !== "GET" && nextUrl.pathname.startsWith("/api/");
      if (isWriteAttempt) {
        return NextResponse.json(
          { error: "Permission refusée" },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
