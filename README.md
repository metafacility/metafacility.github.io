# XRD Facility Slot Booking Website

Static site (HTML/CSS/vanilla JS) for GitHub Pages. Open `index.html` locally to see it in demo mode (mock data).

## 0. Easy way: admin.html

Open `admin.html` locally (double-click; choose your `script.js` when asked), edit the fields, click **Download script.js**, and upload that file to GitHub. **Do not upload `admin.html`** — upload only `index.html`, `styles.css` and the downloaded `script.js`.

## 1. What to edit manually

All settings are in the `CONFIG` block at the top of `script.js` (lines ~1–55):

| Setting | Location |
|---|---|
| Institute / Department / Facility name | `script.js` lines 6–8 (`INSTITUTE_NAME`, `DEPARTMENT_NAME`, `FACILITY_NAME`) |
| Logo | `script.js` line 11 (`LOGO_URL`, e.g. `"./assets/logo.png"` – put the image in an `assets/` folder) |
| Microsoft Form URL | `script.js` line 14 (`MS_FORM_URL`) |
| Google Sheet CSV URL | `script.js` line 19 (`GOOGLE_SHEET_CSV_URL`) |
| Max samples / fallback ticker text / demo data | `script.js` lines 22–50 |

`index.html` also contains placeholder header text (lines ~20–28) that is replaced by `CONFIG` at load time, so you normally don't edit it. Instrument specifications are in `index.html` (the `Instrument Specifications` section, ~lines 63–72), the FAQ in the section after it, and the modal checkbox wording in the `#modal` block near the bottom.

## 2. Google Sheet as live data source

1. Create a sheet with these headers in row 1:
   `Week_Label | Session_Date | Samples_Booked | Status_Override | Alert_Message`
2. Row 2 = current/upcoming week, row 3 = next week. Example:
   `Week 1 | 2026-11-04 | 18 | Open | Facility operating normally.` and `Week 2 | 2026-11-11 | 6 | Open |`
   - `Session_Date`: use `YYYY-MM-DD` (format the column as plain text).
   - `Status_Override`: `Open`, or `Closed` / `Maintenance` / `Full` to block booking.
   - `Alert_Message`: first non-empty value feeds the scrolling ticker.
3. **File → Share → Publish to web** → choose the sheet tab → format **Comma-separated values (.csv)** → **Publish**.
4. Copy the link into `GOOGLE_SHEET_CSV_URL`. Edits appear on the site automatically (Google caches published sheets for a few minutes; the *Refresh Availability* button refetches).

If the URL is empty or fails, the site shows `CONFIG.MOCK_DATA` with a "Demo mode" notice.

## 3. Deploy on GitHub Pages

1. Create a GitHub repository and upload all files (`index.html`, `styles.css`, `script.js`, `README.md`, optional `assets/`).
2. Repo **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, folder `/ (root)` → Save.
3. After a minute the site is live at `https://<username>.github.io/<repo>/`.
