# Verification results

Verified locally on November 24, 2026, using Windows, Python 3.13, Node.js 24, and installed Chrome.

| Check | Result |
| --- | --- |
| Django calculation/API tests | 14 passed |
| Django system check | No issues |
| Python dependency check | No broken requirements |
| TypeScript + Vite production build | Passed |
| Three route cards and route selection | Passed in Chrome |
| Methodology dialog and Escape dismissal | Passed |
| Forecast playback | Passed |
| 390px mobile viewport | No document horizontal overflow |
| Browser runtime exceptions | None |
| Live API request, Chicago → Columbus, 32,000 lb, 50-mile spacing | HTTP 200; 3 routes; 9/8/8 checkpoints; 33 corridor cells |
| Live submission through the React form | Switched to Live forecast; no error |

One initial live request timed out upstream and returned the intended actionable 502 response. A subsequent live API request succeeded in approximately 43 seconds; the browser submission also succeeded. Public provider latency and availability remain a limitation. Do not infer a latency guarantee from these results.

The sample screenshot uses real, simplified routing geometry and synthetic weather. It is visibly labeled as sample data. Live results depend on departure time and provider forecasts and should not be expected to match the fixture.

## Repeat the checks

```powershell
.venv/Scripts/python backend/manage.py test routing
.venv/Scripts/python backend/manage.py check
.venv/Scripts/python -m pip check
npm --prefix frontend run build
```

For the browser smoke check on Windows, start Django and Vite as described in the README, then run `node scripts/browser_check.mjs`. This uses installed Google Chrome and writes ignored screenshots/results under `.qa/`. Add `--live` to submit a real trip; this requires working public APIs.

## Outstanding submission steps

- Source published to `rai-wasif/waypoint-weather-routing` in separate plan, backend, frontend, and deployment/documentation commits.
- React deployed to https://waypoint-weather-routing.vercel.app; Django deployed to https://waypoint-api-k856.onrender.com with CORS and API base URL configured.
- Hosted browser trip verified on November 27, 2026: Live forecast, no application error.
- Record and share the personal 5–10-minute Loom walkthrough.
- Submit the three deliverable links through the recruitment form.

The hosted deployment has been verified. The personal Loom recording and recruiting submission remain outstanding.


## Assessment requirement review - November 27, 2026

| PDF functionality | Implementation |
| --- | --- |
| React + Django; origin, destination, departure, load | React trip form and Django plan endpoint |
| Three API-generated routes | OSRM alternatives and waypoint detours; actionable error if three distinct routes cannot be found |
| Weather every 10 / 25 / 50 miles at checkpoint ETA | Road geometry sampling and annotated edge travel times; hourly forecast lookup |
| Weather and load thresholds | Risk classification with boundary and load tests |
| Recommendation priority | Severe miles, High miles, distance-weighted average risk, then duration; No Travel excluded |
| Map routes, checkpoints, risk, ETAs and summaries | Route lines, checkpoint popups, and route summary popups with distance, duration, arrival, risk exposure and recommendation |
| Corridor heatmap and 0-48h slider | Canvas forecast overlay, 49 hourly frames and playback |

Route summary popup verified by a real browser click. Route selection, modal dismissal, playback and 390px layout also passed; no runtime exceptions. Production build passed. Dark mode toggle and persisted preference verified separately; 14 Django tests passed during the same review.

This records implemented requirements and checks, not a guaranteed evaluator score or exhaustive validation of every possible trip. The corridor overlay is a coarse forecast visualization; public API availability, routability and the documented forecast/distance limits still apply.
