# roadmap

The public [Go Git CMS](https://github.com/go-git-cms/gogitcms) roadmap, and
the reference example of an **interactive** site built on the CMS.

Features are content entries in this repository. Endorsements and private
notes are **not**: they post to the CMS form API, so voting never writes a
commit. Anyone can read the roadmap; endorsing takes a CMS session.

```bash
pnpm install
cp .env.example .env    # then fill in the CMS bits, see below
pnpm dev                # http://localhost:4350
pnpm test               # scoring, aggregation, the session cookie
```

Astro in **server** mode with React islands on `@gogitcms/design-system`.
`pnpm build` produces the Node server that the `Dockerfile` ships behind Caddy.

## What's in it

| Route | What |
|---|---|
| `/` | The board: kanban lanes by delivery status. `?area=` filters, `?feature=` opens the detail modal |
| `/endorsements` | The ranked list, by weighted score |
| `/me` | Your endorsements, notes included. Session-gated |
| `/auth/login` `/auth/callback` `/auth/logout` `/auth/token` | Sign-in through the CMS |
| `/api/endorse` | `POST` / `DELETE` a vote. The only way a vote reaches the CMS |
| `/api/aggregates` `/api/me/endorsements` | The public counts; your own rows |
| `/api/preview` `/api/exit-preview` | CMS draft preview |

| Content | Model | Where |
|---|---|---|
| Features | `roadmap` | `content/roadmap/*.md`, one file per feature |
| Endorsements | `roadmap-endorsement` form | The CMS database. Never in the repo |

Both are declared in `go-git-cms.yml`.

## The part worth reading: the privacy model

A vote has a public half (its weight) and a private half (the note to
maintainers). The split is enforced **server-side**, and every rule on the
form is role-gated:

- The browser never talks to the CMS. It talks to this site's `/api` routes,
  which verify the session and derive `submittedBy` from it. A `submittedBy`
  in a request body is ignored.
- The site holds the only credential that touches the form: a content token
  (`ROADMAP_CMS_TOKEN`) assuming the `editor` role with write scope. It
  submits on a visitor's behalf, reads every row back to compute the public
  counts, and deletes a row when a visitor withdraws.
- The public payload (`/api/aggregates`, and what the board renders) carries
  counts and a note *count*. A note itself only ever leaves the server on
  `/api/me/endorsements`, scoped to the session that wrote it. Maintainers
  read notes in the CMS editor's Forms section.
- One vote per person per feature. The CMS stores every submission as its own
  row; the site posts the new row, then deletes the old ones, and the
  aggregator takes the newest row per `(submittedBy, featureId)` so a failed
  delete leaves a stale duplicate rather than a lost vote.

Scoring is `must × 3 + nice × 1`. `none` ("don't care") is stored, not
deleted, because it is signal too. Bars are normalised against the highest
score in the whole set, so filtering doesn't rescale them.

## Sign-in

"Sign in with CMS session" is PKCE against the CMS: a top-level redirect to
`/api/v1/auth/authorize`, where the CMS reads its own session cookie and hands
back a code, then a back-channel exchange for an access token that this site
keeps in its own signed, HttpOnly cookie. The roadmap takes the handle and
avatar initials, nothing else, and never sees a password.

Two things the CMS deployment must know:

1. **Trust this origin.** The CMS only mints codes for redirect targets on its
   allowlist. Add the roadmap's origin to `CMS_DOCS_URL` on the CMS, which is a
   comma-separated list of first-party origins:
   `CMS_DOCS_URL=https://gogitcms.com,https://roadmap.gogitcms.com`.
2. **A content token.** Repository settings → Content tokens: role `editor`,
   write scope, on the repository whose `go-git-cms.yml` declares the form.
   Put it in `ROADMAP_CMS_TOKEN`.

Everything degrades when unset: no session secret means the site renders
signed out; no token means counts read "unavailable" and voting is disabled.
See `.env.example` for the full list.

## Preview

The site is `output: "server"`, so preview is the SSR-middleware case:
`@gogitcms/preview-astro` verifies the signed draft the editor's Preview pane
sends, `src/middleware.ts` puts it on `Astro.locals.preview`, and
`src/lib/content.ts` composes it over the files before the page renders. A
roadmap entry previews on the board with its own modal open (`cms.config.mjs`).

Set `CMS_PREVIEW_SECRET` to the value the CMS signs payloads with. Unset, the
middleware accepts unsigned payloads and says so on every request.

## Editing the roadmap

Every feature is a markdown file:

```yaml
---
title: Scheduled publishing
area: Sync                 # Editor | API | Auth | Media | Sync
status: Planned            # Exploring | Planned | In progress | Shipped
blurb: Queue a commit for a date and let the runner land it.
mockup: schedule           # optional: diff | form | browser | schedule
updated: 2026-09-04        # shown as "2h ago"
shippedIn: v1.4            # shipped items show this instead
order: 1                   # tie-break within a lane
---
What the problem is.

A note on scope or current state.
```

The filename is the feature's id: the `?feature=` deep link and the
`featureId` every endorsement names. Renaming a file orphans its votes.

`mockup` names a live illustration in `src/components/mockups/`, composed
from design-system components rather than screenshots. Four shapes exist; a
new feature reuses one or adds a sibling.

## Deploying

`Dockerfile` builds from the **monorepo root** (it uses the workspace lockfile
and `pnpm --filter`); a checkout of this standalone repository builds with
`pnpm install && pnpm build` and runs `node dist/server/entry.mjs`. The
`Caddyfile` and `docker-entrypoint.sh` are what put Caddy in front of that
server in the container.

## The editor at /admin

The CMS editor is bundled into the site itself, so the roadmap is edited from
the origin that shows it, the same way the docs site does.

```bash
make roadmap-dev            # builds the editor into public/admin, then astro dev
open http://localhost:4350/admin/
```

`cms.config.mjs` pins the editor to the `roadmap` project and mounts it at
`/admin/`; `src/pages/admin/[...path].astro` answers the SPA's deep links with
its `index.html` so a reload inside the editor keeps working. Locally the
editor talks to a CMS on `localhost:8080` (pair with `make server-dev`) and
asks for the workspace and repository; set `GITCMS_WORKSPACE_ID` and
`GITCMS_REPOSITORY_ID` to skip the pickers. Sign-in needs the site's origin
registered as an editor in the dashboard, or in `CMS_DOCS_URL`.

In the container the editor is opt-in: an image built with `GITCMS_API_URL`
(and the ids) carries `/admin`, served by Caddy; one built without has no
`/admin` at all. `public/admin/` is never committed.

## This repository is a mirror

Development happens in the monorepo at `apps/roadmap`; a GitHub Action
(`sync-roadmap.yml` there) replays that directory's history here on every
change to `main`. Pull requests are welcome against the monorepo.
