import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadDotEnv();

const isRender = Boolean(process.env.RENDER);

const config = {
  host: process.env.HOST || (isRender ? "0.0.0.0" : "127.0.0.1"),
  port: Number(process.env.CRM_PORT || (isRender ? process.env.PORT : "") || 4284),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  ghlApiKey: process.env.GHL_API_KEY || process.env.GOHIGHLEVEL_API_KEY || "",
  ghlLocationId: process.env.GHL_LOCATION_ID || "",
  ghlBaseUrl: process.env.GHL_BASE_URL || "https://services.leadconnectorhq.com",
  ghlApiVersion: process.env.GHL_API_VERSION || "2021-07-28",
  ghlSyncLimit: Number(process.env.GHL_SYNC_LIMIT || 100),
  crmStartDate: process.env.CRM_START_DATE || "2026-06-01",
  crmSyncSecret: process.env.CRM_SYNC_SECRET || "",
  crmWebhookSecret: process.env.CRM_WEBHOOK_SECRET || process.env.CRM_SYNC_SECRET || "",
  dailyReportEnabled: process.env.DAILY_REPORT_ENABLED !== "false",
  dailyReportChannel: process.env.DAILY_REPORT_CHANNEL || "ghl",
  dailyReportTimezone: process.env.DAILY_REPORT_TIMEZONE || "America/Chicago",
  dailyReportTo: process.env.DAILY_REPORT_TO || "",
  ghlDailyReportWebhookUrl: process.env.GHL_DAILY_REPORT_WEBHOOK_URL || process.env.DAILY_REPORT_WEBHOOK_URL || "",
};

const companies = [
  { id: "00000000-0000-0000-0000-000000000001", name: "South Texas Builders", slug: "south", brand_color: "#172b62", active: true },
  { id: "00000000-0000-0000-0000-000000000002", name: "Cuates Construction", slug: "cuates", brand_color: "#d98646", active: true },
];

const COMPANY_IDS = {
  south: "00000000-0000-0000-0000-000000000001",
  cuates: "00000000-0000-0000-0000-000000000002",
};

const GHL_STAGE_MAPPINGS = {
  "3987b9bf-4c54-4cc7-8e95-2122939303e0": { companyId: COMPANY_IDS.south, pipelineId: "wFodyxJC1Xl3GR7IfKRj", label: "Reunion Agendada Oficina", crmStage: "reunion_agendada_oficina", meetingStatus: "agendada" },
  "bb8e6421-636b-4f4e-86c8-aacc060bb9da": { companyId: COMPANY_IDS.south, pipelineId: "wFodyxJC1Xl3GR7IfKRj", label: "Reunion Agendada Celular", crmStage: "reunion_agendada_celular", meetingStatus: "agendada" },
  "37f50558-74e5-4786-bb5e-ddb7897243c3": { companyId: COMPANY_IDS.south, pipelineId: "wFodyxJC1Xl3GR7IfKRj", label: "Reunion Para Showing", crmStage: "reunion_para_showing", meetingStatus: "agendada" },
  "fd9f77e3-0b42-4f52-822d-4c81bdd0b2bc": { companyId: COMPANY_IDS.south, pipelineId: "wFodyxJC1Xl3GR7IfKRj", label: "No Show", crmStage: "no_show", meetingStatus: "no_show" },
  "7ce34719-2971-476b-a5be-c9bdafa1becd": { companyId: COMPANY_IDS.south, pipelineId: "wFodyxJC1Xl3GR7IfKRj", label: "Atendido (Warm)", crmStage: "contactado_con_tarea", meetingStatus: "atendida" },
  "538c03c5-c494-4a3f-b5ab-c9e6fd3b395b": { companyId: COMPANY_IDS.south, pipelineId: "wFodyxJC1Xl3GR7IfKRj", label: "Seguimiento Mensual", crmStage: "contactado_con_tarea", meetingStatus: "reagendo" },
  "08d25468-79e2-42ca-be95-df7bad2a57cc": { companyId: COMPANY_IDS.south, pipelineId: "wFodyxJC1Xl3GR7IfKRj", label: "En Proceso De Aprobacion", crmStage: "en_proceso_aprobacion", meetingStatus: "atendida" },
  "127e86fa-b2c6-4870-9895-2a6909be5040": { companyId: COMPANY_IDS.south, pipelineId: "wFodyxJC1Xl3GR7IfKRj", label: "Lead Potencial", crmStage: "lead_potencial", meetingStatus: "atendida" },
  "b394094d-05d4-4707-ad6a-5ab94a39005e": { companyId: COMPANY_IDS.south, pipelineId: "wFodyxJC1Xl3GR7IfKRj", label: "Closed", crmStage: "closed", meetingStatus: "cerrado" },
  "34b857fd-a093-433a-b61d-048cc9150181": { companyId: COMPANY_IDS.south, pipelineId: "wFodyxJC1Xl3GR7IfKRj", label: "Did Not Approve Mortgage Loan", crmStage: "did_not_approve_mortgage_loan", meetingStatus: "descalificado" },
  "217bf850-88bb-43e2-846a-3ec6ef567223": { companyId: COMPANY_IDS.south, pipelineId: "wFodyxJC1Xl3GR7IfKRj", label: "Not Interested", crmStage: "not_interested", meetingStatus: "descalificado" },

  "9a328de3-c5ee-4e29-bb50-3223e23fa4b3": { companyId: COMPANY_IDS.cuates, pipelineId: "qG9FytqduSLUwRedu8Zb", label: "Reunion Agendada Oficina", crmStage: "reunion_agendada_oficina", meetingStatus: "agendada" },
  "575921fe-2457-489d-a16e-d2478a6054ce": { companyId: COMPANY_IDS.cuates, pipelineId: "qG9FytqduSLUwRedu8Zb", label: "Reunion Agendada Celular", crmStage: "reunion_agendada_celular", meetingStatus: "agendada" },
  "90fd23f4-bfd7-4e57-8ce1-8f979b34fc4e": { companyId: COMPANY_IDS.cuates, pipelineId: "qG9FytqduSLUwRedu8Zb", label: "Reunion Para Showing", crmStage: "reunion_para_showing", meetingStatus: "agendada" },
  "a79e5ad2-9ffc-4867-9e58-25279675c273": { companyId: COMPANY_IDS.cuates, pipelineId: "qG9FytqduSLUwRedu8Zb", label: "No Show", crmStage: "no_show", meetingStatus: "no_show" },
  "c57aa775-1b66-4deb-879b-6def7b8f6803": { companyId: COMPANY_IDS.cuates, pipelineId: "qG9FytqduSLUwRedu8Zb", label: "Atendido (Warm)", crmStage: "contactado_con_tarea", meetingStatus: "atendida" },
  "97f99876-94f0-47a6-9fc1-f7e876a4aa5b": { companyId: COMPANY_IDS.cuates, pipelineId: "qG9FytqduSLUwRedu8Zb", label: "Seguimiento Mensual", crmStage: "contactado_con_tarea", meetingStatus: "reagendo" },
  "580fee77-ef55-4847-b538-dd7c9c577270": { companyId: COMPANY_IDS.cuates, pipelineId: "qG9FytqduSLUwRedu8Zb", label: "En Proceso De Aprobacion", crmStage: "en_proceso_aprobacion", meetingStatus: "atendida" },
  "d211d6a8-e64e-4909-8de3-280831b6dc8e": { companyId: COMPANY_IDS.cuates, pipelineId: "qG9FytqduSLUwRedu8Zb", label: "Potencial", crmStage: "lead_potencial", meetingStatus: "atendida" },
  "6fdad7fd-7969-4064-8e30-378ecd5a9736": { companyId: COMPANY_IDS.cuates, pipelineId: "qG9FytqduSLUwRedu8Zb", label: "Closed", crmStage: "closed", meetingStatus: "cerrado" },
  "ae10cf16-b9c3-4af8-b4ef-43349e8f9850": { companyId: COMPANY_IDS.cuates, pipelineId: "qG9FytqduSLUwRedu8Zb", label: "Did Get Approved", crmStage: "lead_potencial", meetingStatus: "atendida" },
  "70d336b7-7e91-4e2a-b697-914817458100": { companyId: COMPANY_IDS.cuates, pipelineId: "qG9FytqduSLUwRedu8Zb", label: "Not Interested", crmStage: "not_interested", meetingStatus: "descalificado" },
};

