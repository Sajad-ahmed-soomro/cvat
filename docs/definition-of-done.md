# Definition of Done

Written before starting. Each line is ticked only with a number, file or command output beside it.

## Floor (items 1–4)

- [ ] Endpoint counts match an independent count of the same task (a direct SQL query in `cvat_db`,
      and the per-category counts in `instances_val2017.json` for the imported images).
- [ ] Labels with zero annotations appear with `count: 0` and are not left out.
- [ ] Page opens from the task's Actions menu and draws one bar per label.
- [ ] Empty state: a task with labels but no annotations shows a message, not an empty chart.
- [ ] Error state: a failed request (server stopped, or a task id that does not exist) shows an
      error with a retry button, not a blank page.

## Beyond the floor

- [ ] No login → 401. Logged in without access to the task → 403. Both shown with curl output.
- [ ] MO-1 measured: 5 runs, raw output saved, median and spread reported.
- [ ] MO-1 target met, or missed with the reason written down.
- [ ] Shape-type grouping visible in the chart and present in the API response.
- [ ] Drawing a box in a job updates the open chart without a reload.
- [ ] Stopping the server and starting it again: the page shows it is disconnected, reconnects
      by itself, and shows current counts.
- [ ] Decision record written in `plan.md`.

## Hygiene

- [ ] Backend change lives in `cvat/apps/test`. Edits outside it are listed in the PR with a reason.
- [ ] No dead code, no commented-out blocks, no stray files. `git diff develop --stat` reviewed.
- [ ] Every commit message says what changed and why.
- [ ] Everything not finished is listed below.

## Not finished

_(Filled in at the end.)_
