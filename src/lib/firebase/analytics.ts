import { getAnalytics, isSupported, logEvent, type Analytics } from "firebase/analytics";
import { app } from "./config";

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getAnalyticsInstance(): Promise<Analytics | null> {
  if (!analyticsPromise) {
    const firebaseApp = app;

    if (typeof window === "undefined" || !firebaseApp) {
      analyticsPromise = Promise.resolve(null);
    } else {
      analyticsPromise = isSupported()
        .then((yes) => (yes ? getAnalytics(firebaseApp) : null))
        .catch(() => null);
    }
  }

  return analyticsPromise;
}

export async function trackEvent(
  eventName: string,
  eventParams?: Record<string, string | number>,
): Promise<void> {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, eventName, eventParams);
}
