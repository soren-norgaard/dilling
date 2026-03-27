import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function getOrCreateCart(userId?: string, sessionToken?: string) {
  if (userId) {
    const existing = await db.cart.findFirst({
      where: { userId },
      include: { items: { include: { product: { include: { translations: true, prices: true } } } } },
      orderBy: { updatedAt: "desc" },
    });
    if (existing) return existing;
  }

  if (sessionToken) {
    const existing = await db.cart.findFirst({
      where: { sessionToken },
      include: { items: { include: { product: { include: { translations: true, prices: true } } } } },
      orderBy: { updatedAt: "desc" },
    });
    if (existing) return existing;
  }

  return db.cart.create({
    data: { userId, sessionToken },
    include: { items: { include: { product: { include: { translations: true, prices: true } } } } },
  });
}

function getSessionToken(request: NextRequest): string {
  return request.cookies.get("cart_session")?.value ?? crypto.randomUUID();
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  const sessionToken = getSessionToken(request);

  const cart = await getOrCreateCart(user?.id, sessionToken);

  const response = NextResponse.json({
    id: cart.id,
    items: cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName:
        item.product.translations.find((t) => t.locale === "DA")?.name ??
        item.product.slug,
      slug: item.product.slug,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      price: Number(item.priceAtAdd),
      currency: item.currency,
      image: item.product.images[0] ?? null,
    })),
  });

  if (!request.cookies.get("cart_session")) {
    response.cookies.set("cart_session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return response;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { productId, size, color, quantity = 1, price, currency = "DKK" } = body;

  if (!productId || !size || !color || !price) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const user = await getCurrentUser().catch(() => null);
  const sessionToken = getSessionToken(request);
  const cart = await getOrCreateCart(user?.id, sessionToken);

  // Check if item already exists
  const existing = cart.items.find(
    (i) => i.productId === productId && i.size === size && i.color === color
  );

  if (existing) {
    await db.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        size,
        color,
        quantity,
        priceAtAdd: price,
        currency,
      },
    });
  }

  // Touch cart timestamp
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });

  const updated = await db.cart.findUnique({
    where: { id: cart.id },
    include: { items: { include: { product: { include: { translations: true } } } } },
  });

  const response = NextResponse.json({
    id: cart.id,
    items: updated!.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName:
        item.product.translations.find((t) => t.locale === "DA")?.name ?? item.product.slug,
      slug: item.product.slug,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      price: Number(item.priceAtAdd),
      currency: item.currency,
    })),
  });

  if (!request.cookies.get("cart_session")) {
    response.cookies.set("cart_session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return response;
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { itemId, quantity } = body;

  if (!itemId || typeof quantity !== "number") {
    return NextResponse.json({ error: "Missing itemId or quantity" }, { status: 400 });
  }

  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
  } else {
    await db.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const itemId = searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }

  await db.cartItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
