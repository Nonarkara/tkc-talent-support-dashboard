"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { analytics } from "@/lib/firebase/config";
import { logEvent } from "firebase/analytics";

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && analytics) {
      const url = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
      logEvent(analytics, "page_view", {
        page_path: url,
      });
    }
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
