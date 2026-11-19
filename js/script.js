/* =====================================================================
   CONFIGURATION — edit only this block to customise the website
   (Header text and logo are edited directly in the HTML files.)
   ===================================================================== */
const CONFIG = {
  // PASTE your Microsoft Form URL between the quotes (must start with https://):
  MS_FORM_URL: "https://forms.cloud.microsoft/r/mZ85Nq4fhz",

  // PASTE your published Google Sheet CSV URL between the quotes
  // (File > Share > Publish to web > Comma-separated values (.csv)).
  // Leave "" to run in demo mode using MOCK_DATA below.
  GOOGLE_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNnkSEHKFiwaii9gd1BMZNwAmzBmobcSI4fNG5BMaCGGLJxMfvLTNTvtQUWts3MwxLDDs0o93nEb5i/pub?gid=0&single=true&output=csv",

  // Hard limit of samples per weekly session
  MAX_SAMPLES_PER_WEEK: 24,

  // "Filling Fast" is shown when remaining slots are below this number
  FILLING_FAST_THRESHOLD: 6,

  // Shown in the ticker when the sheet has no Alert_Message
  FALLBACK_ALERT_TEXT:
    "Welcome to the NITT XRD Facility.",

  // Shown only when the sheet is empty, missing or unreachable.
  // Status_Override "Error" makes the cards show "Unavailable" instead of fake numbers.
  MOCK_DATA: [
    { "Week_Label": "Week 1", "Session_Date": "Unavailable", "Samples_Booked": 0, "Status_Override": "Error", "Alert_Message": "Error contact web team" },
    { "Week_Label": "Week 2", "Session_Date": "Unavailable", "Samples_Booked": 0, "Status_Override": "Error", "Alert_Message": "" },
  ],
};
/* ===================== END OF CONFIGURATION ======================== */

/* ---------- Helpers and shared state ---------- */
const $ = (id) => document.getElementById(id);
const state = { weeks: [], alert: "", status: "", demo: false, error: "", updated: null };

// Escapes text before it is placed inside innerHTML
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Only allow https:// links to be opened from CONFIG
function safeUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" ? x.href : "";
  } catch (e) {
    return "";
  }
}

/* ---------- CSV parsing (handles quotes and line breaks inside cells) ---------- */
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o = {};
    headers.forEach((h, i) => (o[h] = (r[i] || "").trim()));
    return o;
  });
}

/* ---------- Google Sheet loading ---------- */
// Reads a sheet link and returns its id, gid and whether it is a "Publish to web" link
function parseSheetUrl(url) {
  const gid = (url.match(/gid=(\d+)/) || [])[1];
  if (/docs\.google\.com\/spreadsheets\/d\/e\//.test(url)) return { published: true, gid };
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/);
  return { published: false, id: m ? m[1] : "", gid };
}

// Fallback that avoids CORS: Google's gviz endpoint via <script> tag
// (sheet must be shared "Anyone with the link: Viewer"). Allowed by the CSP in index.html.
let jsonpCount = 0;
function fetchViaJsonp(id, gid) {
  return new Promise((resolve, reject) => {
    const cb = "gvizCb" + Date.now() + "_" + jsonpCount++;
    const s = document.createElement("script");
    const done = () => { delete window[cb]; s.remove(); };
    window[cb] = (json) => {
      done();
      if (!json || json.status === "error" || !json.table) return reject(new Error("Google refused access — share the sheet as 'Anyone with the link: Viewer'"));
      const cell = (c) => (c ? (c.f != null ? c.f : c.v != null ? c.v : "") : "");
      let headers = json.table.cols.map((c) => (c.label || "").trim());
      let data = json.table.rows.map((r) => (r.c || []).map(cell));
      if (!headers.includes("Samples_Booked") && data.length) headers = data.shift().map((h) => String(h).trim());
      resolve(data.map((r) => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? "").trim()]))));
    };
    s.onerror = () => { done(); reject(new Error("Could not reach Google Sheets (check sharing settings and internet)")); };
    s.src = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json;responseHandler:${cb}${gid ? "&gid=" + gid : ""}`;
    document.head.appendChild(s);
  });
}

// Downloads the sheet as CSV; throws a readable error if anything is wrong
async function fetchSheetData() {
  const original = (CONFIG.GOOGLE_SHEET_CSV_URL || "").trim();
  if (!original) throw new Error("GOOGLE_SHEET_CSV_URL is empty in js/script.js");
  const info = parseSheetUrl(original);
  let url = original;
  // A normal sheet link (.../d/<id>/edit...) is converted into a CSV export link
  if (!info.published && info.id && /\/(edit|view)/.test(original)) {
    url = `https://docs.google.com/spreadsheets/d/${info.id}/gviz/tq?tqx=out:csv${info.gid ? "&gid=" + info.gid : ""}`;
  }
  let res;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (e) {
    if (info.id) return fetchViaJsonp(info.id, info.gid);
    throw new Error("Network/CORS error. Use the 'Publish to web' CSV link (…/d/e/…/pub?output=csv), and open the site via http(s), not by double-clicking the file.");
  }
  if (!res.ok) throw new Error("HTTP " + res.status + " — sheet not published or not public");
  const text = await res.text();
  if (/^\s*<(!doctype|html)/i.test(text)) throw new Error("Got a web page instead of CSV — publish the sheet as 'Comma-separated values (.csv)'");
  const rows = parseCSV(text);
  if (!rows.length) throw new Error("Sheet is empty");
  if (!("Samples_Booked" in rows[0])) throw new Error("Header row must contain Week_Label, Session_Date, Samples_Booked, Status_Override, Alert_Message, Instrument_Status");
  return rows;
}

