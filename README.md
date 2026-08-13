# PocketWise PWA

A private, offline-first personal budget PWA designed for personal use. Data is stored in the browser's local storage on each device.

## Features

- Income and expense transactions
- Add/edit/delete categories and subcategories
- Monthly category budgets
- Trip budgets and a trip tag on transactions
- Foreign currency balances with INR equivalents
- Foreign-currency transactions stored with an INR equivalent
- Online FX refresh using the no-key Frankfurter public API, with manual/offline fallback rates
- Savings goals, budget health and spending insights
- Installable PWA with offline caching

## Publish with GitHub Pages

1. Create a new GitHub repository (for example `pocketwise`).
2. Upload **all files and folders from this project root** to the repository. Keep `.nojekyll`, `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js`, and the `icons/` folder at the repository root.
3. Commit/push the files to the `main` branch.
4. On GitHub open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch **main** and folder **/(root)**, then Save.
7. Open the HTTPS GitHub Pages URL GitHub provides. On iPhone/iPad use Safari → Share → Add to Home Screen. On Android/Chrome use Install app / Add to Home screen.

All asset paths are relative (`./...`), so the app works when hosted under a repository subpath such as `https://username.github.io/pocketwise/`.

## Important device/data note

GitHub Pages hosts only the app files. Your transactions, categories, trips, budgets and saved FX rates remain in that browser/device's local storage. Installing the app on a second phone will start with a separate local dataset; there is no cloud sync in this version.

## Run locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
