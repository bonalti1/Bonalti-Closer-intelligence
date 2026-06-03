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
};

const companies = [
  { id: "00000000-0000-0000-0000-000000000001", name: "South Texas Builders", slug: "south", brand_color: "#172b62", active: true },
  { id: "00000000-0000-0000-0000-000000000002", name: "Cuates Construction", slug: "cuates", brand_color: "#d98646", active: true },
];

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
      const [companyRows, meetingRows, pipelineResult, notesResult, ghlResult, ghlRunsResult] = await Promise.all([
        supabaseSelectAll("companies", "id,slug,name,brand_color,active"),
        supabaseSelectAll("meetings", "*", { order: "meeting_date.desc,created_at.desc" }),
        safeSelect("closer_pipeline", "*", { order: "updated_at.desc" }),
        safeSelect("meeting_notes", "*", { order: "created_at.desc" }),
        safeSelect("ghl_lead_snapshots", "*", { order: "updated_at.desc" }),
        safeSelect("ghl_sync_runs", "*", { order: "started_at.desc" }),
      ]);
      const meetings = meetingRows.filter(isCrmMeeting);
      const meetingIds = new Set(meetings.map((meeting) => meeting.id));

      const setupRequired = !pipelineResult.ok || !notesResult.ok || !ghlResult.ok || !ghlRunsResult.ok;
      return sendJson(res, {
        setupRequired,
        setupError: setupRequired ? "Run supabase/closer_crm_schema.sql in Supabase to enable pipeline, notes, and GHL sync tables." : "",
        companies: companyRows.filter((company) => company.active !== false),
        meetings,
        pipeline: pipelineResult.rows.filter((row) => meetingIds.has(row.meeting_id)),
        notes: notesResult.rows.filter((row) => meetingIds.has(row.meeting_id)),
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
      await supabaseUpdate("meetings", { status }, { id });
      return sendJson(res, { ok: true });
    }

    if (url.pathname === "/api/notes" && req.method === "POST") {
      const body = await readJson(req);
      const note = {
        meeting_id: requiredText(body.meeting_id, "Meeting ID"),
        company_id: requiredText(body.company_id, "Company ID"),
        note_text: requiredText(body.note_text, "Note"),
        note_type: oneOf(body.note_type || "closer", ["setter", "closer", "follow_up", "status"], "Note type"),
        created_by_name: cleanText(body.created_by_name),
      };
      await supabaseInsert("meeting_notes", [note]);
      return sendJson(res, { ok: true });
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
  const meeting = matchOpportunityToMeeting(opportunity, meetings);
  if (!meeting) return null;
  const stageName = cleanText(opportunity.pipelineStageName || opportunity.pipeline_stage_name || opportunity.stageName || opportunity.stage_name);
  const status = cleanText(opportunity.status || opportunity.opportunityStatus || opportunity.opportunity_status || "open");

  return sanitizeGhlSnapshot({
    meeting_id: meeting.id,
    company_id: meeting.company_id,
    ghl_contact_id: opportunity.contactId || opportunity.contact_id || opportunity.contact?.id,
    ghl_opportunity_id: opportunity.id || opportunity.opportunityId || opportunity.opportunity_id,
    pipeline_stage: mapGhlStage(stageName || opportunity.pipelineStageId || opportunity.pipeline_stage_id, status),
    pipeline_stage_name: stageName,
    opportunity_status: mapGhlStatus(status),
    opportunity_value: opportunity.monetaryValue || opportunity.value || opportunity.opportunityValue,
    assigned_to_name: opportunity.assignedToName || opportunity.assigned_to_name || opportunity.assignedTo || opportunity.ownerName,
    follow_up_date: opportunity.followUpDate || opportunity.follow_up_date,
    last_activity_at: opportunity.updatedAt || opportunity.updated_at || opportunity.lastStatusChangeAt || opportunity.lastStageChangeAt,
    last_note: latestGhlNote(opportunity),
    raw_payload: opportunity,
  });
}

function matchOpportunityToMeeting(opportunity, meetings) {
  const name = normalizedName(opportunity.name || opportunity.fullName || opportunity.contactName || opportunity.contact?.name);
  if (!name) return null;

  const exact = meetings.find((meeting) => normalizedName(meeting.client_name) === name);
  if (exact) return exact;

  return meetings.find((meeting) => {
    const meetingName = normalizedName(meeting.client_name);
    return meetingName && (meetingName.includes(name) || name.includes(meetingName));
  }) || null;
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

function compactGhlSnapshot(row) {
  return {
    id: row.id,
    meeting_id: row.meeting_id,
    company_id: row.company_id,
    ghl_contact_id: row.ghl_contact_id,
    ghl_opportunity_id: row.ghl_opportunity_id,
    pipeline_stage: row.pipeline_stage,
    pipeline_stage_name: row.pipeline_stage_name,
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
    pipeline_stage: stage,
    pipeline_stage_name: cleanText(body.pipeline_stage_name || body.stage_name || STAGE_LABEL_FALLBACK[stage]),
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
