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
- Deploy React and Django; configure the backend hostname, frontend CORS origin, and frontend API base URL.
- Repeat a live trip on the hosted application.
- Record and share the personal 5–10-minute Loom walkthrough.
- Submit the three deliverable links through the recruitment form.

No hosted deployment or recruiting submission has been performed.