const pipelineStages = [
  "reunion_agendada_oficina",
  "reunion_agendada_celular",
  "reunion_para_showing",
  "no_show",
  "contactado_con_tarea",
  "en_proceso_aprobacion",
  "lead_potencial",
  "closed",
  "not_interested",
  "did_not_approve_mortgage_loan",
  "new",
  "contacted",
  "follow_up",
  "proposal",
  "lost",
];

const noteTypes = ["setter", "closer", "follow_up", "status", "ghl_activity", "plaud_meeting"];
const activityTypes = ["note", "call", "sms", "whatsapp", "email", "meeting_transcript", "summary", "other"];
const activitySources = ["ghl", "plaud", "zapier", "manual_import"];

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/health") {
      return sendJson(res, {
        ok: true,
        supabaseConfigured: Boolean(config.supabaseUrl && config.supabaseServiceRoleKey),
      });
    }

    if (url.pathname === "/api/state") {
      await ensureCompanies();
      const [companyRows, meetingRows, pipelineResult, notesResult, ghlResult, ghlRunsResult, activityResult] = await Promise.all([
        supabaseSelectAll("companies", "id,slug,name,brand_color,active"),
        supabaseSelectAll("meetings", "*", { order: "meeting_date.desc,created_at.desc" }),
        safeSelect("closer_pipeline", "*", { order: "updated_at.desc" }),
        safeSelect("meeting_notes", "*", { order: "created_at.desc" }),
        safeSelect("ghl_lead_snapshots", "*", { order: "updated_at.desc" }),
        safeSelect("ghl_sync_runs", "*", { order: "started_at.desc" }),
        safeSelect("ghl_activities", "*", { order: "activity_at.desc" }),
      ]);
      const meetings = meetingRows.filter(isCrmMeeting);
      const meetingIds = new Set(meetings.map((meeting) => meeting.id));

      const setupRequired = !pipelineResult.ok || !notesResult.ok || !ghlResult.ok || !ghlRunsResult.ok || !activityResult.ok;
      return sendJson(res, {
        setupRequired,
        setupError: setupRequired ? "Run supabase/closer_crm_schema.sql in Supabase to enable pipeline, notes, and GHL sync tables." : "",
        companies: companyRows.filter((company) => company.active !== false),
        meetings,
        pipeline: pipelineResult.rows.filter((row) => meetingIds.has(row.meeting_id)),
        notes: notesResult.rows.filter((row) => meetingIds.has(row.meeting_id)),
        activities: activityResult.rows.filter((row) => meetingIds.has(row.meeting_id)).map(compactActivity),
        ghl: {
          configured: Boolean(config.ghlApiKey && config.ghlLocationId),
          snapshots: ghlResult.rows.filter((row) => meetingIds.has(row.meeting_id)).map(compactGhlSnapshot),
          syncRuns: ghlRunsResult.rows,
        },
      });
    }

    if (url.pathname === "/api/ghl/status") {
      return sendJson(res, {
        configured: Boolean(config.ghlApiKey && config.ghlLocationId),
        baseUrl: config.ghlBaseUrl,
        locationConfigured: Boolean(config.ghlLocationId),
        lastSync: await latestGhlSyncRun(),
      });
    }

    if (url.pathname === "/api/reports/daily-construction") {
      if (req.method === "POST") requireSyncSecret(req);
      const requestedDate = cleanDate(url.searchParams.get("date"));
      const report = await buildDailyConstructionReport(requestedDate || previousLocalDate());

      if (req.method === "POST") {
        const dryRun = ["1", "true", "yes"].includes(cleanText(url.searchParams.get("dryRun")).toLowerCase());
        const delivery = await deliverDailyReport(report, { dryRun });
        return sendJson(res, { ok: true, report, delivery });
      }

      return sendJson(res, { ok: true, report });
    }

    if (url.pathname === "/api/ghl/import" && req.method === "POST") {
      const body = await readJson(req);
      const snapshots = Array.isArray(body.snapshots) ? body.snapshots.map(sanitizeGhlSnapshot) : [sanitizeGhlSnapshot(body)];
      await supabaseUpsert("ghl_lead_snapshots", snapshots, "meeting_id");
      await recordGhlSyncRun({
        source: "manual_import",
        status: "completed",
        records_seen: snapshots.length,
        records_matched: snapshots.filter((row) => row.meeting_id).length,
      });
      return sendJson(res, { ok: true, imported: snapshots.length });
    }

    if (url.pathname === "/api/ghl/sync" && req.method === "POST") {
      requireSyncSecret(req);
      const started = new Date().toISOString();
      if (!config.ghlApiKey || !config.ghlLocationId) {
        await recordGhlSyncRun({
          source: "ghl_api",
          status: "missing_config",
          started_at: started,
          error_message: "Add GHL_API_KEY and GHL_LOCATION_ID to the server environment.",
        });
        return sendJson(res, {
          ok: false,
          configured: false,
          message: "GHL API is not configured yet. Add GHL_API_KEY and GHL_LOCATION_ID when you have them.",
        }, 428);
      }

      try {
        const meetings = (await supabaseSelectAll("meetings", "*", { order: "meeting_date.desc,created_at.desc" })).filter(isCrmMeeting);
        const opportunities = await fetchGhlOpportunities();
        const snapshots = opportunities
          .map((opportunity) => opportunityToSnapshot(opportunity, meetings))
          .filter(Boolean);

        if (snapshots.length) {
          await supabaseUpsert("ghl_lead_snapshots", snapshots, "meeting_id");
          await updateMeetingsFromGhlSnapshots(snapshots, meetings);
          await syncGhlActivitiesFromSnapshots(snapshots);
        }

        await recordGhlSyncRun({
          source: "ghl_api",
          status: "completed",
          started_at: started,
          records_seen: opportunities.length,
          records_matched: snapshots.length,
        });
        return sendJson(res, {
          ok: true,
          configured: true,
          recordsSeen: opportunities.length,
          recordsMatched: snapshots.length,
        });
      } catch (error) {
        await recordGhlSyncRun({
          source: "ghl_api",
          status: "failed",
          started_at: started,
          error_message: error.message,
        });
        throw error;
      }
    }

    if (url.pathname === "/api/pipeline" && req.method === "POST") {
      const body = await readJson(req);
      const row = sanitizePipeline(body);
      await supabaseUpsert("closer_pipeline", [row], "meeting_id");
      return sendJson(res, { ok: true });
    }

    if (url.pathname === "/api/meeting-status" && req.method === "PATCH") {
      const body = await readJson(req);
      const id = requiredText(body.id, "Meeting ID");
      const status = oneOf(body.status, ["agendada", "atendida", "no_show", "reagendo", "descalificado", "cerrado"], "Meeting status");
      await supabaseUpdate("meetings", {
        status,
        status_source: "closer_dashboard",
        status_updated_at: new Date().toISOString(),
      }, { id });
      return sendJson(res, { ok: true });
    }

    if (url.pathname === "/api/notes" && req.method === "POST") {
      const body = await readJson(req);
      const note = {
        meeting_id: requiredText(body.meeting_id, "Meeting ID"),
        company_id: requiredText(body.company_id, "Company ID"),
        note_text: requiredText(body.note_text, "Note"),
        note_type: oneOf(body.note_type || "closer", noteTypes, "Note type"),
        created_by_name: cleanText(body.created_by_name),
      };
      await supabaseInsert("meeting_notes", [note]);
      return sendJson(res, { ok: true });
    }

    if (url.pathname === "/api/activities/import" && req.method === "POST") {
      requireWebhookSecret(req);
      const body = await readJson(req);
      const rows = Array.isArray(body.activities) ? body.activities : [body];
      const activities = rows.map((row) => sanitizeActivity(row));
      await supabaseUpsert("ghl_activities", activities, "activity_source,external_id");
      return sendJson(res, { ok: true, imported: activities.length });
    }

    if (url.pathname === "/api/plaud/webhook" && req.method === "POST") {
      requireWebhookSecret(req);
      const body = await readJson(req);
      const result = await importPlaudActivity(body);
      return sendJson(res, result);
    }

    if (url.pathname.startsWith("/api/")) {
      return sendJson(res, { error: "API route not found or method not allowed." }, 404);
    }

    if (url.pathname === "/favicon.ico") {
      return sendText(res, "", "image/x-icon", 204);
    }

    const filePath = safePublicPath(url.pathname);
    const body = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "content-type": contentTypes[ext] || "application/octet-stream" });
    res.end(body);
  } catch (error) {
    console.error(error);
    sendJson(res, { error: error.message || "Server error" }, error.status || 500);
  }
});

