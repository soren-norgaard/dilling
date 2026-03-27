import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const intlMiddleware = createMiddleware(routing);

const publicPaths = [
  "/api/",
  "/sign-in",
  "/sign-up",
];

const isPublicPath = (pathname: string) =>
  publicPaths.some((p) => pathname.startsWith(p));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Apply Clerk middleware if enabled
  if (CLERK_ENABLED) {
    try {
      const { clerkMiddleware } = await import("@clerk/nextjs/server");
      const clerk = clerkMiddleware();
      // Run clerk first for auth context, then intl
      await (clerk as any)(request, {} as any);
    } catch {
      // Clerk not configured — continue without auth
    }
  }

  // Apply i18n middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
