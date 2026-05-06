# Google Sheets Mirror — Setup

**Status:** one-time setup per environment · **Time:** ~10 min

The app runs fine without Sheets (Neon Postgres is the source of truth).
When these two env vars are absent, the sync layer goes into silent
no-op mode and the command-center sync LED shows **yellow (idle)**.

Enable the mirror when HR needs to sort, pivot, or share data outside
the app.

---

## 1. Create a service account

1. Open the Google Cloud Console: https://console.cloud.google.com/
2. Project picker → **New Project** → `tkc-dashboard` (or reuse an existing
   project).
3. **APIs & Services → Library** → search **Google Sheets API** → **Enable**.
4. **APIs & Services → Credentials** → **Create Credentials** →
   **Service account**.
5. Name: `tkc-dashboard-sheets`. Role: leave blank (we grant access on
   the sheet itself, not the project).
6. Click into the new service account → **Keys** tab → **Add Key** →
   **Create new key** → **JSON**. Download the file.

## 2. Create the target spreadsheet

1. https://sheets.google.com → **Blank spreadsheet**.
2. Rename to `TKC — Talent Dashboard Mirror`.
3. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/{THIS_PART}/edit`
4. **Share** → paste the service account email (from the JSON:
   `client_email`) → give **Editor** access → uncheck "Notify people".

## 3. Base64-encode the service-account JSON

```bash
# macOS
base64 -i ~/Downloads/tkc-dashboard-sheets-*.json | pbcopy
```

## 4. Set the environment variables

Add to `.env.local` (for dev) or the Vercel / Render environment:

```
GOOGLE_SHEETS_ID=<spreadsheet id from step 2>
GOOGLE_SERVICE_ACCOUNT_KEY=<base64 string from step 3>
```

Restart the dev server (`npm run dev`). The startup log should no longer
show `[sheets] GOOGLE_SHEETS_ID ... missing`.

## 5. Bootstrap the tabs

One-time write: create all declared tabs with their headers.

```bash
curl -X POST http://localhost:3000/api/sync/sheets-bootstrap
```

Or — easier — open `/command-center`, key `8` (or click **Ledger**
in the top nav), then click **Create missing tabs**. Same endpoint,
less typing.

Open the sheet — 16 tabs should now exist with frozen header rows.

## 6. Verify the health probe

```bash
curl http://localhost:3000/api/sheets/health | jq
```

Expect:

```json
{
  "ok": true,
  "enabled": true,
  "tabs": ["Players", "SquadEvents", "..."],
  "declared": ["Players", "SquadEvents", "..."],
  "missing": [],
  "checked_at": "2026-..."
}
```

The command-center LED (top-right of the header) should now show
**green**. Click it for the full tab list.

---

## Troubleshooting

| Symptom | Check |
|---|---|
| LED stays yellow | `.env.local` present? Dev server restarted? |
| LED red, error `PERMISSION_DENIED` | Did you share the sheet with the service-account email (not your own)? |
| LED red, error `Requested entity not found` | Sheet ID wrong. Re-copy from URL. |
| Some tabs missing | POST `/api/sheets/bootstrap` again. Idempotent. |
| Mirror writes silently fail | Check server logs for `[sheets] appendEvent ...` error lines. Sheets never breaks the DB write. |

## Privacy

- The base64 key is **secret**. Never commit it. `.env.local` is
  already in `.gitignore`.
- The health endpoint never surfaces the key — only tab names + last
  check time.
- Rotate the key via the Cloud Console → Service Accounts → Keys
  whenever a contractor rolls off.
