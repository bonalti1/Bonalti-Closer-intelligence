const COMPANY_IDS = {
  south: "00000000-0000-0000-0000-000000000001",
  cuates: "00000000-0000-0000-0000-000000000002",
  lending: "lending",
};

const COMPANY_META = {
  [COMPANY_IDS.south]: {
    slug: "south",
    name: "South Texas Builders",
    shortName: "South Texas",
    logo: "/assets/south-texas-builders-logo.png",
  },
  [COMPANY_IDS.cuates]: {
    slug: "cuates",
    name: "Cuates Construction",
    shortName: "Cuates",
    logo: "/assets/cuates-construction-logo.png",
  },
  [COMPANY_IDS.lending]: {
    slug: "lending",
    name: "Bonalti Lending",
    shortName: "Bonalti Lending",
    logo: "/assets/bonalti-logo.png",
  },
};

const PIPELINE_STAGES = [
  ["reunion_agendada_oficina", "Reunion Agendada Oficina"],
  ["reunion_agendada_celular", "Reunion Agendada Celular"],
  ["reunion_para_showing", "Reunion Para Showing"],
  ["no_show", "No Show"],
  ["contactado_con_tarea", "Contactado Con Tarea"],
  ["en_proceso_aprobacion", "En Proceso De Aprobacion"],
  ["lead_potencial", "Lead Potencial"],
  ["closed", "Closed"],
  ["not_interested", "Not Interested"],
  ["did_not_approve_mortgage_loan", "Did Not Approve Mortgage Loan"],
];

const STAGE_LABELS = Object.fromEntries(PIPELINE_STAGES);

const CONSTRUCTION_FUNNEL = [
  ["scheduled", "Scheduled Meeting"],
  ["noShow", "No Show"],
  ["attended", "Attended"],
  ["notInterested", "Not Interested"],
  ["needFollowUp", "Need Follow Up"],
  ["highlyInterested", "Highly Interested"],
  ["closed", "Closed"],
];

const LENDING_FUNNEL = [
  ["scheduled", "Scheduled Meeting"],
  ["noShow", "No Show"],
  ["attended", "Attended"],
  ["notQualified", "Not Qualified"],
  ["needFollowUp", "Need Follow Up"],
  ["qualified", "Approved"],
  ["closed", "Closed"],
];

const STATUS_LABELS = {
  agendada: "Agendada",
  atendida: "Atendida",
  no_show: "No show",
  reagendo: "Reagendo",
  descalificado: "Descalificado",
  cerrado: "Cerrado",
  pending: "Pending",
  closed: "Closed",
  lost: "Lost",
};

let state = {
  companies: [],
  meetings: [],
  pipeline: [],
  notes: [],
  activities: [],
  ghl: {
    configured: false,
    snapshots: [],
    syncRuns: [],
  },
};

let activeSection = "dashboard";
let selectedMeetingId = "";
let workingDate = startOfToday();
let selectedWeek = salesWeekForDate(workingDate).week;

