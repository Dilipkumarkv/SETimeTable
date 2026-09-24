# College Timetable PWA (SET Polytechnic Melukote)

A phone-first, zero-dependency Progressive Web App built for the polytechnic principal and faculty walking across campus to answer one question instantly:

> **"What is happening across the college right now, and what is coming up?"**

---

## Current Status: Phase 8 Completed (Production Ready & Verified)

| Phase | Description | Status |
|---|---|---|
| Phase 0 | Contract, Scaffolding & Architecture | COMPLETED |
| Phase 1 | Data layer, validator, pure time engine, unit test suite | COMPLETED |
| Phase 2 | App shell, navigation, simulation panel, Now view | COMPLETED |
| Phase 3 | Next view with rollover logic and lab span consolidation | COMPLETED |
| Phase 4 | Overview view (Day & Week matrix grids) | COMPLETED |
| Phase 5 | Cross-view branch and lecturer filters | COMPLETED |
| Phase 6 | PWA installation, Service Worker caching, offline engine | COMPLETED |
| Phase 7 | Hardening, accessibility, performance audit, final verification | COMPLETED |
| **Phase 8** | **Real data handoff, zero-code validation & production delivery** | **COMPLETED** |

---

## Real Data Handoff Guide (§9)
To deliver the real timetable into the application:
1. Replace `/data.js` with your production timetable conforming to the §4 schema.
2. In `data.js`, set `isSample: false` and update `term` and `version` in `meta`.
3. In `sw.js`, bump `CACHE_NAME` (e.g. from `timetable-cache-v3` to `timetable-cache-v4`).
4. Commit and push: users' browsers will detect the updated service worker, fetch the new `data.js`, notify the user with a 1-tap update banner, and purge previous cached versions.
5. **Zero code changes** are required in `app.js`, `time.js`, or any UI module.

---

## Deploy to GitHub Pages (≤ 10 Steps)
1. Initialize git repo if not already done: `git init`
2. Add all project files: `git add .`
3. Commit release: `git commit -m "feat: College Timetable PWA v1.0.0"`
4. Create a repository on GitHub (e.g., `timetable-pwa`).
5. Link remote: `git remote add origin https://github.com/<username>/timetable-pwa.git`
6. Push to default branch: `git push -u origin main`
7. On GitHub, navigate to **Settings > Pages**.
8. Under **Build and deployment**, select **Source: Deploy from a branch**.
9. Select branch `main` and folder `/ (root)` and click **Save**.
10. The app goes live at `https://<username>.github.io/timetable-pwa/` (100% functional offline).

---

## Technical Stack & Constraints

- **Stack:** Plain HTML5 + CSS + vanilla JavaScript (ES modules).
- **Zero Dependencies:** No frameworks (React/Vue), no build step, no npm runtime dependencies, no CDNs, no external web fonts or scripts.
- **Offline First:** Fully functional offline via Service Worker cache.
- **Data-Driven:** All schedule entries isolated in `data.js`. Pure schedule engine taking `(data, date)` inputs.
- **Test Suite:** Zero-dependency in-browser unit test runner (`tests.html`).

---

## Documentation Links

- [Requirements & Master Plan](master.md)
- [Technical Design Document](TECHNICAL_DESIGN.md)
- [Changelog](CHANGELOG.md)

---

## Running the Project

During development:
```bash
# Served locally on port 3000
npm run dev
```
Production / Static Server:
```bash
# Any static file server can host the root directory directly
npx serve .
# Or Python
python3 -m http.server 3000
```
