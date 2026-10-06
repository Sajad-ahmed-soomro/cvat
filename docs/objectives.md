# Objectives

Machine: Apple M1 (8 cores), 16 GB RAM, macOS 26.5.1 (25F80), Docker Desktop 28.5.2.
CVAT commit cloned: `8d7ae755c5b8de82e8711756b35c0207655ef1ae`.

## MO-1 — Label-count endpoint latency

| Field | Entry |
|-------|-------|
| What is measured | Wall-clock time for `GET /api/test/tasks/{id}/label-counts` to return a complete response, as seen by the client. |
| How | `curl -w '%{time_total}'` from the host, through Traefik (`localhost:8080`), Basic auth as the task owner. One run = 3 warm-up requests, then 50 timed sequential requests. The run's figure is its p95. The script and raw output are committed under `docs/`. |
| Target | Median p95 across 5 runs at or below **150 ms**. |
| Conditions | Local Docker stack built from this branch, COCO val2017 task (image count recorded below), nothing else running, no other users. |
| Not included | First request after a server restart (cold Python imports and DB connection), and time to draw the chart in the browser. |

**Why 150 ms.** The page refetches on every annotation change pushed over the WebSocket, so the
endpoint must be cheap enough to call often. 150 ms keeps a refetch below the point where a UI
update feels late. The obvious alternative, loading the task's annotations through CVAT's own
`GET /api/tasks/{id}/annotations` and counting them, serialises every point of every polygon. On
COCO that is tens of MB and will be seconds, not milliseconds. I measure that path the same way, as
a baseline, so the target is set against a real alternative and not against nothing.

## Results

_(Filled in after measuring.)_
