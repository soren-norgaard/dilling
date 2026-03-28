import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/auth — Get current user session info
 * Returns user profile if authenticated, or guest session info
 */
export async function GET(request: Request) {
  try {
    // Try Clerk auth if available
    let clerkId: string | null = null;
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const session = await auth();
      clerkId = session.userId;
    } catch {
      // Clerk not configured — guest mode
    }

    if (clerkId) {
      const user = await db.user.findUnique({
        where: { clerkId },
        select: {
          id: true,
          email: true,
          name: true,
          locale: true,
          preferredCurrency: true,
          sizeProfile: true,
        },
      });
      if (user) {
        return NextResponse.json({ authenticated: true, user });
      }
    }

    return NextResponse.json({
      authenticated: false,
      guest: true,
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ authenticated: false, guest: true });
  }
}

/**
 * POST /api/auth — Create or update user profile on first login
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clerkId, email, name, locale, preferredCurrency } = body;

    if (!clerkId || !email) {
      return NextResponse.json({ error: "clerkId and email required" }, { status: 400 });
    }

    const user = await db.user.upsert({
      where: { clerkId },
      update: { name, locale, preferredCurrency },
      create: {
        clerkId,
        email,
        name,
        locale: locale ?? "DA",
        preferredCurrency: preferredCurrency ?? "DKK",
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auth failed" },
      { status: 500 }
    );
  }
}
