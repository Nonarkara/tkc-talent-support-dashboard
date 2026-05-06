/**
 * `/` — root landing.
 *
 * The command-center is the app's front door. Everything else is a
 * sub-screen of the God-Mode console, not a separate destination. Keep this
 * file boring: a single redirect, no chrome, no data fetch. If we later
 * introduce a proper dashboard-picker or tenant switcher, it lives here.
 */

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/command-center");
}
