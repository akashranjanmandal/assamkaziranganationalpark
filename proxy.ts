import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (same mechanism, new
 * name/export). This is the server-side gate for /admin/** — it never
 * trusts a client-side check. Requests to protected admin pages or admin
 * API routes without a valid NextAuth session are redirected/rejected here,
 * before any admin page or API route handler code runs.
 */
export default auth((req: NextRequest & { auth?: unknown }) => {
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  const isProtectedPage = pathname.startsWith("/admin") && !isLoginPage;
  const isProtectedApi =
    pathname.startsWith("/api/admin") || pathname.startsWith("/api/files");

  const isAuthed = Boolean(req.auth);

  if (isProtectedApi && !isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isProtectedPage && !isAuthed) {
    const loginUrl = new URL("/admin/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPage && isAuthed) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/files/:path*"],
};
