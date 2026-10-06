# Objectives

Machine: Apple M1 (8 cores), 16 GB RAM, macOS 26.5.1 (25F80), Docker Desktop 28.5.2.
CVAT commit cloned: `8d7ae755c5b8de82e8711756b35c0207655ef1ae`.

## MO-1 — Label-count endpoint latency

| Field | Entry |
|-------|-------|
| What is measured | Wall-clock time for `GET /api/test/tasks/{id}/label-counts` to return a complete response, as seen by the client. |
| How | [`docs/evidence/measure_latency.sh`](evidence/measure_latency.sh): `curl -w '%{time_total}'` from the host, through Traefik (`localhost:8080`), logged in once as the task owner and reusing the session cookie. One run = 3 warm-up requests, then 50 timed sequential requests. The run's figure is its p95. *Changed before measuring:* I first wrote Basic auth. A probe showed Basic auth costs ~550 ms per request, almost all of it PBKDF2 password hashing on every call, against ~25 ms with a session. That would measure the password hasher, not the endpoint, and the page uses the session anyway. |
| Target | Median p95 across 5 runs at or below **150 ms**. |
| Conditions | Local Docker stack, task #1 = first 1,000 COCO val2017 images by file name, 10 jobs of 100 frames, 8,109 shapes over 80 labels. Nothing else running, no other users. The published `cvat/server:dev` image is `linux/amd64` only, so on this M1 it runs under emulation. Absolute times will be lower on native hardware. |
| Not included | First request after a server restart (cold Python imports and DB connection), and time to draw the chart in the browser. |

**Why 150 ms.** The page refetches on every annotation change pushed over the WebSocket, so the
endpoint must be cheap enough to call often. 150 ms keeps a refetch below the point where a UI
update feels late. The obvious alternative, loading the task's annotations through CVAT's own
`GET /api/tasks/{id}/annotations` and counting them, serialises every point of every polygon. On
COCO that is tens of MB and will be seconds, not milliseconds. I measure that path the same way, as
a baseline, so the target is set against a real alternative and not against nothing.

## Results

Measured 2026-10-06 17:58 UTC. Raw output, every request:
[`evidence/mo1-label-counts-latency.txt`](evidence/mo1-label-counts-latency.txt) and
[`evidence/mo1-baseline-task-annotations-latency.txt`](evidence/mo1-baseline-task-annotations-latency.txt).

```
endpoint=/api/test/tasks/1/label-counts runs=5 requests_per_run=50 warmup=3
response bytes: 4498
run 1: n=50 min=24.3 p50=25.0 p95=27.6 max=28.5 ms
run 2: n=50 min=24.6 p50=25.2 p95=29.8 max=33.0 ms
run 3: n=50 min=23.9 p50=25.4 p95=29.7 max=30.7 ms
run 4: n=50 min=24.3 p50=25.0 p95=32.0 max=40.1 ms
run 5: n=50 min=24.3 p50=25.3 p95=26.9 max=32.2 ms
```

| | Label counts (MO-1) | Baseline: `GET /api/tasks/1/annotations` |
|---|---|---|
| Median of the 5 run p95s | **29.7 ms** | 1,041 ms |
| Spread of the run p95s | 26.9 – 32.0 ms | 841.6 – 1,433.8 ms |
| Median of the 5 run p50s | 25.2 ms | 778.1 ms |
| Response size | 4.5 KB | 4.35 MB |

**Target met:** 29.7 ms against 150 ms. The baseline runs used 10 requests each, not 50,
because each takes close to a second. With n=10 the "p95" is the slowest request of the run.

**What the result does and does not say.** The target was set against the baseline, and on that
comparison it holds: about 35× faster at p95 and about 1,000× less data. But I cleared my own number by
5×, which means 150 ms was a loose target for 8,109 shapes. This data set is too small to strain a
`GROUP BY` on indexed foreign keys. The figure I'd want next is the full 5,000-image val2017
(~36k objects) and a synthetic task 10× larger, to find where the per-request time starts to grow. I did not
run that, because the network here could not download the full image set in reasonable time (see the plan).
