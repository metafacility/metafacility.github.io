# XRD Facility Website

A static, multipage website for an X-ray Diffraction facility, built with plain HTML, CSS and JavaScript (no build step). It is ready for GitHub Pages.

## Folder structure

```
/
├─ index.html          Home: slot availability, status badge, ticker, booking modal
├─ instrument.html     Instrument Specifications + interactive 3D viewer
├─ charges.html        Usage Charges (tariff, bank / UPI details)
├─ faq.html            FAQ
├─ results.html        Results & Receipts (Microsoft Form iframe)
├─ contact.html        Contact + team photos
├─ 404.html            "Page not found" page
├─ robots.txt, .nojekyll, .gitignore
├─ css/   styles.css (all pages) · viewer.css (instrument page only)
├─ js/    script.js (home page) · viewer.js (3D viewer) · nav.js (menu + year)
├─ assets/img/   logo.png · favicon.svg · photo1.jpg · photo2.jpg · machine-1/2/3.jpg
└─ source-images/  original large photos (NOT uploaded; listed in .gitignore)
```

## What to edit and where

| What | File and place |
|---|---|
| Institute / department / facility text | Header block near the top of **every** `.html` file (`<h1>`, `.dept`, `.facility`, about lines 31–33) |
| Logo | Replace `assets/img/logo.png` (keep the name) |
| Microsoft Form (booking) URL | `js/script.js` line 7 `MS_FORM_URL` (must start with `https://`) |
| Google Sheet URL | `js/script.js` line 12 `GOOGLE_SHEET_CSV_URL` |
| Max samples, "filling fast" limit, fallback ticker text | `js/script.js` lines 15–21 |
| Fallback data when the sheet fails | `js/script.js` `MOCK_DATA` (line 26) |
| Team photos | Replace `assets/img/photo1.jpg` and `photo2.jpg` (square, same names) |
| Bank / UPI / tariff | `charges.html` |
| Results & Receipts form | `results.html` — replace the iframe `src` (Share > Embed) |
| Contact details, team names | `contact.html` |
| Viewer dots and popup text | `js/viewer.js` `VIEWS` list (`x,y` = dot, `tx,ty` = part, in % of the image) |

The header and menu are repeated in each HTML file, so change them in all 6 files.

## Google Sheet setup (live slots, ticker and status badge)

1. Create a sheet with this header row (exact names):
   `Week_Label | Session_Date | Samples_Booked | Status_Override | Alert_Message | Instrument_Status`
2. Row 2 = current/upcoming week, row 3 = next week. Example:
   `Week 1 | 2026-11-04 | 18 | Open | Facility operating normally. | Working`
3. `Status_Override`: `Open`, `Closed`, `Maintenance` or `Full`.
4. `Alert_Message`: the first non-empty value is shown in the ticker.
5. `Instrument_Status` (first non-empty value is used): `Working` shows green; `Maintenance` shows yellow "On-going Maintenance"; other text shows on yellow.
6. **File → Share → Publish to web →** choose the sheet tab and **Comma-separated values (.csv)** → Publish → copy the link into `GOOGLE_SHEET_CSV_URL`.
7. Changes appear after a few minutes (Google caches published sheets). Visitors can press **Refresh Availability**.

If the sheet cannot be loaded the cards show "Unavailable" and a yellow note explains why.

## Deploy to GitHub Pages

1. Create a repository on GitHub and upload everything in this folder **except** `source-images/`.
2. **Settings → Pages → Source:** *Deploy from a branch* → `main` / `(root)` → Save.
3. Your site appears at `https://<username>.github.io/<repo>/` within a minute or two.
4. After updating files, hard-refresh (Ctrl+F5) to bypass the cache.
5. Optional: set `og:image` in each page to a full `https://` URL and add a `sitemap.xml`.

## Security notes

- Each page has a Content-Security-Policy `<meta>` tag. If you embed another service (for example a different form host), add its domain to `frame-src` (in `results.html`) or `connect-src` (in `index.html`).
- Never put passwords or private keys in these files; everything is public.
- Only publish bank/UPI details you intend to be public.
