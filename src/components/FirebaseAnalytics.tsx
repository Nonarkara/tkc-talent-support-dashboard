"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/firebase/analytics";

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    const url = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    void trackEvent("page_view", { page_path: url });
  }, [pathname, searchParams]);

  return null;
}

export function FirebaseAnalytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  );
}
