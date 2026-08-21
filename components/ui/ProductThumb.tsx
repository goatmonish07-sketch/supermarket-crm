"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import clsx from "clsx";

/**
 * Product thumbnail: shows the product photo, and gracefully falls back to a
 * package icon if the image is missing or fails to load.
 */
export default function ProductThumb({
  src,
  name,
  className,
  iconClass = "h-5 w-5",
}: {
  src?: string | null;
  name?: string;
  className?: string;
  iconClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  const show = src && !failed;

  return (
    <div className={clsx("relative overflow-hidden rounded-lg bg-violet-100", className)}>
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={name || "product"}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-violet-500">
          <Package className={iconClass} />
        </div>
      )}
    </div>
  );
}