// Loads data (or demo data on failure), updates state and redraws the page
async function loadData() {
  const btn = $("refreshBtn");
  btn.disabled = true;
  btn.textContent = "Refreshing…";
  let rows;
  try {
    rows = await fetchSheetData();
    if (rows.length < 3) {
  throw new Error("The sheet must contain three session rows.");
}

const secondOpening = parseOpeningTime(rows[1].Booking_Opens_At);
const thirdOpening = parseOpeningTime(rows[2].Booking_Opens_At);

if (!secondOpening || !thirdOpening) {
  throw new Error(
    "Rows 2 and 3 need valid Booking_Opens_At values: YYYY-MM-DD HH:mm in IST."
  );
}

if (thirdOpening.timestamp <= secondOpening.timestamp) {
  throw new Error("The third session must open after the second session.");
} 
    state.demo = false;
    state.error = "";
  } catch (err) {
    console.warn("Using demo data:", err.message);
    state.error = err.message;
    rows = CONFIG.MOCK_DATA;
    state.demo = true;
  }
  state.weeks = rows.slice(0, 3);
  const alertRow = rows.find((r) => (r.Alert_Message || "").trim());
  state.alert = alertRow ? alertRow.Alert_Message.trim() : CONFIG.FALLBACK_ALERT_TEXT;
  const statusRow = state.demo ? null : rows.find((r) => (r.Instrument_Status || "").trim());
  state.status = statusRow ? statusRow.Instrument_Status.trim() : "";
  state.updated = new Date();
  render();
  btn.disabled = false;
  btn.textContent = "↻ Refresh Availability";
}

// Reads a plain-text YYYY-MM-DD HH:mm value as India Standard Time.
function parseOpeningTime(value) {
  const match = String(value || "").trim().match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/
  );

  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (year < 2000 || hour > 23 || minute > 59) return null;

  const utc = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(utc);

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    return null;
  }

  const pad = (number) => String(number).padStart(2, "0");
  const period = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 || 12;

  return {
    timestamp: utc - 330 * 60 * 1000,
    label: `${pad(day)}-${pad(month)}-${year} at ${pad(hour12)}:${pad(minute)} ${period} IST`
  };
}

// The first sheet row is current until a later session's opening time.
function currentWeekIndex() {
  let index = 0;

  for (let i = 1; i < state.weeks.length; i++) {
    const opening = parseOpeningTime(state.weeks[i].Booking_Opens_At);
    if (opening && Date.now() >= opening.timestamp) index = i;
  }

  return index;
}

let activeWeekIndex = 0;

