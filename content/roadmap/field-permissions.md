---
title: Role-based field permissions
area: Auth
status: In progress
blurb: Lock a field to a role without forking the schema.
mockup: form
updated: 2026-09-03
order: 2
---
A marketing editor should be able to change the headline but not the slug or the canonical URL. Permissions attach to fields in the collection schema and are enforced server-side on commit.

Read-only fields render as static values with a lock and a note on who can change them.
