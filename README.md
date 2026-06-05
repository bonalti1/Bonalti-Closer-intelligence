# Bonalti Pipeline Dashboard

Second Bonalti app for manager visibility, closer reporting, and meeting prep. It connects to the same Supabase project as the Data Entry App and reads the shared `meetings` table.

## Local run

```bash
npm start
```

Default local URL: `http://localhost:4284`

## Supabase setup

Run `supabase/closer_crm_schema.sql` in the same Supabase project used by the Data Entry App. The CRM keeps the existing `meetings` table as source of truth and adds:

- `closer_pipeline`
- `meeting_notes`
- `ghl_lead_snapshots`
- `ghl_sync_runs`

The browser never receives the service role key. All Supabase writes go through `server.mjs`.

## GHL setup

The app syncs GoHighLevel opportunities into the shared Supabase `meetings` table. South Texas Builders and Cuates Construction pipeline stage IDs are mapped into the shared meeting statuses.

Server-only environment values:

```bash
GHL_API_KEY=
GHL_LOCATION_ID=
GHL_BASE_URL=https://services.leadconnectorhq.com
GHL_API_VERSION=2021-07-28
GHL_SYNC_LIMIT=100
CRM_START_DATE=2026-06-01
CRM_SYNC_SECRET=
CRM_WEBHOOK_SECRET=
```

Current GHL endpoints:

- `GET /api/ghl/status` checks whether the server has GHL config.
- `POST /api/ghl/sync` pulls opportunities from GHL, stores matched rows in `ghl_lead_snapshots`, and updates shared `meetings.status`.
- `POST /api/ghl/import` accepts test snapshots and saves them to `ghl_lead_snapshots`.
- `POST /api/activities/import` accepts activity imports and saves them to `ghl_activities`.
- `POST /api/plaud/webhook` accepts PLAUD/Zapier transcript payloads and saves matched meeting notes.

Sync matching checks existing GHL contact/opportunity IDs first, then matches by client name inside the correct company. If GHL webhooks or custom fields later provide the Supabase meeting ID, the match can become exact.

If `CRM_SYNC_SECRET` is set on the web service, callers must include it as:

```bash
X-CRM-Sync-Secret: your-secret-value
```

If `CRM_WEBHOOK_SECRET` is set, Zapier/PLAUD webhook calls must include:

```bash
X-CRM-Webhook-Secret: your-secret-value
```

Recommended PLAUD/Zapier payload fields:

```json
{
  "recording_id": "unique-recording-id",
  "client_name": "Client Name",
  "company": "South Texas Builders",
  "meeting_date": "2026-06-04",
  "title": "Meeting title",
  "summary": "AI summary from PLAUD",
  "transcript": "Full transcript",
  "closer_name": "Claudia Garza"
}
```

## Scheduled sync

Render is configured with a cron job that runs every 15 minutes:

```bash
npm run sync:ghl
```

The cron job calls:

```bash
CRM_SYNC_URL=https://bonalti-closer-crm.onrender.com/api/ghl/sync
CRM_SYNC_SECRET=the-same-secret-as-the-web-service
```

If the public Render service name changes, update `CRM_SYNC_URL` in Render.

Example manual snapshot import:

```bash
curl -X POST http://localhost:4284/api/ghl/import \
  -H "Content-Type: application/json" \
  -d '{
    "meeting_id": "MEETING_UUID",
    "company_id": "00000000-0000-0000-0000-000000000001",
    "pipeline_stage": "lead_potencial",
    "opportunity_status": "open",
    "assigned_to_name": "Claudia Garza",
    "last_note": "Client is highly interested and needs follow up."
  }'
```

## App shape

- Dashboard: owner command center for Claudia Garza.
- Pipeline: GHL-style stage board.
- Reports: executive sales report for sales week, current month, last month, year, last year, and custom date ranges. Includes close rate, no-show rate, show rate, due follow-ups, missing notes, no-activity leads, last touch, and client detail.
