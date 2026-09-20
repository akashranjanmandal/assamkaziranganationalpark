"use client";

import { useGlobalUiEffects } from "@/hooks/useScrollReveal";

/**
 * Mounts shared, page-wide DOM effects (custom cursor, navbar scroll state,
 * scroll-reveal, counters) ported from reference-js/main.js. Rendered once
 * in the root layout alongside the cursor dot/ring elements.
 */
export function PageEffects() {
  useGlobalUiEffects();
  return (
    <>
      <div className="cursor-dot" />
      <div className="cursor-ring" />
    </>
  );
}
