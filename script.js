/* =====================================================================
   CONFIGURATION — edit only this block to customise the website
   ===================================================================== */
const CONFIG = {
  // Header text
  INSTITUTE_NAME: "National Institute of Technology Tiruchirappalli",
  DEPARTMENT_NAME: "Department of Metallurgical and Materials Engineering",
  FACILITY_NAME: "X-Ray Diffraction (XRD) Facility",

  // Local path (e.g. "./assets/logo.png") or full external URL. Leave "" for a placeholder.
  LOGO_URL: "https://github.com/metafacility/metafacility.github.io/blob/main/Low-Resolution-Emblem.png",

  // PASTE your Microsoft Form URL between the quotes:
  MS_FORM_URL: "https://forms.cloud.microsoft/r/mZ85Nq4fhz",

  // PASTE your published Google Sheet CSV URL between the quotes
  // (File > Share > Publish to web > Comma-separated values (.csv)).
  // Leave "" to run in offline demo mode using MOCK_DATA below.
  GOOGLE_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNnkSEHKFiwaii9gd1BMZNwAmzBmobcSI4fNG5BMaCGGLJxMfvLTNTvtQUWts3MwxLDDs0o93nEb5i/pub?gid=0&single=true&output=csv",

  // Hard limit of samples per weekly session
  MAX_SAMPLES_PER_WEEK: 24,

  // "Filling Fast" is shown when remaining slots are below this number
  FILLING_FAST_THRESHOLD: 6,

  // Shown in the ticker when the sheet has no Alert_Message
  FALLBACK_ALERT_TEXT:
    "Welcome to the Central XRD Facility.",

  // Mock/fallback data used if the sheet URL is empty or fails to load
  MOCK_DATA: [
    {
      "Week_Label": "Week 1",
      "Session_Date": "Unavailable",
      "Samples_Booked": 24,
      "Status_Override": "Error",
      "Alert_Message": "Error contact web team"
    },
    {
      "Week_Label": "Week 2",
      "Session_Date": "Unavailable",
      "Samples_Booked": 24,
      "Status_Override": "Error",
      "Alert_Message": ""
    }
  ],
};
/* ===================== END OF CONFIGURATION ======================== */

const $ = (id) => document.getElementById(id);
const state = { weeks: [], alert: "", demo: false, updated: null };

/* ---------- CSV parsing ---------- */
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

