"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_LOGO, resolveStoreLogoUrl } from "@/lib/store-logo";

const SIZE_CLASS = {
  xs: "w-8 h-8",
  sm: "w-10 h-10",
  md: "w-14 h-14",
  lg: "w-20 h-20",
  xl: "w-32 h-32",
} as const;

const IMG_PADDING = {
  xs: "p-1",
  sm: "p-1",
  md: "p-1.5",
  lg: "p-2",
  xl: "p-2.5",
} as const;

type StoreLogoSize = keyof typeof SIZE_CLASS;
type StoreLogoVariant = "app" | "print";

interface StoreLogoProps {
  src?: string | null;
  alt?: string;
  size?: StoreLogoSize;
  variant?: StoreLogoVariant;
  className?: string;
}

export function StoreLogo({
  src,
  alt = "Logo toko",
  size = "md",
  variant = "app",
  className,
}: StoreLogoProps) {
  const [imgSrc, setImgSrc] = useState(() => resolveStoreLogoUrl(src));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setImgSrc(resolveStoreLogoUrl(src));
    setFailed(false);
  }, [src]);

  const resolved = failed ? DEFAULT_LOGO : imgSrc;

  const frameClass =
    variant === "print"
      ? "rounded-xl border border-gray-200 bg-gray-50 shadow-sm"
      : "rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-background via-muted/30 to-primary/5 shadow-md ring-1 ring-primary/10 dark:from-sidebar-accent/20 dark:to-primary/10";

  return (
    <div
      className={cn(
        "relative flex flex-shrink-0 items-center justify-center",
        SIZE_CLASS[size],
        frameClass,
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved}
        alt={alt}
        className={cn("max-h-full max-w-full object-contain", IMG_PADDING[size])}
        onError={() => {
          if (!failed) {
            setFailed(true);
            setImgSrc(DEFAULT_LOGO);
          }
        }}
      />
    </div>
  );
}
