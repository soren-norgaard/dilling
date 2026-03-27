"use client";

import type { ReactNode } from "react";

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/* Lazily import ClerkProvider only when the key exists */
let ClerkWrap: React.ComponentType<{ children: ReactNode }> | null = null;
if (CLERK_KEY) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ClerkProvider } = require("@clerk/nextjs") as typeof import("@clerk/nextjs");
  ClerkWrap = ({ children }: { children: ReactNode }) => (
    <ClerkProvider>{children}</ClerkProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const inner = <>{children}</>;
  return ClerkWrap ? <ClerkWrap>{inner}</ClerkWrap> : inner;
}