server.listen(config.port, config.host, () => {
  console.log(`Bonalti Closer CRM running at http://localhost:${config.port}`);
});

function safePublicPath(pathname) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const decoded = decodeURIComponent(cleanPath);
  const resolved = path.resolve(__dirname, `.${decoded}`);
  if (!resolved.startsWith(__dirname)) {
    const error = new Error("Invalid path");
    error.status = 404;
    throw error;
  }
  return resolved;
}

function sendJson(res, payload, status = 200) {
  sendText(res, JSON.stringify(payload), "application/json; charset=utf-8", status);
}

function sendText(res, text, contentType, status = 200) {
  res.writeHead(status, { "content-type": contentType });
  res.end(text);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function requireSyncSecret(req) {
  if (!config.crmSyncSecret) return;
  const provided = cleanText(req.headers["x-crm-sync-secret"]);
  if (provided === config.crmSyncSecret) return;
  throw Object.assign(new Error("Sync authorization is required."), { status: 401 });
}

function requireWebhookSecret(req) {
  if (!config.crmWebhookSecret) return;
  const provided = cleanText(req.headers["x-crm-webhook-secret"] || req.headers["x-crm-sync-secret"]);
  if (provided === config.crmWebhookSecret) return;
  throw Object.assign(new Error("Webhook authorization is required."), { status: 401 });
}

function loadDotEnv() {
  const file = path.join(__dirname, ".env");
  if (!existsSync(file)) return;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...parts] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = parts.join("=").replace(/^["']|["']$/g, "");
  }
}

function supabaseHeaders(extra = {}) {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw Object.assign(new Error("Supabase service role configuration is missing."), { status: 500 });
  }
  return {
    apikey: config.supabaseServiceRoleKey,
    authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    ...extra,
  };
}

async function ensureCompanies() {
  await supabaseUpsert("companies", companies, "slug");
}

async function latestGhlSyncRun() {
  const result = await safeSelect("ghl_sync_runs", "*", { order: "started_at.desc", limit: 1 });
  return result.rows[0] || null;
}

async function buildDailyConstructionReport(reportDate) {
  await ensureCompanies();
  const [meetingRows, pipelineResult, notesResult, ghlResult, activityResult] = await Promise.all([
    supabaseSelectAll("meetings", "*", { order: "meeting_date.asc,created_at.asc" }),
    safeSelect("closer_pipeline", "*", { order: "updated_at.desc" }),
    safeSelect("meeting_notes", "*", { order: "created_at.desc" }),
    safeSelect("ghl_lead_snapshots", "*", { order: "updated_at.desc" }),
    safeSelect("ghl_activities", "*", { order: "activity_at.desc" }),
  ]);

  const meetings = meetingRows
    .filter(isCrmMeeting)
    .filter((meeting) => meeting.meeting_type === "construction")
    .filter((meeting) => [COMPANY_IDS.south, COMPANY_IDS.cuates].includes(meeting.company_id));
  const meetingIds = new Set(meetings.map((meeting) => meeting.id));
  const pipelines = pipelineResult.rows.filter((row) => meetingIds.has(row.meeting_id));
  const notes = notesResult.rows.filter((row) => meetingIds.has(row.meeting_id));
  const snapshots = ghlResult.rows.filter((row) => meetingIds.has(row.meeting_id));
  const activities = activityResult.rows.filter((row) => meetingIds.has(row.meeting_id));

  const rows = meetings
    .map((meeting) => summarizeConstructionMeeting(meeting, {
      pipeline: newestForMeeting(pipelines, meeting.id, "updated_at"),
      snapshot: newestForMeeting(snapshots, meeting.id, "updated_at"),
      notes: notes.filter((row) => row.meeting_id === meeting.id),
      activities: activities.filter((row) => row.meeting_id === meeting.id),
    }))
    .filter((row) => row.reportDate === reportDate);

  const totals = {
    total: rows.length,
    showed: rows.filter((row) => row.attendanceKey === "showed").length,
    noShow: rows.filter((row) => row.attendanceKey === "no_show").length,
    rescheduled: rows.filter((row) => row.attendanceKey === "rescheduled").length,
    needsReview: rows.filter((row) => row.attendanceKey === "needs_review").length,
    closed: rows.filter((row) => row.outcomeKey === "closed").length,
  };

  const report = {
    date: reportDate,
    label: formatReportDate(reportDate),
    generatedAt: new Date().toISOString(),
    totals,
    companies: [
      companyReport("South Texas Builders", "🏢", COMPANY_IDS.south, rows),
      companyReport("Cuates Construction", "🟠", COMPANY_IDS.cuates, rows),
    ],
  };
  report.managerNote = dailyManagerNote(report);
  report.message = formatDailyConstructionMessage(report);
  return report;
}

