import { auth } from "@clerk/nextjs/server";
import { db } from "./db";

/**
 * Get the current user from Clerk auth + Dilling database.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await db.user.findUnique({
    where: { clerkId },
  });

  return user;
}
