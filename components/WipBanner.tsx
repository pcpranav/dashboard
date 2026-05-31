"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "devpulse-wip-banner-v1";

export default function WipBanner() {
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    setHydrated(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  if (!hydrated || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-warning/40 bg-warning/10"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-6 py-2.5 text-[12px] text-fg">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="mt-[2px] flex-shrink-0 text-warning"
          aria-hidden="true"
        >
          <path
            d="M7 1.5L13 12.5H1L7 1.5Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M7 6V8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="7" cy="10.5" r="0.7" fill="currentColor" />
        </svg>
        <p className="flex-1 leading-relaxed">
          DevPulse is still under active development — some features may be incomplete or change without notice.
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss banner"
          className="-mt-0.5 -mr-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-warning/20 hover:text-fg"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path
              d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
