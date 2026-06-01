import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const hasFirebaseConfig =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.authDomain) &&
  Boolean(firebaseConfig.projectId) &&
  Boolean(firebaseConfig.appId) &&
  Boolean(firebaseConfig.measurementId);

// Initialize Firebase only when the public config is complete. Local demo
// environments often omit it; analytics must disappear, not crash the app.
const app: FirebaseApp | null =
  getApps()[0] ?? (hasFirebaseConfig ? initializeApp(firebaseConfig) : null);

// Initialize Analytics if supported (browser only)
let analytics: Analytics | null = null;
if (typeof window !== "undefined" && app) {
  void isSupported().then((yes) => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    analytics = null;
  });
}

export { app, analytics };
