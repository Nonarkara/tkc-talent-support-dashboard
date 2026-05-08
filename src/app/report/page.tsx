import { redirect } from "next/navigation";

export const dynamic = "force-static";

// /report → password-protected showcase (served locally from public/showcase/).
// Middleware (proxy.ts) gates everything outside the PUBLIC_PATHS allowlist,
// so this redirect inherits the dashboard password automatically — no
// separate auth scheme to maintain. The GitHub Pages mirror at
// nonarkara.github.io/tkc-digital-twin-showcase/ stays as the public copy.
export default function ReportPage() {
  redirect("/showcase/index.html");
}
