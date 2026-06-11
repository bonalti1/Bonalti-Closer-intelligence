const reportUrl = process.env.DAILY_REPORT_URL || "http://127.0.0.1:4284/api/reports/daily-construction";
const secret = process.env.CRM_SYNC_SECRET || "";

const response = await fetch(reportUrl, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    ...(secret ? { "x-crm-sync-secret": secret } : {}),
  },
});

const text = await response.text();
if (!response.ok) {
  throw new Error(`Daily construction report failed (${response.status}): ${text}`);
}

console.log(text);