const elements = {
  workingDayLabel: document.querySelector("#workingDayLabel"),
  previousDay: document.querySelector("#previousDay"),
  nextDay: document.querySelector("#nextDay"),
  todayButton: document.querySelector("#todayButton"),
  refreshButton: document.querySelector("#refreshButton"),
  rangePanel: document.querySelector(".range-panel"),
  fromDate: document.querySelector("#fromDate"),
  toDate: document.querySelector("#toDate"),
  rangeLabel: document.querySelector("#rangeLabel"),
  ghlStatusPill: document.querySelector("#ghlStatusPill"),
  ghlSyncButton: document.querySelector("#ghlSyncButton"),
  searchFilter: document.querySelector("#searchFilter"),
  companyFilter: document.querySelector("#companyFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  periodFilter: document.querySelector("#periodFilter"),
  weekFilter: document.querySelector("#weekFilter"),
  weekLabel: document.querySelector("#weekLabel"),
  companyNav: document.querySelector("#companyNav"),
  departmentHeadline: document.querySelector("#departmentHeadline"),
  headerCompanyLogo: document.querySelector("#headerCompanyLogo"),
  headerSubtitle: document.querySelector("#headerSubtitle"),
  sideSync: document.querySelector("#sideSync"),
  southCount: document.querySelector("#southCount"),
  cuatesCount: document.querySelector("#cuatesCount"),
  lendingCount: document.querySelector("#lendingCount"),
  metricsGrid: document.querySelector("#metricsGrid"),
  contentArea: document.querySelector("#contentArea"),
  setupNotice: document.querySelector("#setupNotice"),
  cloudPill: document.querySelector("#cloudPill"),
  drawer: document.querySelector("#detailDrawer"),
  drawerBackdrop: document.querySelector("#drawerBackdrop"),
  closeDrawer: document.querySelector("#closeDrawer"),
  drawerMeta: document.querySelector("#drawerMeta"),
  drawerTitle: document.querySelector("#drawerTitle"),
  drawerStatusRow: document.querySelector("#drawerStatusRow"),
  setterNotes: document.querySelector("#setterNotes"),
  pipelineForm: document.querySelector("#pipelineForm"),
  noteForm: document.querySelector("#noteForm"),
  saveState: document.querySelector("#saveState"),
  noteState: document.querySelector("#noteState"),
  notesList: document.querySelector("#notesList"),
};

populateWeekFilter();
document.addEventListener("click", handleDocumentClick);
elements.previousDay?.addEventListener("click", () => shiftWorkingDate(-1));
elements.nextDay?.addEventListener("click", () => shiftWorkingDate(1));
elements.todayButton.addEventListener("click", () => {
  elements.periodFilter.value = "selectedMonth";
  render();
});
elements.refreshButton.addEventListener("click", () => loadState({ manual: true }));
elements.ghlSyncButton?.addEventListener("click", syncGhl);
elements.closeDrawer.addEventListener("click", closeDrawer);
elements.drawerBackdrop.addEventListener("click", closeDrawer);
elements.pipelineForm.addEventListener("submit", savePipeline);
elements.noteForm.addEventListener("submit", saveNote);
elements.pipelineForm.elements.meeting_status.addEventListener("change", saveMeetingStatus);
elements.weekFilter.addEventListener("input", () => {
  selectedWeek = Number(elements.weekFilter.value);
  elements.periodFilter.value = "salesWeek";
  render();
});
["searchFilter", "companyFilter", "typeFilter", "periodFilter"].forEach((key) => {
  elements[key].addEventListener("input", render);
});

await loadState();
setInterval(loadState, 5000);

async function loadState(options = {}) {
  try {
    const response = await fetch("/api/state");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load dashboard state.");
    state = payload;
    elements.setupNotice.hidden = !payload.setupRequired;
    elements.cloudPill.textContent = `${options.manual ? "Refreshed" : "Cloud synced"} ${formatTime(new Date())}`;
    elements.cloudPill.classList.remove("error");
    render();
    if (selectedMeetingId) renderDrawer(selectedMeetingId);
  } catch (error) {
    elements.cloudPill.textContent = error.message;
    elements.cloudPill.classList.add("error");
  }
}

async function syncGhl() {
  if (!elements.ghlSyncButton) return;
  elements.ghlSyncButton.disabled = true;
  elements.ghlSyncButton.textContent = "Syncing...";
  try {
    const result = await postJson("/api/ghl/sync", {});
    elements.ghlStatusPill.textContent = `GHL: ${result.recordsMatched || 0} matched`;
    await loadState({ manual: true });
  } catch (error) {
    elements.ghlStatusPill.textContent = `GHL: ${error.message}`;
  } finally {
    elements.ghlSyncButton.disabled = false;
    elements.ghlSyncButton.textContent = "Sync GHL";
  }
}

function render() {
  if (elements.workingDayLabel) elements.workingDayLabel.textContent = formatHeaderDate(workingDate);
  if (elements.fromDate && !elements.fromDate.value) elements.fromDate.value = isoDate(firstDayOfMonth(workingDate));
  if (elements.toDate && !elements.toDate.value) elements.toDate.value = isoDate(workingDate);
  elements.rangeLabel.textContent = formatDateRangeLabel();
  elements.weekLabel.textContent = formatSalesWeekLabel(selectedWeek);
  syncRangePanel();
  syncGhlStatus();
  syncActiveButtons();
  syncCompanyShell();
  renderCompanyCounts();
  const meetings = filteredMeetings();
  renderMetrics(meetings);

  if (activeSection === "dashboard") renderDashboard(meetings);
  if (activeSection === "pipeline") renderPipeline(meetings);
  if (activeSection === "reports") renderReports(meetings);
}

function syncRangePanel() {
  elements.rangePanel.classList.toggle("show-week", elements.periodFilter.value === "salesWeek");
  elements.rangePanel.classList.toggle("show-custom", elements.periodFilter.value === "all");
}

function filteredMeetings() {
  const companyId = elements.companyFilter.value;
  const forcedType = companyId === COMPANY_IDS.lending ? "lender" : "construction";
  const search = elements.searchFilter.value.trim().toLowerCase();
  const period = elements.periodFilter.value;

  return state.meetings.filter((meeting) => {
    const pipeline = pipelineFor(meeting.id);
    const notes = notesFor(meeting.id).map((note) => note.note_text).join(" ");
    const activities = activitiesFor(meeting.id).map((activity) => activity.activity_text).join(" ");
    const text = [
      meeting.client_name,
      meeting.notes,
      meeting.meeting_type,
      meeting.status,
      pipeline.closer_name,
      pipeline.lost_reason,
      pipeline.closer_notes,
      ghlFor(meeting.id).pipeline_stage_name,
      ghlFor(meeting.id).assigned_to_name,
      ghlFor(meeting.id).last_note,
      notes,
      activities,
      COMPANY_META[meeting.company_id]?.name,
      STAGE_LABELS[displayStage(meeting)],
    ].join(" ").toLowerCase();

    if (meeting.meeting_type !== forcedType) return false;
    if (companyId !== COMPANY_IDS.lending && meeting.company_id !== companyId) return false;
    if (search && !text.includes(search)) return false;
    if (!matchesPeriod(meeting, period)) return false;
    return true;
  });
}

function matchesPeriod(meeting, period) {
  const meetingDate = dateValue(meeting.meeting_date);
  if (!meetingDate) return false;
  if (period === "all") {
    const from = dateValue(elements.fromDate.value || isoDate(firstDayOfMonth(workingDate)));
    const to = dateValue(elements.toDate.value || isoDate(workingDate));
    return meetingDate >= from && meetingDate <= to;
  }
  if (period === "today") return isSameDay(meetingDate, workingDate);
  if (period === "recent30") return meetingDate >= addDays(workingDate, -30) && meetingDate <= addDays(workingDate, 1);
  if (period === "salesWeek") {
    const range = salesWeekRange(workingDate.getFullYear(), selectedWeek);
    return meetingDate >= range.start && meetingDate <= range.end;
  }
  if (period === "lastMonth") {
    const lastMonth = new Date(workingDate.getFullYear(), workingDate.getMonth() - 1, 1, 12);
    return meetingDate.getFullYear() === lastMonth.getFullYear() && meetingDate.getMonth() === lastMonth.getMonth();
  }
  if (period === "thisYear") return meetingDate.getFullYear() === workingDate.getFullYear();
  if (period === "lastYear") return meetingDate.getFullYear() === workingDate.getFullYear() - 1;
  return meetingDate.getFullYear() === workingDate.getFullYear() && meetingDate.getMonth() === workingDate.getMonth();
}

function renderMetrics(meetings) {
  const isLending = elements.companyFilter.value === COMPANY_IDS.lending;
  const attended = meetings.filter((meeting) => meeting.status === "atendida" || meeting.status === "cerrado").length;
  const noShows = meetings.filter((meeting) => meeting.status === "no_show" || displayStage(meeting) === "no_show").length;
  const potential = meetings.filter((meeting) => displayStage(meeting) === "lead_potencial").length;
  const closed = meetings.filter((meeting) => effectiveCloserStatus(meeting) === "closed").length;
  const needsFollowUp = meetings.filter(isNeedFollowUp).length;
  const notInterested = meetings.filter((meeting) => displayStage(meeting) === "not_interested").length;
  const notQualified = meetings.filter((meeting) => displayStage(meeting) === "did_not_approve_mortgage_loan").length;

  const metrics = isLending
    ? [
        ["Mortgage meetings", meetings.length, "neutral"],
        ["No-shows", noShows, "neutral"],
        ["Attended", attended, "neutral"],
        ["Not qualified", notQualified, "neutral"],
        ["Need follow up", needsFollowUp, "neutral"],
        ["Approved", potential, "approved"],
        ["Closed", closed, "closed"],
      ]
    : [
        ["Construction meetings", meetings.length, "neutral"],
        ["No-shows", noShows, "neutral"],
        ["Attended", attended, "neutral"],
        ["Not interested", notInterested, "neutral"],
        ["Need follow up", needsFollowUp, "neutral"],
        ["Highly interested", potential, "neutral"],
        ["Closed", closed, "closed"],
      ];

  elements.metricsGrid.innerHTML = metrics.map(([label, value, tone]) => `
    <div class="metric ${tone}">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `).join("");
}

function renderDashboard(meetings) {
  const isLending = elements.companyFilter.value === COMPANY_IDS.lending;
  const funnel = isLending ? LENDING_FUNNEL : CONSTRUCTION_FUNNEL;
  const totals = stageTotals(meetings, isLending);
  const currentStageTotals = funnelStageTotals(meetings, isLending);

  elements.contentArea.innerHTML = `
    <section class="movement-card">
      <div class="movement-head">
        <div>
          <p>What changed</p>
          <h2>Performance Movement</h2>
        </div>
        <span>${escapeHtml(formatDateRangeLabel())}</span>
      </div>
      <div class="movement-grid">
        ${renderMovementItem(isLending ? "Mortgage meetings" : "Construction meetings", meetings.length, "Synced from Supabase")}
        ${renderMovementItem("Attended", totals.attended, "Meeting outcome")}
        ${renderMovementItem("No-shows", totals.noShows, "Review follow-up list")}
        ${renderMovementItem(isLending ? "Approved" : "Highly Interested", isLending ? totals.qualified : totals.highlyInterested, "Closer status")}
        ${renderMovementItem("Need follow up", totals.needFollowUp, "Next-step list")}
      </div>
    </section>

    <section class="two-column">
      <div class="command-card">
        <div class="section-head">
          <div>
            <p>Funnel</p>
            <h2>Conversion Summary</h2>
          </div>
        </div>
        <div class="funnel-stack">
          ${renderFunnelRow(isLending ? "Total Mortgage Meetings" : "Total Construction Meetings", meetings.length, meetings.length, "base")}
          ${funnel.map(([key, label]) => renderFunnelRow(label, currentStageTotals[key], meetings.length, ["qualified", "closed"].includes(key) ? "green" : "gradient")).join("")}
        </div>
      </div>

      <div class="command-card">
        <div class="section-head">
          <div>
            <p>Clients</p>
            <h2>${isLending ? "Mortgage Clients" : "Construction Clients"}</h2>
          </div>
          <span>${meetings.length} shown</span>
        </div>
        <div class="status-list">
          ${renderStatusGroups(meetings)}
        </div>
      </div>
    </section>
  `;
}

function renderMovementItem(label, value, note) {
  return `
    <div class="movement-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </div>
  `;
}

function renderFunnelRow(label, value, base, tone) {
  const percent = tone === "base" ? 100 : base ? Math.round((value / base) * 100) : 0;
  return `
    <div class="funnel-row ${tone}">
      <div>
        <strong>${escapeHtml(label)}</strong>
        <span>${percent}%</span>
      </div>
      <b>${escapeHtml(value)}</b>
    </div>
  `;
}

function renderStatusGroups(meetings) {
  const isLending = elements.companyFilter.value === COMPANY_IDS.lending;
  const groups = (isLending ? LENDING_FUNNEL : CONSTRUCTION_FUNNEL)
    .map(([key, label]) => [key, label, meetings.filter((meeting) => meetingOutcomeKey(meeting, isLending) === key)])
    .filter(([, , rows]) => rows.length);

  if (!groups.length) return '<div class="empty-state">No leads found for this date range.</div>';

  return groups.map(([stage, label, rows]) => `
    <div class="status-group ${stage}">
      <div class="status-group-head">
        <strong>${escapeHtml(label)}</strong>
        <span>${rows.length}</span>
      </div>
      ${rows.slice(0, 8).map(renderStatusLead).join("")}
      ${rows.length > 8 ? `<div class="more-count">${rows.length - 8} more</div>` : ""}
    </div>
  `).join("");
}

function renderStatusLead(meeting) {
  const pipeline = pipelineFor(meeting.id);
  const ghl = ghlFor(meeting.id);
  const isLending = elements.companyFilter.value === COMPANY_IDS.lending;
  const step = outcomeLabel(meeting, isLending);
  const owner = ghl.assigned_to_name || pipeline.closer_name || "Unassigned";
  const note = ghl.last_note || pipeline.closer_notes || pipeline.lost_reason || meeting.notes || "No note yet";
  return `
    <button class="status-lead" type="button" data-meeting-id="${meeting.id}">
      <strong>${escapeHtml(meeting.client_name)}</strong>
      <span>${escapeHtml(formatShortDate(meeting.meeting_date))} · ${escapeHtml(step)} · ${escapeHtml(owner)}</span>
      <small>${escapeHtml(note)}</small>
    </button>
  `;
}

function renderPipeline(meetings) {
  elements.contentArea.innerHTML = `
    <section class="pipeline-board">
      ${PIPELINE_STAGES.map(([stage, label]) => {
        const rows = meetings.filter((meeting) => displayStage(meeting) === stage).slice(0, 20);
        const total = meetings.filter((meeting) => displayStage(meeting) === stage).length;
        return `
          <div class="pipeline-column ${stage}">
            <div class="pipeline-head">
              <strong>${escapeHtml(label)}</strong>
              <span>${total} opportunities</span>
            </div>
            <div class="lead-cards">
              ${rows.map(renderLeadCard).join("") || '<div class="empty-column">No leads</div>'}
              ${total > rows.length ? `<div class="more-count">${total - rows.length} more</div>` : ""}
            </div>
          </div>
        `;
      }).join("")}
    </section>
  `;
}

function renderReports(meetings) {
  const selectedCompanyId = elements.companyFilter.value;
  const isLending = selectedCompanyId === COMPANY_IDS.lending;
  const companyId = isLending ? COMPANY_IDS.south : selectedCompanyId;
  const company = COMPANY_META[selectedCompanyId] || COMPANY_META[companyId];
  const reportRows = elements.companyFilter.value === COMPANY_IDS.lending
    ? meetings.filter((meeting) => meeting.meeting_type === "lender")
    : meetings.filter((meeting) => meeting.company_id === companyId && meeting.meeting_type === "construction");
  const totals = stageTotals(reportRows, isLending);
  const attended = totals.attended || 0;
  const closed = totals.closed || 0;
  const noShows = totals.noShows || 0;
  const followUps = reportRows.filter(isFollowUpDue);
  const missingNotes = reportRows.filter(hasMissingCloserNote);
  const noRecentTouch = reportRows.filter((meeting) => !lastActivityFor(meeting.id) && !notesFor(meeting.id).length && !meeting.notes);
  const closeRate = percent(closed, attended || reportRows.length);
  const showRate = percent(attended, reportRows.length);
  const noShowRate = percent(noShows, reportRows.length);
  const reportTitle = isLending ? "Lending Sales Report" : "Construction Sales Report";

  elements.contentArea.innerHTML = `
    <section class="report-page">
      <div class="report-title">
        <div>
          <h2>${escapeHtml(reportTitle)}</h2>
          <p>${escapeHtml(formatDateRangeLabel())} · ${escapeHtml(company.name)}</p>
        </div>
        <strong>${reportRows.length} meetings</strong>
      </div>

      <div class="report-stats">
        <div><strong>${reportRows.length}</strong><span>Total meetings</span></div>
        <div><strong>${attended}</strong><span>Attended</span></div>
        <div><strong>${closed}</strong><span>Closed</span></div>
        <div><strong>${closeRate}</strong><span>Close rate</span></div>
        <div><strong>${noShowRate}</strong><span>No-show rate</span></div>
        <div><strong>${isLending ? totals.qualified : totals.highlyInterested}</strong><span>${isLending ? "Approved" : "Highly interested"}</span></div>
        <div><strong>${totals.needFollowUp}</strong><span>Need follow up</span></div>
        <div><strong>${missingNotes.length}</strong><span>Missing notes</span></div>
        <div><strong>${followUps.length}</strong><span>Due follow-ups</span></div>
        <div><strong>${showRate}</strong><span>Show rate</span></div>
      </div>

      <div class="report-insights">
        ${renderReportInsight("Follow-up list", followUps, "No follow-ups due.")}
        ${renderReportInsight("Missing closer notes", missingNotes, "Every reviewed lead has notes.")}
        ${renderReportInsight("No activity captured", noRecentTouch, "Every lead has at least one note or activity.")}
      </div>

      <div class="report-section-title">
        <div>
          <p>Client Detail</p>
          <h3>Meeting Outcomes</h3>
        </div>
        <span>${reportRows.length} rows</span>
      </div>

      <div class="report-table">
        <div class="report-head">
          <span>Client</span>
          <span>Date</span>
          <span>Outcome</span>
          <span>Last touch</span>
          <span>Notes / next step</span>
        </div>
        ${reportRows.slice(0, 80).map((meeting) => renderReportRow(meeting, isLending)).join("") || '<div class="empty-state">No meetings for this report period.</div>'}
      </div>
    </section>
  `;
}

function renderReportInsight(title, rows, emptyText) {
  return `
    <div class="report-insight">
      <div class="report-insight-head">
        <strong>${escapeHtml(title)}</strong>
        <span>${rows.length}</span>
      </div>
      <div class="report-insight-list">
        ${rows.slice(0, 5).map((meeting) => {
          const activity = lastActivityFor(meeting.id);
          return `
            <button type="button" data-meeting-id="${meeting.id}">
              <strong>${escapeHtml(meeting.client_name)}</strong>
              <span>${escapeHtml(formatShortDate(meeting.meeting_date))} · ${escapeHtml(outcomeLabel(meeting, elements.companyFilter.value === COMPANY_IDS.lending))}</span>
              <small>${escapeHtml(activity ? `Last touch ${formatShortDate(activity.activity_at)}` : "No imported activity")}</small>
            </button>
          `;
        }).join("") || `<div class="empty-state">${escapeHtml(emptyText)}</div>`}
      </div>
    </div>
  `;
}

function renderAttentionItem(meeting) {
  const pipeline = pipelineFor(meeting.id);
  const reason = hasMissingCloserNote(meeting)
    ? "Missing closer note"
    : isFollowUpDue(meeting)
      ? "Follow-up due"
      : displayStage(meeting) === "no_show"
        ? "No-show needs action"
        : "Needs review";

  return `
    <button class="attention-item" type="button" data-meeting-id="${meeting.id}">
      <strong>${escapeHtml(meeting.client_name)}</strong>
      <span>${escapeHtml(reason)}</span>
      <small>${escapeHtml(COMPANY_META[meeting.company_id]?.shortName || "Company")} · ${escapeHtml(formatShortDate(meeting.meeting_date))} · ${escapeHtml(pipeline.closer_name || "Unassigned")}</small>
    </button>
  `;
}

function renderSnapshotStage(stage, label, meetings) {
  const count = meetings.filter((meeting) => displayStage(meeting) === stage).length;
  return `
    <div class="snapshot-stage ${stage}">
      <strong>${count}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function renderActivityItem(meeting) {
  const stage = displayStage(meeting);
  return `
    <button class="activity-item" type="button" data-meeting-id="${meeting.id}">
      <span class="company-dot ${COMPANY_META[meeting.company_id]?.slug || ""}"></span>
      <div>
        <strong>${escapeHtml(meeting.client_name)}</strong>
        <span>${escapeHtml(STAGE_LABELS[stage])} · ${escapeHtml(formatShortDate(meeting.meeting_date))}</span>
      </div>
    </button>
  `;
}

function renderLeadCard(meeting) {
  const pipeline = pipelineFor(meeting.id);
  const ghl = ghlFor(meeting.id);
  const activity = lastActivityFor(meeting.id);
  const notesCount = notesFor(meeting.id).length + activitiesFor(meeting.id).length + (meeting.notes ? 1 : 0);
  return `
    <button class="lead-card" type="button" data-meeting-id="${meeting.id}">
      <div class="lead-topline">
        <strong>${escapeHtml(meeting.client_name)}</strong>
        <span>${escapeHtml(initials(pipeline.closer_name || "CG"))}</span>
      </div>
      <div class="tag-row">
        <span>${escapeHtml(STATUS_LABELS[meeting.status] || meeting.status)}</span>
        <span>${escapeHtml(titleCase(meeting.meeting_type))}</span>
      </div>
      <dl>
        <dt>Fecha de la cita</dt>
        <dd>${escapeHtml(formatShortDate(meeting.meeting_date))}</dd>
        <dt>Closer</dt>
        <dd>${escapeHtml(ghl.assigned_to_name || pipeline.closer_name || "Unassigned")}</dd>
        <dt>Notas</dt>
        <dd>${notesCount}</dd>
        <dt>Last touch</dt>
        <dd>${escapeHtml(activity ? formatShortDate(activity.activity_at) : "None")}</dd>
      </dl>
    </button>
  `;
}

function renderReportRow(meeting, isLending) {
  const pipeline = pipelineFor(meeting.id);
  const activity = lastActivityFor(meeting.id);
  const note = pipeline.closer_notes || activity?.activity_text || meeting.notes || pipeline.lost_reason || "No note captured yet.";
  return `
    <button class="report-row" type="button" data-meeting-id="${meeting.id}">
      <strong>${escapeHtml(meeting.client_name)}</strong>
      <span>${escapeHtml(formatShortDate(meeting.meeting_date))}</span>
      <span>${escapeHtml(outcomeLabel(meeting, isLending))}</span>
      <span>${escapeHtml(activity ? formatDateTime(activity.activity_at) : "No activity")}</span>
      <span>${escapeHtml(note)}</span>
    </button>
  `;
}

function handleDocumentClick(event) {
  const companyButton = event.target.closest("[data-company-select]");
  if (companyButton) {
    elements.companyFilter.value = companyButton.dataset.companySelect;
    elements.typeFilter.value = companyButton.dataset.companySelect === COMPANY_IDS.lending ? "lender" : "construction";
    render();
    return;
  }

  const sectionButton = event.target.closest("[data-section]");
  if (sectionButton) {
    activeSection = sectionButton.dataset.section;
    render();
    return;
  }

  const periodButton = event.target.closest("[data-period-button]");
  if (periodButton) {
    elements.periodFilter.value = periodButton.dataset.periodButton;
    if (periodButton.dataset.periodButton === "salesWeek") {
      selectedWeek = Number(elements.weekFilter.value);
    }
    render();
    return;
  }

  const row = event.target.closest("[data-meeting-id]");
  if (row) openDrawer(row.dataset.meetingId);
}

function openDrawer(meetingId) {
  selectedMeetingId = meetingId;
  renderDrawer(meetingId);
  elements.drawer.classList.add("open");
  elements.drawer.setAttribute("aria-hidden", "false");
  elements.drawerBackdrop.hidden = false;
}

function closeDrawer() {
  selectedMeetingId = "";
  elements.drawer.classList.remove("open");
  elements.drawer.setAttribute("aria-hidden", "true");
  elements.drawerBackdrop.hidden = true;
}

function renderDrawer(meetingId) {
  const meeting = state.meetings.find((row) => row.id === meetingId);
  if (!meeting) return closeDrawer();

  const pipeline = pipelineFor(meeting.id);
  const company = COMPANY_META[meeting.company_id];
  const stage = displayStage(meeting);
  const noteRows = notesFor(meeting.id);
  const activityRows = activitiesFor(meeting.id);
  const lastActivity = lastActivityFor(meeting.id);
  const ghl = ghlFor(meeting.id);

  elements.drawerMeta.textContent = `${formatDate(meeting.meeting_date)} · ${company?.name || "Company"} · ${titleCase(meeting.meeting_type)}`;
  elements.drawerTitle.textContent = meeting.client_name;
  elements.drawerStatusRow.innerHTML = `
    <span class="company-chip ${company?.slug || ""}">${escapeHtml(company?.shortName || "Company")}</span>
    <span class="status-pill">${escapeHtml(STAGE_LABELS[stage])}</span>
    <span class="status-pill ${effectiveCloserStatus(meeting)}">${escapeHtml(STATUS_LABELS[effectiveCloserStatus(meeting)])}</span>
    ${ghl.pipeline_stage ? `<span class="status-pill">GHL synced</span>` : ""}
  `;
  elements.setterNotes.textContent = [
    meeting.notes ? `Setter notes: ${meeting.notes}` : "No setter notes.",
    ghl.last_note ? `GHL note: ${ghl.last_note}` : "",
    lastActivity?.activity_text ? `Last activity: ${lastActivity.activity_text}` : "",
  ].filter(Boolean).join("\n");

  setFormValue(elements.pipelineForm, "meeting_id", meeting.id);
  setFormValue(elements.pipelineForm, "company_id", meeting.company_id);
  setFormValue(elements.pipelineForm, "closer_name", pipeline.closer_name);
  setFormValue(elements.pipelineForm, "pipeline_stage", stage);
  setFormValue(elements.pipelineForm, "closer_status", pipeline.closer_status);
  setFormValue(elements.pipelineForm, "meeting_status", meeting.status);
  setFormValue(elements.pipelineForm, "follow_up_date", pipeline.follow_up_date || "");
  setFormValue(elements.pipelineForm, "closed_date", pipeline.closed_date || "");
  setFormValue(elements.pipelineForm, "deal_value", pipeline.deal_value ?? "");
  setFormValue(elements.pipelineForm, "lost_reason", pipeline.lost_reason);
  setFormValue(elements.pipelineForm, "closer_notes", pipeline.closer_notes);
  setFormValue(elements.noteForm, "meeting_id", meeting.id);
  setFormValue(elements.noteForm, "company_id", meeting.company_id);
  elements.saveState.textContent = "";
  elements.noteState.textContent = "";

  elements.notesList.innerHTML = `
    ${activityRows.length ? `
      <div class="activity-feed-title">GHL / PLAUD activity</div>
      ${activityRows.slice(0, 8).map((activity) => `
        <div class="note-item activity-note ${escapeHtml(activity.activity_source)}">
          <strong>${escapeHtml(activity.closer_name || activity.activity_source.toUpperCase())}</strong>
          <span>${escapeHtml(formatDateTime(activity.activity_at))} · ${escapeHtml(titleCase(activity.activity_source))} · ${escapeHtml(titleCase(activity.activity_type))}</span>
          <div>${escapeHtml(activity.activity_text)}</div>
        </div>
      `).join("")}
    ` : ""}
    ${noteRows.length ? `
      <div class="activity-feed-title">CRM notes</div>
      ${noteRows.map((note) => `
        <div class="note-item">
          <strong>${escapeHtml(note.created_by_name || "Closer")}</strong>
          <span>${escapeHtml(formatDateTime(note.created_at))} · ${escapeHtml(titleCase(note.note_type))}</span>
          <div>${escapeHtml(note.note_text)}</div>
        </div>
      `).join("")}
    ` : ""}
    ${!activityRows.length && !noteRows.length ? '<div class="empty-state">No closer notes yet.</div>' : ""}
  `;
}

async function savePipeline(event) {
  event.preventDefault();
  elements.saveState.textContent = "Saving...";
  try {
    const body = Object.fromEntries(new FormData(elements.pipelineForm));
    await postJson("/api/pipeline", body);
    elements.saveState.textContent = "Saved";
    await loadState();
  } catch (error) {
    elements.saveState.textContent = error.message;
  }
}

async function saveNote(event) {
  event.preventDefault();
  elements.noteState.textContent = "Adding...";
  try {
    const body = Object.fromEntries(new FormData(elements.noteForm));
    await postJson("/api/notes", body);
    elements.noteForm.elements.note_text.value = "";
    elements.noteState.textContent = "Added";
    await loadState();
  } catch (error) {
    elements.noteState.textContent = error.message;
  }
}

async function saveMeetingStatus() {
  elements.saveState.textContent = "Updating meeting...";
  try {
    await patchJson("/api/meeting-status", {
      id: elements.pipelineForm.elements.meeting_id.value,
      status: elements.pipelineForm.elements.meeting_status.value,
    });
    elements.saveState.textContent = "Meeting updated";
    await loadState();
  } catch (error) {
    elements.saveState.textContent = error.message;
  }
}

async function postJson(url, body) {
  return sendJson(url, "POST", body);
}

async function patchJson(url, body) {
  return sendJson(url, "PATCH", body);
}

async function sendJson(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Save failed.");
  return payload;
}

function attentionItems(meetings) {
  return meetings
    .filter((meeting) => hasMissingCloserNote(meeting) || isFollowUpDue(meeting) || displayStage(meeting) === "no_show")
    .slice(0, 12);
}

function hasMissingCloserNote(meeting) {
  const pipeline = pipelineFor(meeting.id);
  return !pipeline.closer_notes && notesFor(meeting.id).length === 0 && meeting.status !== "agendada";
}

function isFollowUpDue(meeting) {
  if (effectiveCloserStatus(meeting) !== "pending") return false;
  const followUp = dateValue(pipelineFor(meeting.id).follow_up_date);
  return Boolean(followUp && followUp <= addDays(workingDate, 1));
}

function displayStage(meeting) {
  const pipeline = pipelineFor(meeting.id);
  const ghl = ghlFor(meeting.id);
  if (PIPELINE_STAGES.some(([stage]) => stage === ghl.pipeline_stage)) return ghl.pipeline_stage;
  if (PIPELINE_STAGES.some(([stage]) => stage === pipeline.pipeline_stage)) return pipeline.pipeline_stage;
  if (meeting.status === "cerrado" || pipeline.closer_status === "closed") return "closed";
  if (meeting.status === "no_show") return "no_show";
  if (meeting.status === "descalificado" || pipeline.closer_status === "lost") return "did_not_approve_mortgage_loan";
  if (pipeline.pipeline_stage === "contacted" || pipeline.pipeline_stage === "follow_up") return "contactado_con_tarea";
  if (pipeline.pipeline_stage === "proposal") return "en_proceso_aprobacion";
  if (meeting.status === "atendida") return "contactado_con_tarea";
  return meeting.meeting_type === "construction" ? "reunion_para_showing" : "reunion_agendada_celular";
}

function reportStatus(meeting) {
  const stage = displayStage(meeting);
  if (stage === "lead_potencial") return "Alto potencial";
  if (stage === "en_proceso_aprobacion") return "En proceso";
  if (stage === "did_not_approve_mortgage_loan") return "No califica";
  if (stage === "not_interested") return "No interesado";
  if (stage === "contactado_con_tarea") return "Pendiente";
  if (!meeting.notes && !pipelineFor(meeting.id).closer_notes) return "Sin nota";
  return "Evaluar";
}

function effectiveCloserStatus(meeting) {
  const pipeline = pipelineFor(meeting.id);
  const ghl = ghlFor(meeting.id);
  if (ghl.opportunity_status === "won") return "closed";
  if (["lost", "abandoned"].includes(ghl.opportunity_status)) return "lost";
  if (pipeline.closer_status === "closed" || meeting.status === "cerrado") return "closed";
  if (pipeline.closer_status === "lost" || ["not_interested", "did_not_approve_mortgage_loan"].includes(displayStage(meeting))) return "lost";
  return "pending";
}

function pipelineFor(meetingId) {
  return state.pipeline.find((row) => row.meeting_id === meetingId) || {
    closer_name: "",
    pipeline_stage: "",
    closer_status: "pending",
    follow_up_date: "",
    closed_date: "",
    deal_value: "",
    lost_reason: "",
    closer_notes: "",
  };
}

function ghlFor(meetingId) {
  return state.ghl?.snapshots?.find((row) => row.meeting_id === meetingId) || {
    pipeline_stage: "",
    pipeline_stage_name: "",
    opportunity_status: "",
    assigned_to_name: "",
    follow_up_date: "",
    last_note: "",
  };
}

function activitiesFor(meetingId) {
  return (state.activities || []).filter((row) => row.meeting_id === meetingId);
}

function lastActivityFor(meetingId) {
  return activitiesFor(meetingId)
    .slice()
    .sort((a, b) => new Date(b.activity_at || 0) - new Date(a.activity_at || 0))[0] || null;
}

function notesFor(meetingId) {
  return state.notes.filter((row) => row.meeting_id === meetingId);
}

function syncActiveButtons() {
  document.querySelectorAll("[data-section]").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === activeSection);
  });
  document.querySelectorAll("[data-period-button]").forEach((button) => {
    button.classList.toggle("active", button.dataset.periodButton === elements.periodFilter.value);
  });
  elements.weekFilter.value = String(selectedWeek);
}

function syncCompanyShell() {
  const companyId = elements.companyFilter.value;
  const company = COMPANY_META[companyId] || COMPANY_META[COMPANY_IDS.south];
  document.body.classList.remove("theme-south", "theme-cuates", "theme-lending");
  document.body.classList.add(`theme-${company.slug}`);
  elements.typeFilter.value = companyId === COMPANY_IDS.lending ? "lender" : "construction";
  elements.departmentHeadline.innerHTML = companyId === COMPANY_IDS.lending ? "Lending <span>Dept</span>" : "Sales Closers <span>Dept</span>";
  elements.headerCompanyLogo.src = company.logo;
  elements.headerSubtitle.textContent = `${company.name} · ${companyId === COMPANY_IDS.lending ? "Mortgage Meetings" : "Construction Meetings"} · ${formatDateRangeLabel()}`;
  document.querySelectorAll("[data-company-select]").forEach((button) => {
    button.classList.toggle("active", button.dataset.companySelect === companyId);
  });
  elements.sideSync.textContent = elements.cloudPill.textContent;
}

function syncGhlStatus() {
  if (!elements.ghlStatusPill) return;
  const snapshots = state.ghl?.snapshots?.length || 0;
  const lastRun = state.ghl?.syncRuns?.[0];
  if (snapshots) {
    elements.ghlStatusPill.textContent = `GHL: ${snapshots} synced`;
    return;
  }
  if (state.ghl?.configured) {
    elements.ghlStatusPill.textContent = "GHL: ready";
    return;
  }
  if (lastRun?.status === "missing_config") {
    elements.ghlStatusPill.textContent = "GHL: needs keys";
    return;
  }
  elements.ghlStatusPill.textContent = "GHL: pending API";
}

function renderCompanyCounts() {
  const period = elements.periodFilter.value;
  const rows = state.meetings.filter((meeting) => matchesPeriod(meeting, period));
  elements.southCount.textContent = rows.filter((meeting) => meeting.company_id === COMPANY_IDS.south && meeting.meeting_type === "construction").length;
  elements.cuatesCount.textContent = rows.filter((meeting) => meeting.company_id === COMPANY_IDS.cuates && meeting.meeting_type === "construction").length;
  elements.lendingCount.textContent = rows.filter((meeting) => meeting.meeting_type === "lender").length;
}

function shiftWorkingDate(days) {
  workingDate = addDays(workingDate, days);
  render();
}

function setFormValue(form, name, value) {
  form.elements[name].value = value ?? "";
}

function dateValue(value) {
  if (!value) return null;
  return new Date(`${value}T12:00:00`);
}

function startOfToday() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatHeaderDate(date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(dateValue(value));
}

function formatShortDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(dateValue(value));
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatDateRangeLabel() {
  if (elements.periodFilter.value === "all") {
    const from = elements.fromDate.value || isoDate(firstDayOfMonth(workingDate));
    const to = elements.toDate.value || isoDate(workingDate);
    return `${formatShortDate(from)} - ${formatShortDate(to)}`;
  }
  if (elements.periodFilter.value === "today") return formatDate(isoDate(workingDate));
  if (elements.periodFilter.value === "recent30") return `Last 30 Days`;
  if (elements.periodFilter.value === "lastMonth") return "Last Month";
  if (elements.periodFilter.value === "thisYear") return "This Year";
  if (elements.periodFilter.value === "lastYear") return "Last Year";
  if (elements.periodFilter.value === "salesWeek") return formatSalesWeekLabel(selectedWeek);
  return monthYear(workingDate);
}

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function firstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function populateWeekFilter() {
  elements.weekFilter.innerHTML = Array.from({ length: 52 }, (_, index) => {
    const week = index + 1;
    return `<option value="${week}">Week ${week}</option>`;
  }).join("");
  elements.weekFilter.value = String(selectedWeek);
}

function salesWeekForDate(date) {
  const first = firstSalesWeekStart(date.getFullYear());
  const diff = Math.floor((dateValue(isoDate(date)) - first) / (7 * 86400000));
  return { week: Math.min(Math.max(diff + 1, 1), 52) };
}

function firstSalesWeekStart(year) {
  const first = new Date(year, 0, 1, 12);
  const day = first.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(first, mondayOffset);
}

function salesWeekRange(year, week) {
  const start = addDays(firstSalesWeekStart(year), (week - 1) * 7);
  const end = addDays(start, 6);
  return { start, end };
}

function formatSalesWeekLabel(week) {
  const { start, end } = salesWeekRange(workingDate.getFullYear(), week);
  const months = [...new Set([monthName(start), monthName(end)])].join(" / ");
  return `Week ${week}: ${formatShortDate(isoDate(start))} - ${formatShortDate(isoDate(end))} · ${months}`;
}

function monthName(date) {
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
}

function stageTotals(meetings, isLending) {
  const totals = funnelStageTotals(meetings, isLending);
  totals.attended = meetings.filter((meeting) => meeting.status === "atendida" || meeting.status === "cerrado").length;
  totals.noShows = totals.noShow || 0;
  totals.needFollowUp = totals.needFollowUp || 0;
  totals.highlyInterested = totals.highlyInterested || 0;
  totals.qualified = totals.qualified || 0;
  totals.closed = totals.closed || 0;
  return totals;
}

function funnelStageTotals(meetings, isLending) {
  const totals = {};
  (isLending ? LENDING_FUNNEL : CONSTRUCTION_FUNNEL).forEach(([key]) => {
    totals[key] = meetings.filter((meeting) => meetingOutcomeKey(meeting, isLending) === key).length;
  });
  return totals;
}

function meetingOutcomeKey(meeting, isLending) {
  const stage = displayStage(meeting);
  if (stage === "closed" || meeting.status === "cerrado" || effectiveCloserStatus(meeting) === "closed") return "closed";
  if (meeting.status === "no_show" || stage === "no_show") return "noShow";
  if (stage === "not_interested") return isLending ? "notQualified" : "notInterested";
  if (stage === "did_not_approve_mortgage_loan" || meeting.status === "descalificado") return isLending ? "notQualified" : "notInterested";
  if (stage === "lead_potencial") return isLending ? "qualified" : "highlyInterested";
  if (stage === "contactado_con_tarea" || stage === "en_proceso_aprobacion" || pipelineFor(meeting.id).follow_up_date) return "needFollowUp";
  if (meeting.status === "atendida") return "attended";
  return "scheduled";
}

function outcomeLabel(meeting, isLending) {
  const key = meetingOutcomeKey(meeting, isLending);
  const labels = Object.fromEntries(isLending ? LENDING_FUNNEL : CONSTRUCTION_FUNNEL);
  if (isLending && key === "qualified") return "Approved";
  if (isLending && key === "notQualified") return "Not Qualified";
  return labels[key] || "Needs Review";
}

function isNeedFollowUp(meeting) {
  return meetingOutcomeKey(meeting, elements.companyFilter.value === COMPANY_IDS.lending) === "needFollowUp";
}

function monthYear(date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function percent(value, base) {
  return base ? `${Math.round((value / base) * 100)}%` : "0%";
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CG";
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}