/* ---------- Rendering ---------- */
// Turns "2026-11-04" into a long, readable date
function formatDate(s) {
  const d = new Date(s + (/^\d{4}-\d{2}-\d{2}$/.test(s) ? "T00:00:00" : ""));
  return isNaN(d) ? s || "TBA" : d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

// Decides badge colour, label and whether booking is closed
function computeStatus(booked, override) {
  const max = CONFIG.MAX_SAMPLES_PER_WEEK;
  const o = (override || "").toLowerCase();
  if (/(error|unavailable)/.test(o)) return { key: "full", label: "Unavailable", closed: true, unavailable: true };
  if (/(closed|maintenance|full)/.test(o)) return { key: "full", label: o.includes("maint") ? "Maintenance" : "Slot Full", closed: true };
  if (booked >= max) return { key: "full", label: "Slot Full", closed: true };
  if (max - booked < CONFIG.FILLING_FAST_THRESHOLD) return { key: "fast", label: "Filling Fast", closed: false };
  return { key: "ok", label: "Available", closed: false };
}

// Draws one session card (date, booked/available totals, circular progress, Book button)
function renderCard(el, data, title, isCurrent) {
  const max = CONFIG.MAX_SAMPLES_PER_WEEK;
  const booked = Math.max(0, Math.min(max, parseInt(data.Samples_Booked, 10) || 0));
  const st = computeStatus(booked, data.Status_Override);
  const remaining = max - booked;
  const pct = st.unavailable ? 0 : Math.round((booked / max) * 100);
  const shown = (n) => (st.unavailable ? "—" : n);
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference * (1 - pct / 100);
  const btnText = st.unavailable ? "Booking Info Unavailable"
    : st.closed ? (st.label === "Maintenance" ? "Session Unavailable" : `Session Full (${max}/${max} Booked)`)
    : "Book Now";
   const opening = isCurrent ? null : parseOpeningTime(data.Booking_Opens_At);

const action = isCurrent
  ? `<button class="btn book" ${st.closed ? "disabled" : ""}>${esc(btnText)}</button>`
  : `<p class="notice">${
      opening
        ? `Booking for this session opens on ${esc(opening.label)}.`
        : "Booking opening time is unavailable."
    }</p>`;
  el.className = `card session ${st.key}`;
  el.innerHTML = `
    <div class="card-top">
      <div><p class="eyebrow">${esc(title)}</p><h3>${esc(data.Week_Label || "")}</h3></div>
      <span class="badge ${st.key}">${esc(st.label)}</span>
    </div>
    <p class="date">📅 ${esc(formatDate(data.Session_Date))}</p>
    <div class="capacity">
      <div class="capacity-ring ${st.key}" role="progressbar"
           aria-label="${st.unavailable ? "Availability unavailable" : `${booked} samples booked; ${remaining} slots available`}"
           aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${st.unavailable ? 0 : booked}">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle class="ring-track" cx="50" cy="50" r="42"></circle>
          <circle class="ring-value" cx="50" cy="50" r="42"
                  style="stroke-dasharray:${circumference};stroke-dashoffset:${dashOffset}"></circle>
        </svg>
        <span class="ring-label"><strong>${st.unavailable ? "—" : pct + "%"}</strong><small>${st.unavailable ? "unavailable" : "booked"}</small></span>
      </div>
      <dl class="capacity-stats">
        <div><dt>Samples booked</dt><dd>${shown(booked)}</dd></div>
        <div><dt>Slots available</dt><dd>${shown(remaining)}</dd></div>
      </dl>
    </div>
     ${action}`;
  if (isCurrent && !st.closed) {
    el.querySelector(".book").addEventListener("click", openModal);
}

// Updates the header badge: green = Working, yellow = maintenance/other text, grey = unknown
function renderStatus() {
  const pill = $("statusPill");
  const s = state.status;
  let cls = "unknown", text = "Unavailable";
  if (s) {
    if (/^(working|online|active|operational|on)\b/i.test(s)) { cls = "working"; text = "Working"; }
    else { cls = "maint"; text = /maint/i.test(s) ? "On-going Maintenance" : s.slice(0, 40); }
  }
  pill.className = "status-pill " + cls;
  $("statusText").textContent = text;
}

// Redraws every dynamic part of the page
function render() {
  renderStatus();
const index = state.demo ? 0 : currentWeekIndex();

if (index !== activeWeekIndex && !$("modal").hidden) {
  closeModal();
}
activeWeekIndex = index;

renderCard(
  $("card1"),
  state.weeks[index] || CONFIG.MOCK_DATA[0],
  "Current / Upcoming Week Session",
  true
);

renderCard(
  $("card2"),
  state.weeks[index + 1] || CONFIG.MOCK_DATA[1],
  "Next Week Session",
  false
);
  $("tickerText").textContent = state.alert;
  $("tickerText2").textContent = state.alert;
  $("lastUpdated").textContent = "Last updated: " + state.updated.toLocaleString();
  $("demoNote").hidden = !state.demo;
  if (state.demo) $("demoNote").textContent = "Live data unavailable. Reason: " + state.error;
}

/* ---------- Pre-booking modal (3 checkboxes, then opens the Microsoft Form) ---------- */
let lastFocus = null;
function openModal() {
  lastFocus = document.activeElement;
  document.querySelectorAll(".confirm-check").forEach((c) => (c.checked = false));
  $("proceedBtn").disabled = true;
  $("modal").hidden = false;
  document.body.classList.add("noscroll");
  document.querySelector(".confirm-check").focus();
}
function closeModal() {
  $("modal").hidden = true;
  document.body.classList.remove("noscroll");
  if (lastFocus) lastFocus.focus();
}
function initModal() {
  const checks = document.querySelectorAll(".confirm-check");
  checks.forEach((c) => c.addEventListener("change", () => {
    $("proceedBtn").disabled = ![...checks].every((x) => x.checked);
  }));
  $("cancelBtn").addEventListener("click", closeModal);
  $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("modal").hidden) closeModal(); });
  $("proceedBtn").addEventListener("click", () => {
    if (![...checks].every((x) => x.checked)) return;
    window.location.href = "booking.html";
  });
}

/* ---------- Start-up ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initModal();
  $("refreshBtn").addEventListener("click", loadData);
  loadData();
   // Check whether the next session has reached its opening time.
setInterval(() => {
  if (
    !state.demo &&
    state.weeks.length >= 3 &&
    currentWeekIndex() !== activeWeekIndex
  ) {
    render();
  }
}, 10000);
});
