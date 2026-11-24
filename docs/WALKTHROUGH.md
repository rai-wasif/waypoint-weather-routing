# Loom walkthrough — approximately 7 minutes

Record in your own voice after verifying the hosted app. Explain the decisions and limitations honestly. Do not describe synthetic sample weather as live data.

1. **0:00–0:40 — Problem and stack.** Introduce weather-aware trucking, React/TypeScript, Django, and the assessment's prioritization of risk over speed.
2. **0:40–1:30 — Trip inputs.** Show the labeled sample, then submit a live trip with origin, destination, local departure, load, and checkpoint spacing. Explain resolved city names.
3. **1:30–2:40 — Compare routes.** Select each route, inspect distances/durations and risk-mile bars. Explain why the recommended route wins and why the fastest route may not win.
4. **2:40–3:40 — Map and forecast.** Click a checkpoint to show ETA and weather. Toggle layers, drag the slider through 48 hours, then play it. Explain that the slider shows a common forecast time while trip risk follows checkpoint arrivals.
5. **3:40–4:40 — Risk and load.** Open the methodology. Show tests proving the >30,000 and >40,000 load cutoffs and ≥55 wind rule. Explain all-blocked behavior.
6. **4:40–5:50 — Code.** Walk through risk.py, geometry/ETA sampling, multi-location weather batching, and route ranking. Show successful test and build output.
7. **5:50–6:40 — Reliability and limits.** Demonstrate a validation error and mobile view. Mention missing forecasts, provider failures, non-truck-certified roads, hourly resolution, and ETA exclusions.
8. **6:40–7:00 — Close.** Show the README, GitHub link, and hosted URL. Briefly identify explicit city disambiguation and a truck-specific routing provider as future improvements.

## Submission checklist

- GitHub repository visible to the reviewer; no secrets committed.
- Hosted frontend can reach the deployed Django API.
- A fresh live route succeeds on the hosted app.
- Loom is 5–10 minutes, audible, and accessible to reviewers.
- Submit all three links through the recruitment questionnaire.
- The email is dated November 18 while the current environment date is November 24; the stated four-day window may have elapsed. Confirm with the recruiter whether submission is still accepted. No message has been sent on your behalf.