function summarizeConstructionMeeting(meeting, context) {
  const stage = dailyStage(meeting, context.pipeline, context.snapshot);
  const rawNote = dailyLatestRawNote(meeting, context);
  const latestNote = compactSummaryText(rawNote);
  const reportDate = bestMeetingReportDate(meeting, context, rawNote);
  const attendance = attendanceForStatus(meeting.status);
  return {
    id: meeting.id,
    companyId: meeting.company_id,
    clientName: meeting.client_name,
    meetingDate: meeting.meeting_date,
    reportDate,
    status: meeting.status,
    statusSource: meeting.status_source,
    statusUpdatedAt: meeting.status_updated_at,
    attendanceKey: attendance.key,
    attendanceLabel: attendance.label,
    attendanceEmoji: attendance.emoji,
    outcomeKey: outcomeKeyForStage(stage, meeting),
    outcomeLabel: outcomeLabelForStage(stage, meeting),
    stage,
    note: latestNote || "Pending note from the sales closer.",
    nextStep: nextStepForMeeting(meeting, stage, attendance.key),
  };
}

function companyReport(name, emoji, companyId, rows) {
  const meetings = rows.filter((row) => row.companyId === companyId);
  return {
    name,
    emoji,
    companyId,
    total: meetings.length,
    meetings,
  };
}

function newestForMeeting(rows, meetingId, dateField) {
  return rows
    .filter((row) => row.meeting_id === meetingId)
    .sort((a, b) => compareDatesDesc(a[dateField], b[dateField]))[0] || null;
}

function attendanceForStatus(status) {
  if (status === "atendida" || status === "cerrado") {
    return { key: "showed", label: "Showed", emoji: "✅" };
  }
  if (status === "no_show") {
    return { key: "no_show", label: "No Show", emoji: "❌" };
  }
  if (status === "reagendo") {
    return { key: "rescheduled", label: "Rescheduled", emoji: "🔁" };
  }
  return { key: "needs_review", label: "Needs Review", emoji: "⚠️" };
}

function dailyStage(meeting, pipeline, snapshot) {
  if (snapshot?.pipeline_stage && pipelineStages.includes(snapshot.pipeline_stage)) return snapshot.pipeline_stage;
  if (pipeline?.pipeline_stage && pipelineStages.includes(pipeline.pipeline_stage)) return pipeline.pipeline_stage;
  if (meeting.status === "cerrado") return "closed";
  if (meeting.status === "no_show") return "no_show";
  if (meeting.status === "reagendo") return "follow_up";
  if (meeting.status === "descalificado") return "not_interested";
  if (meeting.status === "atendida") return "contactado_con_tarea";
  return "reunion_agendada_celular";
}

function outcomeKeyForStage(stage, meeting) {
  if (stage === "closed" || meeting.status === "cerrado") return "closed";
  if (stage === "lead_potencial") return "highly_interested";
  if (stage === "not_interested" || stage === "did_not_approve_mortgage_loan" || meeting.status === "descalificado") return "not_interested";
  if (stage === "contactado_con_tarea" || stage === "follow_up" || meeting.status === "reagendo") return "need_follow_up";
  if (stage === "no_show" || meeting.status === "no_show") return "no_show";
  return "scheduled";
}

function outcomeLabelForStage(stage, meeting) {
  const key = outcomeKeyForStage(stage, meeting);
  if (key === "closed") return "Closed";
  if (key === "highly_interested") return "Highly Interested";
  if (key === "not_interested") return "Not Interested";
  if (key === "need_follow_up") return "Need Follow Up";
  if (key === "no_show") return "No Show";
  return "Scheduled";
}

function dailyLatestRawNote(meeting, { pipeline, snapshot, notes, activities }) {
  const orderedNotes = notes
    .filter((note) => cleanText(note.note_text))
    .sort((a, b) => compareDatesDesc(a.created_at, b.created_at));
  const orderedActivities = activities
    .filter((activity) => cleanText(activity.activity_text))
    .sort((a, b) => compareDatesDesc(a.activity_at, b.activity_at));
  return cleanText(
    orderedNotes[0]?.note_text ||
    orderedActivities[0]?.activity_text ||
    snapshot?.last_note ||
    pipeline?.closer_notes ||
    pipeline?.lost_reason ||
    meeting.notes ||
    ""
  );
}

function bestMeetingReportDate(meeting, { snapshot }, rawNote) {
  return (
    appointmentDateFromText(rawNote) ||
    appointmentDateFromGhlPayload(snapshot?.raw_payload) ||
    cleanDate(meeting.meeting_date)
  );
}

function appointmentDateFromGhlPayload(payload) {
  if (!payload || typeof payload !== "object") return "";

  const values = [];
  const customFields = [
    payload.customFields,
    payload.custom_fields,
    payload.contact?.customFields,
    payload.contact?.custom_fields,
  ].filter(Array.isArray).flat();

  for (const field of customFields) {
    values.push(
      field?.fieldValueString,
      field?.fieldValue,
      field?.field_value,
      field?.value
    );
  }

  values.push(
    payload.appointmentDate,
    payload.appointment_date,
    payload.meetingDate,
    payload.meeting_date,
    payload.calendarEvent?.startTime,
    payload.calendar_event?.start_time
  );

  return appointmentDateFromText(values.filter(Boolean).join(" "));
}

const MONTH_NUMBER_BY_NAME = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

function appointmentDateFromText(value) {
  const text = cleanText(value);
  if (!text) return "";

  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];

  const monthDate = text.match(/\b(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sept|Sep|October|Oct|November|Nov|December|Dec)\s+(\d{1,2}),\s*(20\d{2})\b/i);
  if (!monthDate) return "";

  const month = MONTH_NUMBER_BY_NAME[monthDate[1].toLowerCase()];
  const day = Number(monthDate[2]);
  const year = Number(monthDate[3]);
  if (!month || day < 1 || day > 31) return "";

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nextStepForMeeting(meeting, stage, attendanceKey) {
  if (attendanceKey === "needs_review") return "Data Entry confirm attendance before tomorrow's recap.";
  if (attendanceKey === "no_show") return "Data Entry confirm reschedule attempt.";
  if (attendanceKey === "rescheduled") return "Confirm new date/time is saved.";
  if (stage === "closed" || meeting.status === "cerrado") return "No immediate action; closed lead.";
  if (stage === "lead_potencial") return "Claudia follow up today.";
  if (stage === "not_interested" || stage === "did_not_approve_mortgage_loan") return "No active follow-up unless re-engaged.";
  return "Closer update next step/status.";
}

function formatDailyConstructionMessage(report) {
  const lines = [
    "☀️ Bonalti Closer Recap",
    `For ${report.label}`,
    "",
    "🏗️ Construction Meetings",
    `Total: ${report.totals.total}`,
    `✅ Showed: ${report.totals.showed}`,
    `❌ No Show: ${report.totals.noShow}`,
    `🔁 Rescheduled: ${report.totals.rescheduled}`,
    `⚠️ Needs Review: ${report.totals.needsReview}`,
    `🟢 Closed: ${report.totals.closed}`,
  ];

  for (const company of report.companies) {
    lines.push("", `${company.emoji} ${company.name}`);
    if (!company.meetings.length) {
      lines.push("No construction meetings.");
      continue;
    }
    company.meetings.forEach((meeting, index) => {
      lines.push(
        `${index + 1}. ${meeting.clientName} — ${meeting.attendanceEmoji} ${meeting.attendanceLabel} / ${meeting.outcomeLabel}`,
        `Note: ${meeting.note}`
      );
    });
  }

  lines.push("", "Manager Note:", report.managerNote);
  return lines.join("\n");
}

