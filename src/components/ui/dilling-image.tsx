"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image, { type ImageProps } from "next/image";

/**
 * Builds a list of fallback image URLs to try for a Dilling product image.
 * The CDN uses inconsistent suffixes: _p1.jpg, _p1.png, _p1_bc.jpg, _pf.png, _p2.jpg
 */
function buildFallbacks(originalSrc: string): string[] {
  if (!originalSrc.includes("assets.dilling.com/Products/")) return [];
  const base = originalSrc.replace(/\?.*$/, "");
  const match = base.match(/\/Products\/([^/]+)\/[^/]+$/);
  if (!match) return [];
  const sku = match[1];
  const prefix = `https://assets.dilling.com/Products/${sku}/${sku}`;
  const candidates = [
    `${prefix}_p1.jpg`,
    `${prefix}_p1.png`,
    `${prefix}_p1_bc.jpg`,
    `${prefix}_pf.png`,
    `${prefix}_p2.jpg`,
    `${prefix}_p2.png`,
  ];
  // Return candidates that aren't the original, deduplicated
  return candidates.filter((c) => c !== base);
}

/**
 * Image component for Dilling product images.
 * Automatically cycles through known CDN suffix variants on error.
 */
export function DillingImage({
  src,
  alt,
  fallback,
  ...props
}: Omit<ImageProps, "src"> & {
  src: string | undefined | null;
  fallback?: React.ReactNode;
}) {
  const [currentSrc, setCurrentSrc] = useState(src ?? "");
  const [failed, setFailed] = useState(!src);
  const fallbacksRef = useRef<string[] | null>(null);

  useEffect(() => {
    if (src) {
      setCurrentSrc(src);
      setFailed(false);
      fallbacksRef.current = null;
    } else {
      setFailed(true);
    }
  }, [src]);

  const handleError = useCallback(() => {
    if (!currentSrc.includes("assets.dilling.com")) {
      setFailed(true);
      return;
    }
    // Build fallback list on first error
    if (!fallbacksRef.current) {
      fallbacksRef.current = buildFallbacks(currentSrc);
    }
    const next = fallbacksRef.current.shift();
    if (next) {
      setCurrentSrc(next);
    } else {
      setFailed(true);
    }
  }, [currentSrc]);

  if (failed || !currentSrc) {
    return (
      fallback ?? (
        <div className="flex h-full w-full items-center justify-center text-brand-accent/40">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
      )
    );
  }

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={handleError}
      unoptimized
    />
  );
}
