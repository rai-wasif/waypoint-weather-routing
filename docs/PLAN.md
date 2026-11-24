# Delivery plan

The supplied PDF requires React + Django, three route options, ETA-based weather at 10/25/50-mile intervals, exact weather/load rules, ordered recommendations, route/checkpoint mapping, and a 0–48-hour corridor weather layer.

The email requests delivery within four days and sixteen work hours. Its reported 4% advancement rate is not a measurable technical target. Prioritize the stated rubric and make the implementation easy to inspect.

| Budget | Work | Evidence |
| --- | --- | --- |
| 1 hour | Requirements and provider contracts | Explicit assumptions and API shape |
| 4 hours | Routing, weather, ETA, risk, recommendation | Boundary and calculation tests |
| 4 hours | React form, comparison cards, map and checkpoint table | Functional desktop/mobile workflow |
| 2 hours | Corridor layer, slider, loading and error states | Smooth cached forecast playback |
| 2 hours | Integration and responsive checks | Build, automated tests, browser checks |
| 2 hours | Deployment and smoke tests | GitHub + frontend + backend URLs |
| 1 hour | README and walkthrough | 5–10-minute Loom video |

## Definition of done

- Three distinct API road routes or a clear actionable failure.
- Weather sampled at each route checkpoint's ETA with documented units.
- All risk bands and load boundaries tested.
- No Travel routes excluded; all-blocked case visible.
- Recommendation follows the PDF's ordered criteria.
- All routes visible; selecting a route shows its checkpoint risks and ETAs.
- 0–48-hour corridor visualization works without per-frame API requests.
- Mobile layout, keyboard controls, loading/errors and data-source labels.
- Production frontend build and Django tests pass.
- Deployed live trip verified, not only sample data.
- Submission contains GitHub, hosted app, and personal Loom walkthrough links.

## Deliberate scope

No authentication, fleet database, billing, AI chatbot, or unrelated features. Spend time on the 80% assigned to calculation correctness and map/interface quality. General driving routes and coarse forecast data must remain clearly disclosed.
