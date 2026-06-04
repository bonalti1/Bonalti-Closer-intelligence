const syncUrl = process.env.CRM_SYNC_URL || process.env.GHL_SYNC_URL || "";
const syncSecret = process.env.CRM_SYNC_SECRET || "";

if (!syncUrl) {
  console.error("CRM_SYNC_URL is required. Example: https://bonalti-closer-crm.onrender.com/api/ghl/sync");
  process.exit(1);
}

const headers = syncSecret ? { "x-crm-sync-secret": syncSecret } : {};
const response = await fetch(syncUrl, { method: "POST", headers });
const text = await response.text();
let payload = text;

try {
  payload = text ? JSON.parse(text) : {};
} catch {
  // Keep non-JSON response text for easier Render log debugging.
}

console.log(JSON.stringify({
  ok: response.ok,
  status: response.status,
  syncUrl: syncUrl.replace(/\/api\/ghl\/sync$/, "/api/ghl/sync"),
  payload,
}, null, 2));

if (!response.ok || payload?.ok === false) {
  process.exit(1);
}
