import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const categories = await db.category.findMany({
    include: {
      translations: true,
      children: {
        include: { translations: true },
      },
    },
    where: { parentId: null },
    orderBy: { slug: "asc" },
  });

  return NextResponse.json(categories);
}