/* ---------- Data loading ---------- */
// Fallback that avoids CORS: Google's gviz endpoint via <script> tag (sheet must be shared "Anyone with the link: Viewer")
function fetchViaJsonp(id, gid) {
  return new Promise((resolve, reject) => {
    const cb = "gvizCb" + Date.now();
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
async function fetchSheetData() {
  let url = (CONFIG.GOOGLE_SHEET_CSV_URL || "").trim();
  if (!url) throw new Error("GOOGLE_SHEET_CSV_URL is empty in script.js");
  // Convert a normal sheet link (.../d/<id>/edit...) into a CSV export link
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)\/(edit|view)/);
  if (m) {
    const gid = (url.match(/gid=(\d+)/) || [])[1];
    url = `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv${gid ? "&gid=" + gid : ""}`;
  }
  let res;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (e) {
    const id = (CONFIG.GOOGLE_SHEET_CSV_URL.match(/spreadsheets\/d\/([^/e][^/]*)\//) || [])[1];
    if (id) {
      const gid = (CONFIG.GOOGLE_SHEET_CSV_URL.match(/gid=(\d+)/) || [])[1];
      return fetchViaJsonp(id, gid);
    }
    throw new Error("Network/CORS error. Use the 'Publish to web' CSV link (…/d/e/…/pub?output=csv), and open the site via http(s), not by double-clicking the file.");
  }
  if (!res.ok) throw new Error("HTTP " + res.status + " — sheet not published or not public");
  const text = await res.text();
  if (/^\s*<(!doctype|html)/i.test(text)) throw new Error("Got a web page instead of CSV — publish the sheet as 'Comma-separated values (.csv)'");
  const rows = parseCSV(text);
  if (!rows.length) throw new Error("Sheet is empty");
  if (!("Samples_Booked" in rows[0])) throw new Error("Header row must contain Week_Label, Session_Date, Samples_Booked, Status_Override, Alert_Message");
  return rows;
}

async function loadData() {
  const btn = $("refreshBtn");
  btn.disabled = true;
  btn.textContent = "Refreshing…";
  let rows;
  try {
    rows = await fetchSheetData();
    state.demo = false;
  } catch (err) {
    console.warn("Using demo data:", err.message);
    state.error = err.message;
    rows = CONFIG.MOCK_DATA;
    state.demo = true;
  }
  state.weeks = rows.slice(0, 2);
  const alertRow = rows.find((r) => (r.Alert_Message || "").trim());
  state.alert = alertRow ? alertRow.Alert_Message.trim() : CONFIG.FALLBACK_ALERT_TEXT;
  state.updated = new Date();
  render();
  btn.disabled = false;
  btn.textContent = "↻ Refresh Availability";
}

/* ---------- Rendering ---------- */
function formatDate(s) {
  const d = new Date(s + (/^\d{4}-\d{2}-\d{2}$/.test(s) ? "T00:00:00" : ""));
  return isNaN(d) ? s || "TBA" : d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function computeStatus(booked, override) {
  const max = CONFIG.MAX_SAMPLES_PER_WEEK;
  const o = (override || "").toLowerCase();
  if (/(closed|maintenance|full)/.test(o)) return { key: "full", label: o.includes("maint") ? "Maintenance" : "Slot Full", closed: true };
  if (booked >= max) return { key: "full", label: "Slot Full", closed: true };
  if (max - booked < CONFIG.FILLING_FAST_THRESHOLD) return { key: "fast", label: "Filling Fast", closed: false };
  return { key: "ok", label: "Available", closed: false };
}

function renderCard(el, data, title) {
  const max = CONFIG.MAX_SAMPLES_PER_WEEK;
  const booked = Math.max(0, Math.min(max, parseInt(data.Samples_Booked, 10) || 0));
  const st = computeStatus(booked, data.Status_Override);
  const remaining = max - booked;
  const pct = Math.round((booked / max) * 100);
  const cells = Array.from({ length: max }, (_, i) =>
    `<span class="cell ${i < booked ? "booked" : ""}" title="Slot ${i + 1}: ${i < booked ? "Booked" : "Available"}"></span>`).join("");
  const btnText = st.closed
    ? (st.label === "Maintenance" ? "Session Unavailable" : `Session Full (${max}/${max} Booked)`)
    : "Book Now";
  el.className = `card session ${st.key}`;
  el.innerHTML = `
    <div class="card-top">
      <div><p class="eyebrow">${title}</p><h3>${esc(data.Week_Label || "")}</h3></div>
      <span class="badge ${st.key}">${st.label}</span>
    </div>
    <p class="date">📅 ${esc(formatDate(data.Session_Date))}</p>
    <dl class="metrics">
      <div><dt>Total Slots</dt><dd>${max}</dd></div>
      <div><dt>Samples Booked</dt><dd>${booked}</dd></div>
      <div><dt>Remaining Slots</dt><dd>${remaining}</dd></div>
    </dl>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${booked}">
      <div class="bar ${st.key}" style="width:${pct}%"></div>
    </div>
    <p class="pct">${pct}% filled</p>
    <div class="grid" aria-hidden="true">${cells}</div>
    <button class="btn book" ${st.closed ? "disabled" : ""}>${btnText}</button>`;
  const b = el.querySelector(".book");
  if (!st.closed) b.addEventListener("click", openModal);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function render() {
  renderCard($("card1"), state.weeks[0] || CONFIG.MOCK_DATA[0], "Current / Upcoming Week Session");
  renderCard($("card2"), state.weeks[1] || CONFIG.MOCK_DATA[1], "Next Week Session");
  $("tickerText").textContent = state.alert;
  $("tickerText2").textContent = state.alert;
  $("lastUpdated").textContent = "Last updated: " + state.updated.toLocaleString();
  $("demoNote").hidden = !state.demo;
  $("demoNote").textContent = "Demo mode: showing sample data. Reason: " + (state.error || "");
}

/* ---------- Header ---------- */
function initHeader() {
  $("instituteName").textContent = CONFIG.INSTITUTE_NAME;
  $("departmentName").textContent = CONFIG.DEPARTMENT_NAME;
  $("facilityName").textContent = CONFIG.FACILITY_NAME;
  document.title = CONFIG.FACILITY_NAME + " — Slot Booking";
  const logo = $("logo");
  if (CONFIG.LOGO_URL) {
    logo.src = CONFIG.LOGO_URL;
    logo.onerror = () => { logo.hidden = true; $("logoFallback").hidden = false; };
    logo.hidden = false;
    $("logoFallback").hidden = true;
  }
}

/* ---------- Modal ---------- */
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
    if (!CONFIG.MS_FORM_URL) { alert("Booking form URL is not configured yet. Set CONFIG.MS_FORM_URL in script.js."); return; }
    window.open(CONFIG.MS_FORM_URL, "_blank", "noopener");
    closeModal();
  });
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initModal();
  $("refreshBtn").addEventListener("click", loadData);
  loadData();
});