function dailyManagerNote(report) {
  if (!report.totals.total) return "No construction meetings yesterday.";
  const notes = [];
  if (report.totals.needsReview) {
    notes.push(`${report.totals.needsReview} meeting${plural(report.totals.needsReview)} still need confirmed attendance.`);
  }
  if (report.totals.noShow) {
    const verb = report.totals.noShow === 1 ? "needs" : "need";
    notes.push(`${report.totals.noShow} no-show${plural(report.totals.noShow)} ${verb} a reschedule attempt.`);
  }
  if (report.totals.showed && !report.totals.needsReview) {
    notes.push("Confirmed attendance is clean for yesterday.");
  }
  if (report.totals.closed) {
    notes.push(`${report.totals.closed} lead${plural(report.totals.closed)} marked closed.`);
  }
  return notes.join(" ") || "Review closer notes and make sure every lead has a next step.";
}

async function deliverDailyReport(report, options = {}) {
  if (!config.dailyReportEnabled) {
    return {
      sent: false,
      reason: "DAILY_REPORT_ENABLED is false.",
    };
  }

  if (config.dailyReportChannel !== "ghl") {
    return {
      sent: false,
      reason: `DAILY_REPORT_CHANNEL=${config.dailyReportChannel} is not supported yet.`,
    };
  }

  if (!config.ghlDailyReportWebhookUrl) {
    return {
      sent: false,
      reason: "GHL_DAILY_REPORT_WEBHOOK_URL is not configured yet.",
    };
  }

  const recipients = config.dailyReportTo
    .split(",")
    .map((phone) => cleanText(phone))
    .filter(Boolean);

  if (!recipients.length) {
    return {
      sent: false,
      reason: "DAILY_REPORT_TO is not configured yet.",
    };
  }

  if (options.dryRun) {
    return {
      sent: false,
      dryRun: true,
      channel: "ghl",
      recipients: recipients.length,
      results: recipients.map((phone) => ({
        phone,
        sent: false,
        status: "dry_run",
      })),
    };
  }

  const results = [];
  for (const phone of recipients) {
    const response = await fetch(config.ghlDailyReportWebhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: report.message,
        phone,
        firstName: "Daily",
        lastName: "Report",
        report_date: report.date,
        source: "bonalti-closer-intelligence",
      }),
    });

    results.push({
      phone,
      sent: response.ok,
      status: response.status,
      error: response.ok ? "" : await response.text(),
    });
  }

  return {
    sent: results.every((result) => result.sent),
    channel: "ghl",
    recipients: results.length,
    results,
  };
}

async function fetchGhlOpportunities() {
  const rows = [];
  const pageLimit = Math.min(Math.max(config.ghlSyncLimit || 100, 1), 100);

  for (let page = 1; page <= 10; page += 1) {
    const url = ghlUrl("/opportunities/search");
    url.searchParams.set("location_id", config.ghlLocationId);
    url.searchParams.set("status", "all");
    url.searchParams.set("limit", String(pageLimit));
    url.searchParams.set("page", String(page));
    url.searchParams.set("getNotes", "true");
    url.searchParams.set("getCalendarEvents", "true");

    const payload = await ghlRequest(url);
    const pageRows = extractGhlRows(payload);
    rows.push(...pageRows);

    if (pageRows.length < pageLimit || rows.length >= config.ghlSyncLimit) break;
  }

  return rows.slice(0, config.ghlSyncLimit);
}

