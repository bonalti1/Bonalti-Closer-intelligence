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

The app is ready for GHL data, but the final sync needs the real GoHighLevel endpoint/auth details.

Server-only environment values:

```bash
GHL_API_KEY=
GHL_LOCATION_ID=
GHL_BASE_URL=https://services.leadconnectorhq.com
GHL_API_VERSION=2021-07-28
GHL_SYNC_LIMIT=100
CRM_START_DATE=2026-06-01
```

Current GHL endpoints:

- `GET /api/ghl/status` checks whether the server has GHL config.
- `POST /api/ghl/sync` pulls opportunities from GHL and stores matched rows in `ghl_lead_snapshots`.
- `POST /api/ghl/import` accepts test snapshots and saves them to `ghl_lead_snapshots`.

The first sync pass matches GHL opportunities to existing Supabase meetings by client name. If GHL webhooks or custom fields later provide the Supabase meeting ID, the match can become exact.

## Scheduled sync

Render is configured with a cron job that runs every 15 minutes:

```bash
npm run sync:ghl
```

The cron job calls:

```bash
CRM_SYNC_URL=https://bonalti-closer-crm.onrender.com/api/ghl/sync
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
- Reports: PDF-style monthly meeting summary.
