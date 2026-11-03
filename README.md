# WOB 2026 Election & Transition Intelligence Hub
Static site + scheduled Netlify Functions + Netlify Blobs. No database. No keys in the browser.

## Deploy
1. Push this folder to GitHub. In Netlify: use the existing site (wobelectionhub) > Link repository. Build/publish/functions come from netlify.toml.
2. Env vars (Site settings > Environment variables): REFRESH_TOKEN (long random string), ENABLE_CA=1 (after running `node scripts/probe.mjs CA` locally succeeds).
3. Functions > Scheduled shows refresh-fast, refresh-hourly, refresh-daily.

## Schedule (UTC, edit netlify/functions/lib/phase.mjs)
Nov 3 22:00 to Nov 5 11:00: every 5 min. Then hourly to Nov 12. Then daily to Dec 31. Jobs outside their window exit immediately.
Manual refresh: https://YOUR-SITE/api/refresh?token=REFRESH_TOKEN
Data is unchanged => no new history snapshot. Snapshots live in the Blobs store "wob" under history/.

## Add a state feed
Create netlify/functions/lib/adapters/XX.mjs (id, fetchRaces, parse), register in adapters/index.mjs, probe it, enable it. Add a test with a saved sample response.

## Tests
`npm test` (9 tests: registry, phases, normalization, calls, refresh persistence/failure). Run `npm i` first; on Netlify, dependencies install automatically.

## Status
Working and tested locally: registry/matrix UI logic, validation, race-status rules, refresh with fake store, failure retention.
Pre-election data: data/preelection.json (36 states: nominees; 19 with polling averages, retrieved 2026-11-03, static, not auto-updated). Territories (VI, GU, MP) pending.
NOT verified: any live feed (CA adapter's response shape is a guess and is off by default), Netlify scheduling, browser rendering.