async function ghlRequest(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.ghlApiKey}`,
      Version: config.ghlApiVersion,
      Accept: "application/json",
    },
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : {};
  if (!response.ok) {
    const message = typeof payload === "object" ? payload.message || payload.error || text : text;
    throw new Error(`GHL request failed (${response.status}): ${message}`);
  }
  return payload;
}

function extractGhlRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.opportunities)) return payload.opportunities;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function opportunityToSnapshot(opportunity, meetings) {
  const pipelineStageId = cleanText(opportunity.pipelineStageId || opportunity.pipeline_stage_id || opportunity.pipelineStageUId || opportunity.stageId || opportunity.stage_id);
  const pipelineId = cleanText(opportunity.pipelineId || opportunity.pipeline_id);
  const mapping = GHL_STAGE_MAPPINGS[pipelineStageId];
  if (!mapping || (pipelineId && mapping.pipelineId !== pipelineId)) return null;

  const meeting = matchOpportunityToMeeting(opportunity, meetings, mapping);
  if (!meeting) return null;
  const status = cleanText(opportunity.status || opportunity.opportunityStatus || opportunity.opportunity_status || "open");
  const lastActivityAt = ghlChangedAt(opportunity);

  return sanitizeGhlSnapshot({
    meeting_id: meeting.id,
    company_id: meeting.company_id,
    ghl_contact_id: ghlContactId(opportunity),
    ghl_opportunity_id: ghlOpportunityId(opportunity),
    ghl_pipeline_id: pipelineId || mapping.pipelineId,
    ghl_pipeline_stage_id: pipelineStageId,
    pipeline_stage: mapping.crmStage,
    pipeline_stage_name: mapping.label,
    meeting_status: mapping.meetingStatus,
    opportunity_status: mapGhlStatus(status),
    opportunity_value: opportunity.monetaryValue || opportunity.value || opportunity.opportunityValue,
    assigned_to_name: opportunity.assignedToName || opportunity.assigned_to_name || opportunity.assignedTo || opportunity.ownerName,
    follow_up_date: opportunity.followUpDate || opportunity.follow_up_date,
    last_activity_at: lastActivityAt,
    last_note: latestGhlNote(opportunity),
    raw_payload: opportunity,
  });
}

function matchOpportunityToMeeting(opportunity, meetings, mapping) {
  const opportunityId = ghlOpportunityId(opportunity);
  const contactId = ghlContactId(opportunity);
  const companyMeetings = mapping?.companyId
    ? meetings.filter((meeting) => meeting.company_id === mapping.companyId)
    : meetings;

  if (opportunityId) {
    const exactOpportunity = companyMeetings.find((meeting) => cleanText(meeting.ghl_opportunity_id) === opportunityId);
    if (exactOpportunity) return exactOpportunity;
  }

  if (contactId) {
    const exactContact = companyMeetings.find((meeting) => cleanText(meeting.ghl_contact_id) === contactId);
    if (exactContact) return exactContact;
  }

  const name = normalizedName(opportunity.name || opportunity.fullName || opportunity.contactName || opportunity.contact?.name);
  if (!name) return null;

  const exact = companyMeetings.find((meeting) => normalizedName(meeting.client_name) === name);
  if (exact) return exact;

  return companyMeetings.find((meeting) => {
    const meetingName = normalizedName(meeting.client_name);
    return meetingName && (meetingName.includes(name) || name.includes(meetingName));
  }) || null;
}

async function updateMeetingsFromGhlSnapshots(snapshots, meetings) {
  const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]));
  await Promise.all(snapshots.map((snapshot) => {
    const meeting = meetingsById.get(snapshot.meeting_id);
    if (!meeting) return null;

    const incomingAt = cleanDateTime(snapshot.last_activity_at) || snapshot.synced_at || new Date().toISOString();
    const existingAt = cleanDateTime(meeting.status_updated_at);
    const isNewerThanCloserStatus = !existingAt || new Date(incomingAt).getTime() >= new Date(existingAt).getTime();
    const shouldUpdateStatus = cleanText(meeting.status_source) !== "closer_dashboard" || isNewerThanCloserStatus;
    const values = {
      ghl_contact_id: cleanText(snapshot.ghl_contact_id),
      ghl_opportunity_id: cleanText(snapshot.ghl_opportunity_id),
    };

    if (shouldUpdateStatus && snapshot.meeting_status) {
      values.status = snapshot.meeting_status;
      values.status_source = "ghl";
      values.status_updated_at = incomingAt;
    }

    return supabaseUpdate("meetings", values, { id: snapshot.meeting_id });
  }));
}

function ghlOpportunityId(opportunity) {
  return cleanText(opportunity.id || opportunity.opportunityId || opportunity.opportunity_id);
}

function ghlContactId(opportunity) {
  return cleanText(opportunity.contactId || opportunity.contact_id || opportunity.contact?.id);
}

function ghlChangedAt(opportunity) {
  return cleanDateTime(
    opportunity.lastStageChangeAt ||
    opportunity.last_stage_change_at ||
    opportunity.lastStatusChangeAt ||
    opportunity.last_status_change_at ||
    opportunity.updatedAt ||
    opportunity.updated_at ||
    opportunity.dateUpdated ||
    opportunity.date_updated
  );
}

function mapGhlStage(value, status = "") {
  const text = normalizeForMatch(value);
  const statusText = normalizeForMatch(status);
  if (statusText === "won" || text.includes("closed")) return "closed";
  if (statusText === "lost" || text.includes("lost")) return "lost";
  if (text.includes("no show") || text.includes("noshow")) return "no_show";
  if (text.includes("not interested")) return "not_interested";
  if (text.includes("not qualified") || text.includes("did not approve")) return "did_not_approve_mortgage_loan";
  if (text.includes("approved") || text.includes("qualified") || text.includes("lead potencial") || text.includes("potential")) return "lead_potencial";
  if (text.includes("follow") || text.includes("task") || text.includes("contactado")) return "contactado_con_tarea";
  if (text.includes("process") || text.includes("proceso") || text.includes("approval")) return "en_proceso_aprobacion";
  if (text.includes("showing")) return "reunion_para_showing";
  if (text.includes("office") || text.includes("oficina")) return "reunion_agendada_oficina";
  if (text.includes("scheduled") || text.includes("agendada") || text.includes("meeting")) return "reunion_agendada_celular";
  return "contacted";
}

function mapGhlStatus(value) {
  const text = normalizeForMatch(value);
  if (["won", "lost", "abandoned"].includes(text)) return text;
  return "open";
}

function latestGhlNote(opportunity) {
  const notes = Array.isArray(opportunity.notes?.notes)
    ? opportunity.notes.notes
    : opportunity.notes || opportunity.contact?.notes || [];
  if (!Array.isArray(notes) || !notes.length) {
    return cleanText(opportunity.lastNote || opportunity.last_note || opportunity.notesText);
  }
  const latest = notes
    .slice()
    .sort((a, b) => new Date(b.dateAdded || b.createdAt || 0) - new Date(a.dateAdded || a.createdAt || 0))[0];
  return htmlToText(latest.bodyText || latest.body || latest.note || latest.text);
}

async function syncGhlActivitiesFromSnapshots(snapshots) {
  const activities = snapshots
    .flatMap((snapshot) => extractGhlActivities(snapshot))
    .filter((activity) => activity.activity_text);

  if (!activities.length) return;
  await supabaseUpsert("ghl_activities", activities, "activity_source,external_id");

  const noteRows = activities.map((activity) => ({
    meeting_id: activity.meeting_id,
    company_id: activity.company_id,
    note_text: activity.activity_text,
    note_type: "ghl_activity",
    created_by_name: activity.closer_name || "GHL",
    created_at: activity.activity_at,
  }));
  await insertMissingMeetingNotes(noteRows);
}

function extractGhlActivities(snapshot) {
  const raw = snapshot.raw_payload || {};
  const notes = Array.isArray(raw.notes?.notes)
    ? raw.notes.notes
    : Array.isArray(raw.notes)
      ? raw.notes
      : [];

  const noteActivities = notes.map((note, index) => sanitizeActivity({
    meeting_id: snapshot.meeting_id,
    company_id: snapshot.company_id,
    ghl_contact_id: snapshot.ghl_contact_id,
    ghl_opportunity_id: snapshot.ghl_opportunity_id,
    external_id: cleanText(note.id || note.noteId || note._id) || `${snapshot.ghl_opportunity_id || snapshot.meeting_id}:note:${index}`,
    activity_source: "ghl",
    activity_type: "note",
    activity_text: htmlToText(note.bodyText || note.body || note.note || note.text),
    activity_at: note.dateAdded || note.createdAt || note.updatedAt || snapshot.last_activity_at || snapshot.synced_at,
    closer_name: snapshot.assigned_to_name,
    raw_payload: note,
  }));

  if (!noteActivities.length && snapshot.last_note) {
    return [sanitizeActivity({
      meeting_id: snapshot.meeting_id,
      company_id: snapshot.company_id,
      ghl_contact_id: snapshot.ghl_contact_id,
      ghl_opportunity_id: snapshot.ghl_opportunity_id,
      external_id: `${snapshot.ghl_opportunity_id || snapshot.meeting_id}:latest-note`,
      activity_source: "ghl",
      activity_type: "note",
      activity_text: snapshot.last_note,
      activity_at: snapshot.last_activity_at || snapshot.synced_at,
      closer_name: snapshot.assigned_to_name,
      raw_payload: raw,
    })];
  }

  return noteActivities;
}

function compactGhlSnapshot(row) {
  return {
    id: row.id,
    meeting_id: row.meeting_id,
    company_id: row.company_id,
    ghl_contact_id: row.ghl_contact_id,
    ghl_opportunity_id: row.ghl_opportunity_id,
    ghl_pipeline_id: row.ghl_pipeline_id,
    ghl_pipeline_stage_id: row.ghl_pipeline_stage_id,
    pipeline_stage: row.pipeline_stage,
    pipeline_stage_name: row.pipeline_stage_name,
    meeting_status: row.meeting_status,
    opportunity_status: row.opportunity_status,
    opportunity_value: row.opportunity_value,
    assigned_to_name: row.assigned_to_name,
    follow_up_date: row.follow_up_date,
    last_activity_at: row.last_activity_at,
    last_note: row.last_note,
    synced_at: row.synced_at,
    updated_at: row.updated_at,
  };
}

function compactActivity(row) {
  return {
    id: row.id,
    meeting_id: row.meeting_id,
    company_id: row.company_id,
    ghl_contact_id: row.ghl_contact_id,
    ghl_opportunity_id: row.ghl_opportunity_id,
    external_id: row.external_id,
    activity_source: row.activity_source,
    activity_type: row.activity_type,
    activity_text: row.activity_text,
    activity_at: row.activity_at,
    closer_name: row.closer_name,
    created_at: row.created_at,
  };
}

async function safeSelect(table, columns, options = {}) {
  try {
    return { ok: true, rows: await supabaseSelectAll(table, columns, options) };
  } catch (error) {
    return { ok: false, rows: [], error: error.message };
  }
}

async function supabaseSelectAll(table, columns, options = {}) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const page = await supabaseSelect(table, columns, {
      ...options,
      range: [from, from + pageSize - 1],
    });
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function supabaseSelect(table, columns, options = {}) {
  const url = restUrl(table);
  url.searchParams.set("select", columns);
  if (options.order) url.searchParams.set("order", options.order);
  if (options.limit) url.searchParams.set("limit", String(options.limit));
  const headers = supabaseHeaders();
  if (options.range) {
    headers.range = `${options.range[0]}-${options.range[1]}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${table} select failed: ${await response.text()}`);
  return response.json();
}

async function supabaseInsert(table, rows) {
  const response = await fetch(restUrl(table), {
    method: "POST",
    headers: supabaseHeaders({
      "content-type": "application/json",
      prefer: "return=minimal",
    }),
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`${table} insert failed: ${await response.text()}`);
}

async function supabaseUpsert(table, rows, onConflict) {
  if (!rows.length) return;
  const url = restUrl(table);
  url.searchParams.set("on_conflict", onConflict);
  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders({
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`${table} upsert failed: ${await response.text()}`);
}

async function supabaseUpdate(table, values, filters) {
  const url = restUrl(table);
  Object.entries(filters).forEach(([key, value]) => url.searchParams.set(key, `eq.${value}`));
  const response = await fetch(url, {
    method: "PATCH",
    headers: supabaseHeaders({
      "content-type": "application/json",
      prefer: "return=minimal",
    }),
    body: JSON.stringify(values),
  });
  if (!response.ok) throw new Error(`${table} update failed: ${await response.text()}`);
}

function restUrl(table) {
  return new URL(`${config.supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`);
}

function isCrmMeeting(meeting) {
  const meetingDate = cleanText(meeting.meeting_date);
  return !config.crmStartDate || meetingDate >= config.crmStartDate;
}

function ghlUrl(pathname) {
  return new URL(`${config.ghlBaseUrl.replace(/\/$/, "")}${pathname}`);
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sanitizePipeline(body) {
  return {
    meeting_id: requiredText(body.meeting_id, "Meeting ID"),
    company_id: requiredText(body.company_id, "Company ID"),
    closer_name: cleanText(body.closer_name),
    pipeline_stage: oneOf(body.pipeline_stage || "reunion_agendada_celular", pipelineStages, "Pipeline stage"),
    closer_status: oneOf(body.closer_status || "pending", ["pending", "closed", "lost"], "Closer status"),
    follow_up_date: cleanDate(body.follow_up_date),
    closed_date: cleanDate(body.closed_date),
    deal_value: cleanMoney(body.deal_value),
    pre_approved_amount: cleanMoney(body.pre_approved_amount),
    lost_reason: cleanText(body.lost_reason),
    closer_notes: cleanText(body.closer_notes),
  };
}

function sanitizeGhlSnapshot(body) {
  const meetingId = requiredText(body.meeting_id, "Meeting ID");
  const companyId = requiredText(body.company_id, "Company ID");
  const stage = oneOf(body.pipeline_stage || body.stage || "contacted", pipelineStages, "GHL stage");
  const status = cleanText(body.opportunity_status || body.status || "open") || "open";
  return {
    meeting_id: meetingId,
    company_id: companyId,
    ghl_contact_id: cleanText(body.ghl_contact_id || body.contact_id),
    ghl_opportunity_id: cleanText(body.ghl_opportunity_id || body.opportunity_id),
    ghl_pipeline_id: cleanText(body.ghl_pipeline_id || body.pipeline_id),
    ghl_pipeline_stage_id: cleanText(body.ghl_pipeline_stage_id || body.pipeline_stage_id),
    pipeline_stage: stage,
    pipeline_stage_name: cleanText(body.pipeline_stage_name || body.stage_name || STAGE_LABEL_FALLBACK[stage]),
    meeting_status: oneOf(body.meeting_status || "", ["", "agendada", "atendida", "no_show", "reagendo", "descalificado", "cerrado"], "Mapped meeting status"),
    opportunity_status: oneOf(status, ["open", "won", "lost", "abandoned"], "GHL opportunity status"),
    opportunity_value: cleanMoney(body.opportunity_value || body.deal_value),
    assigned_to_name: cleanText(body.assigned_to_name || body.assigned_to),
    follow_up_date: cleanDate(body.follow_up_date),
    last_activity_at: cleanDateTime(body.last_activity_at),
    last_note: cleanText(body.last_note || body.note),
    raw_payload: body.raw_payload && typeof body.raw_payload === "object" ? body.raw_payload : body,
    synced_at: new Date().toISOString(),
  };
}

function sanitizeActivity(body) {
  const source = oneOf(body.activity_source || body.source || "manual_import", activitySources, "Activity source");
  const type = oneOf(body.activity_type || body.type || "note", activityTypes, "Activity type");
  const text = requiredText(body.activity_text || body.text || body.note_text || body.summary || body.transcript, "Activity text");
  const meetingId = cleanText(body.meeting_id);
  const externalId = cleanText(body.external_id || body.id || body.recording_id || body.note_id) ||
    `${source}:${meetingId || cleanText(body.ghl_opportunity_id || body.ghl_contact_id) || "unknown"}:${hashText(`${type}:${text}:${body.activity_at || body.created_at || ""}`)}`;

  return {
    meeting_id: meetingId || null,
    company_id: cleanText(body.company_id) || null,
    ghl_contact_id: cleanText(body.ghl_contact_id || body.contact_id),
    ghl_opportunity_id: cleanText(body.ghl_opportunity_id || body.opportunity_id),
    external_id: externalId,
    activity_source: source,
    activity_type: type,
    activity_text: text,
    activity_at: cleanDateTime(body.activity_at || body.created_at || body.dateAdded || body.date_added) || new Date().toISOString(),
    closer_name: cleanText(body.closer_name || body.created_by_name || body.owner_name),
    raw_payload: body.raw_payload && typeof body.raw_payload === "object" ? body.raw_payload : body,
  };
}

async function importPlaudActivity(body) {
  const meetings = (await supabaseSelectAll("meetings", "*", { order: "meeting_date.desc,created_at.desc" })).filter(isCrmMeeting);
  const meeting = matchPlaudPayloadToMeeting(body, meetings);
  if (!meeting) {
    return {
      ok: false,
      matched: false,
      message: "No matching meeting found. Send meeting_id, or include client_name, meeting_date, and company.",
    };
  }

  const transcript = cleanText(body.transcript || body.transcript_text || body.full_transcript);
  const summary = cleanText(body.summary || body.ai_summary || body.meeting_summary);
  const title = cleanText(body.title || body.recording_title || body.name) || "PLAUD meeting note";
  const text = [
    title,
    summary ? `Summary:\n${summary}` : "",
    transcript ? `Transcript:\n${transcript}` : "",
  ].filter(Boolean).join("\n\n");

  const activity = sanitizeActivity({
    meeting_id: meeting.id,
    company_id: meeting.company_id,
    ghl_contact_id: meeting.ghl_contact_id,
    ghl_opportunity_id: meeting.ghl_opportunity_id,
    external_id: body.recording_id || body.id || body.note_id || `plaud:${meeting.id}:${hashText(text)}`,
    activity_source: cleanText(body.activity_source || body.source) === "zapier" ? "zapier" : "plaud",
    activity_type: "meeting_transcript",
    activity_text: text,
    activity_at: body.activity_at || body.recorded_at || body.created_at || meeting.meeting_date,
    closer_name: body.closer_name || body.created_by_name || "PLAUD",
    raw_payload: body,
  });

  await supabaseUpsert("ghl_activities", [activity], "activity_source,external_id");
  await insertMissingMeetingNotes([{
    meeting_id: meeting.id,
    company_id: meeting.company_id,
    note_text: text,
    note_type: "plaud_meeting",
    created_by_name: activity.closer_name || "PLAUD",
    created_at: activity.activity_at,
  }]);

  return { ok: true, matched: true, meetingId: meeting.id, clientName: meeting.client_name };
}

function matchPlaudPayloadToMeeting(body, meetings) {
  const explicitId = cleanText(body.meeting_id);
  if (explicitId) return meetings.find((meeting) => meeting.id === explicitId) || null;

  const contactId = cleanText(body.ghl_contact_id || body.contact_id);
  if (contactId) {
    const byContact = meetings.find((meeting) => cleanText(meeting.ghl_contact_id) === contactId);
    if (byContact) return byContact;
  }

  const opportunityId = cleanText(body.ghl_opportunity_id || body.opportunity_id);
  if (opportunityId) {
    const byOpportunity = meetings.find((meeting) => cleanText(meeting.ghl_opportunity_id) === opportunityId);
    if (byOpportunity) return byOpportunity;
  }

  const name = normalizedName(body.client_name || body.contact_name || body.customer_name || body.title || body.recording_title);
  if (!name) return null;

  const companyId = normalizeCompanyId(body.company_id || body.company || body.company_name);
  const meetingDate = cleanDate(cleanText(body.meeting_date || body.appointment_date || body.recorded_at || body.created_at).slice(0, 10));
  const candidates = meetings.filter((meeting) => {
    if (companyId && meeting.company_id !== companyId) return false;
    if (meetingDate && cleanText(meeting.meeting_date) !== meetingDate) return false;
    const meetingName = normalizedName(meeting.client_name);
    return meetingName && (meetingName === name || meetingName.includes(name) || name.includes(meetingName));
  });

  return candidates[0] || null;
}

function normalizeCompanyId(value) {
  const text = normalizeForMatch(value);
  if (!text) return "";
  if (Object.values(COMPANY_IDS).includes(cleanText(value))) return cleanText(value);
  if (text.includes("cuates")) return COMPANY_IDS.cuates;
  if (text.includes("south") || text.includes("texas")) return COMPANY_IDS.south;
  return "";
}

async function insertMissingMeetingNotes(rows) {
  const cleanRows = rows
    .filter((row) => row.meeting_id && row.company_id && cleanText(row.note_text))
    .map((row) => ({
      meeting_id: row.meeting_id,
      company_id: row.company_id,
      note_text: cleanText(row.note_text),
      note_type: oneOf(row.note_type || "closer", noteTypes, "Note type"),
      created_by_name: cleanText(row.created_by_name),
      created_at: cleanDateTime(row.created_at) || new Date().toISOString(),
    }));

  if (!cleanRows.length) return;
  const existing = await supabaseSelectAll("meeting_notes", "meeting_id,note_type,note_text");
  const existingKeys = new Set(existing.map((row) => `${row.meeting_id}:${row.note_type}:${hashText(row.note_text)}`));
  const missing = cleanRows.filter((row) => {
    const key = `${row.meeting_id}:${row.note_type}:${hashText(row.note_text)}`;
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  });
  if (missing.length) await supabaseInsert("meeting_notes", missing);
}

async function recordGhlSyncRun(row) {
  try {
    await supabaseInsert("ghl_sync_runs", [{
      source: cleanText(row.source) || "ghl_api",
      status: oneOf(row.status || "completed", ["completed", "failed", "missing_config", "pending_mapping"], "GHL sync status"),
      started_at: row.started_at || new Date().toISOString(),
      finished_at: row.finished_at || new Date().toISOString(),
      records_seen: Number.isFinite(Number(row.records_seen)) ? Number(row.records_seen) : 0,
      records_matched: Number.isFinite(Number(row.records_matched)) ? Number(row.records_matched) : 0,
      error_message: cleanText(row.error_message),
    }]);
  } catch (error) {
    console.warn(`Unable to record GHL sync run: ${error.message}`);
  }
}

const STAGE_LABEL_FALLBACK = {
  reunion_agendada_oficina: "Reunion Agendada Oficina",
  reunion_agendada_celular: "Reunion Agendada Celular",
  reunion_para_showing: "Reunion Para Showing",
  no_show: "No Show",
  contactado_con_tarea: "Contactado Con Tarea",
  en_proceso_aprobacion: "En Proceso De Aprobacion",
  lead_potencial: "Lead Potencial",
  closed: "Closed",
  not_interested: "Not Interested",
  did_not_approve_mortgage_loan: "Did Not Approve Mortgage Loan",
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow Up",
  proposal: "Proposal",
  lost: "Lost",
};

function requiredText(value, label) {
  const text = cleanText(value);
  if (!text) throw Object.assign(new Error(`${label} is required.`), { status: 400 });
  return text;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function hashText(value) {
  let hash = 0;
  const text = cleanText(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function cleanDate(value) {
  const text = cleanText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function cleanDateTime(value) {
  const text = cleanText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function previousLocalDate() {
  const today = localDateParts(new Date());
  const utcNoon = new Date(Date.UTC(today.year, today.month - 1, today.day, 12));
  utcNoon.setUTCDate(utcNoon.getUTCDate() - 1);
  return localDateString(utcNoon);
}

function localDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function localDateString(date) {
  const parts = localDateParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function formatReportDate(dateText) {
  const date = new Date(`${dateText}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function compareDatesDesc(a, b) {
  return new Date(cleanDateTime(b) || 0).getTime() - new Date(cleanDateTime(a) || 0).getTime();
}

function compactSummaryText(value, maxLength = 145) {
  const text = htmlToText(value)
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function plural(count) {
  return count === 1 ? "" : "s";
}

function normalizedName(value) {
  return normalizeForMatch(value)
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForMatch(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function htmlToText(value) {
  return cleanText(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanMoney(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 100) / 100;
}

function oneOf(value, allowed, label) {
  const text = cleanText(value);
  if (!allowed.includes(text)) {
    throw Object.assign(new Error(`${label} is invalid.`), { status: 400 });
  }
  return text;
}
