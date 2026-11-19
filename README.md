# XRD Facility Website

A static, multipage website for an X-ray Diffraction facility, built with plain HTML, CSS and JavaScript (no build step). It is ready for GitHub Pages.

## Folder structure

```
/
├─ index.html          Home: slot availability, status badge, ticker, booking modal
├─ instrument.html     Instrument Specifications + interactive 3D viewer
├─ charges.html        Usage Charges (tariff, bank / UPI details)
├─ faq.html            FAQ
├─ results.html        Results request instructions and payment confirmation
├─ upload.html         Zoho payment screenshot upload form
├─ forms.html          Microsoft transaction details form
├─ contact.html        Contact + team photos
├─ 404.html            "Page not found" page
├─ robots.txt, .nojekyll, .gitignore
├─ css/   styles.css (all pages) · viewer.css (instrument page only)
├─ js/    script.js (home page) · viewer.js (3D viewer) · nav.js (menu + year) · results-flow.js (results dialogs)
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
| Payment screenshot form | `upload.html` — replace the Zoho iframe `src` and fallback link; update `frame-src` if the hostname changes |
| Results transaction form | `forms.html` — replace the Microsoft iframe `src` and full-screen link (Share > Embed) |
| Contact details, team names | `contact.html` |
| Viewer dots and popup text | `js/viewer.js` `VIEWS` list (`x,y` = dot, `tx,ty` = part, in % of the image) |

The header and menu are repeated in each HTML file, so change them on every page.

The results request flow starts at `results.html`, then goes through `upload.html` and `forms.html`. These two pages are not in the navigation menu but are publicly accessible. Users must submit both embedded forms before finishing; the website cannot verify cross-origin submissions.

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

- Each page has a Content-Security-Policy `<meta>` tag. If you embed another form host, add its domain to `frame-src` on the page containing that iframe; data sources may require changes to `connect-src` in `index.html`.
- Never put passwords or private keys in these files; everything is public.
- Only publish bank/UPI details you intend to be public.
