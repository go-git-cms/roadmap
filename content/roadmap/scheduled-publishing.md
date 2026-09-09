---
area: Sync
blurb: Queue a commit for a date and let the runner land it.
mockup: schedule
order: 1
status: Planned
title: Scheduled publishing
updated: "2026-09-04"
---
Pick a time, and the commit is held until then rather than merged immediately. The entry stays visible as scheduled in the editor so nobody edits it out from under the queue.

Runs on a scheduled worker; a failed publish surfaces as a notification with the reason, not a silent no-op.
