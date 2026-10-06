# Plan — Annotation counts per class

Base: `cvat-ai/cvat` develop @ `8d7ae755c5b8de82e8711756b35c0207655ef1ae`, branch `dev-test01`.
Machine: Apple M1 (8 cores), 16 GB RAM, macOS 26.5.1 (25F80), Docker Desktop 28.5.2.

## What I found before writing this

- A drawn shape is a `LabeledShape` row (`cvat/apps/engine/models.py`). Its class is the
  `label` foreign key to `Label`. It points at a `Job`, not a task: task → `Segment` → `Job`
  → `LabeledShape`. Tracks (`LabeledTrack`) and tags (`LabeledImage`) carry `label` the same way.
- Labels can live on the task or on its project. `Task.get_labels()` already resolves that.
- Skeleton points are child `LabeledShape` rows with `parent` set. Counting only
  `parent IS NULL` avoids counting one skeleton many times.
- Ground-truth/consensus jobs repeat frames from the annotation jobs, so I count only
  `Job.type == "annotation"`.
- Access control: other apps call `TaskPermission.create_scope_view(request, task).check_access()`,
  which runs CVAT's existing OPA "view task" policy. I reuse it rather than write a new policy.
- The UI already ships `chart.js` + `react-chartjs-2`, and `core.server.request` sends
  authenticated calls. No new dependencies are needed for items 1–7.
- Every annotation save, delete and import ends in `JobAnnotation._set_updated_date()` →
  `Task.touch()` → `save(update_fields=["updated_date"])`. A `post_save` receiver on `Task` in my
  own app is a live-update hook that needs no change to engine code.
- The server is uvicorn (ASGI) with `websockets` installed, and nginx in the image already
  forwards `Upgrade` headers. Django Channels is **not** installed.
- The stock `docker compose up` pulls prebuilt images, so I build `cvat_server` and `cvat_ui`
  from this branch with `docker-compose.dev.yml`.

## Order and time budget (8 h)

| # | Work | Budget |
|---|------|--------|
| — | Read brief, explore code, write these three docs | 0:45 |
| 1 | App `cvat.apps.test`: `GET /api/test/tasks/{id}/label-counts`, one SQL `GROUP BY label` per annotation table | 1:00 |
| 2–4 | UI page `/tasks/:tid/label-counts`, bar chart, empty state, error state, link in the task actions menu | 1:30 |
| 5 | Wire `IsAuthenticated` + task view permission; show 401 and 403 with curl and a second user | 0:30 |
| 6 | Measure MO-1 (5 runs), save raw output | 0:45 |
| 7 | Group by shape type (stacked bars) | 0:30 |
| 8–9 | WebSocket: Redis pub/sub on task change → page refetches; reconnect with backoff | 1:30 |
| 10 | Decision record, tick Definition of Done with evidence, open PR on my fork | 0:30 |
| — | Buffer for image builds and COCO import surprises | 0:00–0:30 |

Items 1–4 come first. I do not start item 8 until the page shows its empty and error states.

## Choices made up front

- **Item 7, grouping by shape type.** A class with 3,000 annotations that are all masks is no help
  to someone training a box detector. Splitting each bar by type (rectangle / polygon / mask /
  track / tag) answers "can I train *this* model on it". The COCO import produces both polygons and
  masks, so the split shows up in real data. It costs one extra column in the same `GROUP BY`.
- **Item 8, notify then refetch.** The socket carries only "task N changed". The page then calls
  the REST endpoint again. Counts and permission checks live in one place, and a reconnect
  refetches, which also catches anything missed while offline.
- **WebSocket auth.** Browsers cannot set headers on a WebSocket. The page first asks an
  authenticated REST endpoint for a short-lived signed ticket (`django.core.signing`, 60 s), then
  opens the socket with it. The socket handler checks the signature only; the OPA check already ran
  on the REST call.

## Decided to skip

- Project-level and job-level counts, and any server-side cache of the counts.
- A changelog fragment and REST API schema regeneration (`cvat/schema.yml`). This branch is not
  going upstream.
- Automated tests inside CVAT's REST test suite (`tests/python`). It needs its own fixture stack.
  I verify by hand with curl and record the output instead.
- Track counts per frame. A track counts as one object, not one box per frame it spans.

## Changes to this plan

1. **Stack: published images with branch files mounted, not a source build.** The network
   here ran at ~1 KB/s to ~250 KB/s and the disk had 4–9 GB free, so a from-source build
   of `cvat_server` was not practical. I pulled `cvat/server:dev` and `cvat/ui:dev`, and first
   checked that `cvat/settings/base.py`, `cvat/urls.py`, `cvat/asgi.py`, `engine/models.py`,
   `engine/permissions.py`, `iam/permissions.py` and `dataset_manager/task.py` inside the image
   are byte-identical to `8d7ae75`. I then bind-mounted only the files this branch changes into
   every service built from that image, plus the locally built `cvat-ui/dist` into `cvat_ui`.
   The compose override that does this lives outside the repo. `docker compose -f docker-compose.yml
   -f docker-compose.dev.yml up -d --build` is the reproducible equivalent. Cost: the image is
   `linux/amd64` only and runs emulated on this M1, so all timings carry that overhead.
2. **Data: 1,000 images, not 5,000.** For the same network reason, task #1 holds the first 1,000
   val2017 images by file name (7,204 COCO objects). I pulled `instances_val2017.json` out of the
   remote zip with HTTP range requests (6.5 MB instead of 241 MB) and filtered it to those images
   before importing it as COCO 1.0.
3. **Item 5 moved into item 1.** CVAT's `PolicyEnforcer` asserts that every view has an
   `iam_permission_class`, so the endpoint could not exist without its permission. Item 5 became
   showing the evidence.
4. **The endpoint counts CVAT shapes, not COCO objects.** The import produced 8,109 shapes from
   7,204 objects. CVAT stores each part of a multi-part COCO polygon as its own `LabeledShape`
   (8,022 polygon parts + 87 crowd masks = 8,109, checked against the JSON), and `group` does not
   rebuild the original objects (6,557 ungrouped + 57 groups ≠ 7,117). I kept shape counts. They are
   what an annotator sees and edits in the job, and they match the database exactly.
5. **MO-1 measured with a session cookie, not Basic auth.** Changed before measuring, for the
   reason given in `objectives.md`.

## Decision record

_(Written when item 10 is reached.)_
