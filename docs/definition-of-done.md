# Definition of Done

Written before starting (commit `5f9ccdb`). Ticked at the end. Each tick has a number, file or
command output beside it. Task #1 = first 1,000 COCO val2017 images, task #2 = 2 labels, 3 images,
no annotations.

## Floor (items 1–4)

- [x] Endpoint counts match an independent count of the same task (a direct SQL query in `cvat_db`,
      and the per-category counts in `instances_val2017.json` for the imported images).
      **SQL: identical for all 80 labels, total 8,109.** Per (label, shape type): all 99 pairs identical.
      **COCO JSON: does not match, and that is explained.** The JSON has 7,204 objects. CVAT stores each
      part of a multi-part polygon as its own shape: 8,022 polygon parts + 87 crowd masks = 8,109
      exactly. See plan, change 4.
      Rules not exercised by COCO checked on task #2: 1 rectangle + 1 tag + 1 track spanning 3 frames
      → `{"person": {"rectangle": 1}, "car": {"track": 1, "tag": 1}}`, total 3. The track counts once
      while `engine_trackedshape` holds 3 rows for it.
- [x] Labels with zero annotations appear with `count: 0` and are not left out.
      Task #1 returns 80 labels, including `hair drier` with `count: 0` (79 categories are present in
      the 1,000 images). Task #2 returns both labels with 0.
- [x] Page opens from the task's Actions menu and draws one bar per label.
      [`evidence/page-actions-menu.png`](evidence/page-actions-menu.png) (entry links to
      `/tasks/1/label-counts`), [`evidence/page-data.png`](evidence/page-data.png) (80 bars).
- [x] Empty state: a task with labels but no annotations shows a message, not an empty chart.
      [`evidence/page-empty.png`](evidence/page-empty.png): "This task has no annotations yet".
- [x] Error state: a failed request (server stopped, or a task id that does not exist) shows an
      error with a retry button, not a blank page.
      [`evidence/page-error-not-found.png`](evidence/page-error-not-found.png) (task 99999) and
      [`evidence/page-error-forbidden.png`](evidence/page-error-forbidden.png) (user without access).

## Beyond the floor

- [x] No login → 401. Logged in without access to the task → 403. Both shown with curl output.
      [`evidence/access-control.txt`](evidence/access-control.txt): no login 401; `outsider` on
      task #1 403; the same `outsider` on task #2, where they are assignee, 200. Access follows
      CVAT's task rules, not an admin-only check. The live-ticket action gives the same 403, and a
      forged or other-task ticket is refused at the WebSocket handshake with HTTP 403.
- [x] MO-1 measured: 5 runs, raw output saved, median and spread reported.
      [`evidence/mo1-label-counts-latency.txt`](evidence/mo1-label-counts-latency.txt) and the
      re-run on the final code, [`evidence/mo1-label-counts-latency-final.txt`](evidence/mo1-label-counts-latency-final.txt),
      5 × 50 requests each.
- [x] MO-1 target met, or missed with the reason written down.
      Met: median p95 **27.5 ms** (27.2 – 27.8) on the final code, against 150 ms. The baseline is
      1,041 ms. The target turned out loose; [`objectives.md`](objectives.md) says why and what I would
      measure next.
- [x] Shape-type grouping visible in the chart and present in the API response.
      `count_by_kind` in the response; stacked bars and legend in
      [`evidence/page-data.png`](evidence/page-data.png); exact numbers in
      [`evidence/page-table.png`](evidence/page-table.png) (person: 2,447 polygon + 52 mask = 2,499).
- [x] Drawing a box in a job updates the open chart without a reload.
      [`evidence/live-updates.txt`](evidence/live-updates.txt): a rectangle saved through the job
      annotations API showed as 8,110 on the open page 1.4 s after the save was sent. The legend gains
      "Rectangle": [`evidence/live-after-create.png`](evidence/live-after-create.png).
      Not done in the annotation editor itself. The change goes through the same
      `PATCH /api/jobs/{id}/annotations` the editor uses to save.
- [x] Stopping the server and starting it again: the page shows it is disconnected, reconnects
      by itself, and shows current counts.
      [`evidence/live-updates.txt`](evidence/live-updates.txt) and
      [`evidence/live-offline.png`](evidence/live-offline.png): with Traefik stopped, the page shows
      "Offline, reconnecting…". A rectangle created meanwhile appeared 2.3 s after Traefik came
      back. After a `cvat_server` stop/start the page was live again 31 s later, by itself.
- [x] Decision record written in `plan.md`.
      [`plan.md`, "Decision record"](plan.md#decision-record).

## Hygiene

- [x] Backend change lives in `cvat/apps/test`. Edits outside it are listed in the PR with a reason.
      `git diff develop --stat`: 21 files, +714, 0 deletions. Outside `cvat/apps/test` and
      `cvat-ui/src/components/label-counts`: `cvat/settings/base.py` +1 (install the app),
      `cvat/urls.py` +3 (route it), `cvat/asgi.py` +5 (route the WebSocket), `cvat-app.tsx` +2
      (page route), `actions-menu-items.tsx` +6 (menu entry).
- [x] No dead code, no commented-out blocks, no stray files. `git diff develop --stat` reviewed.
      Python passes `black --check` and `isort --check` with the repo's `pyproject.toml`, plus `flake8`
      at line length 100. TypeScript passes the repo's ESLint and `tsc --noEmit`. The only flake8 note
      is the `from . import signals` in `apps.py`, the same idiom `consensus/apps.py` uses.
- [x] Every commit message says what changed and why. `git log develop..dev-test01`.
- [x] Everything not finished is listed below.

## Not finished

- **Automated tests.** Nothing was added to CVAT's `tests/python` suite or as Django unit tests.
  Everything above was checked by hand or by throw-away scripts against the running stack. Their output
  is in `evidence/`, but nobody can rerun the checks in CI.
- **Full data set and a larger one.** 1,000 of the 5,000 val2017 images, because of the network.
  MO-1 was not tested at a scale where it could fail.
- **Native build.** The stack ran the published `linux/amd64` image under emulation with the branch's
  files mounted (plan, change 1). The from-source `docker-compose.dev.yml` build was not run.
- **Not covered by any check:** an expired (> 60 s) WebSocket ticket; a task inside a project
  (labels come from the project); organizations and their roles; several pages on several uvicorn
  processes at once (pub/sub is meant for exactly this, but only one page was tested).
- **Known limits I chose to keep:**
  - A page that loses access to a task keeps its open socket, which only ever says "changed", and its
    next refetch gets 403.
  - Reconnect backoff caps at 30 s, which makes recovery after a long outage up to 30 s late (plan, change 6).
  - `cvat/schema.yml` was not regenerated for the new endpoints.
