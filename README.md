# Car Service Tracker

A phone app (installable web app / PWA) for tracking maintenance on our three cars:

| Vehicle | Plate |
|---|---|
| 2023 Kia Carnival | XCC 8121 |
| 2020 Nissan Kicks | WVK 3388 |
| 2015 Nissan Leaf | KST 9957 |

## What it does

- **Snap a receipt.** Take a photo with the camera (or pick one from your photo library). The app reads the text on the phone and fills in the vehicle (matched from the plate or model name), date, mileage, shop, total, and services performed. You check the details and tap Save. The photo is kept with the record.
- **Tracks what's due.** Each car has a maintenance schedule (oil, tire rotation, filters, brake fluid, CVT/ATF, coolant, spark plugs, Leaf battery check, 12V battery…). Every item shows **Overdue / Due soon / OK / No record**, based on the last receipt plus an estimate of today's mileage from your driving rate.
- **Manufacturer recommendations and best practices.** Each item explains the Kia/Nissan interval and when to use the severe schedule. A Tips tab covers model-specific advice: the Carnival's GDI engine and warranty records, the Kicks' CVT care, Leaf battery health and charging habits.
- **Editable intervals.** Tap any schedule item to change its interval to match your owner's manual, or to log a service without a receipt.
- **Private and offline.** All data is stored on the phone (IndexedDB). Nothing is uploaded. Use Settings → Export backup to save a copy (with photos) to Files, iCloud or Google Drive, or export a CSV spreadsheet.

## Getting it on your phone

1. In the GitHub repo go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Merge this branch into `main`. The *Deploy to GitHub Pages* workflow publishes the site to
   `https://<your-github-username>.github.io/Car-service/`.
3. Open that link on your phone:
   - **iPhone (Safari):** Share → **Add to Home Screen**
   - **Android (Chrome):** ⋮ → **Install app**

The text reader (Tesseract.js) downloads about 10 MB the first time you scan a receipt, then it is cached. Scanning needs a connection the first time. After that the app works offline.

## Development

No build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

| File | Purpose |
|---|---|
| `js/data.js` | Vehicles, service catalog + OCR keywords, schedules, tips |
| `js/schedule.js` | Due-date / due-mileage calculations, odometer estimate |
| `js/parse.js` | Receipt text → date, mileage, total, shop, services |
| `js/app.js` | UI, camera/OCR flow, backup/export |
| `js/db.js` | IndexedDB storage |
| `sw.js` | Offline caching |

> Intervals are typical normal-driving recommendations from manufacturer schedules and common shop practice. Your owner's manual is the final word.
