#!/bin/bash
# Runs Caddy and the Astro SSR server side by side, after deriving the origins
# the Caddyfile's CSPs interpolate. Same shape as the sample site's entrypoint:
# two processes, no supervisor, and if either dies the container dies with it
# so the platform restarts it rather than serving a half-working site.
#
# bash, not /bin/sh: `wait -n` is a bashism that busybox ash does not implement.
set -eu

term() {
	trap - TERM INT
	kill 0
}
trap term TERM INT

# Scheme-and-host only: as a CSP source a path reads as a prefix restriction.
origin() {
	printf '%s' "${1%/}" | sed -E 's#^(https?://[^/]+).*#\1#'
}

ws_origin() {
	printf '%s' "${1%/}" | sed -e 's#^https://#wss://#' -e 's#^http://#ws://#'
}

# The CMS origin: the API the /admin editor talks to, and the origin the
# site's PKCE redirect leaves for. Derived from ROADMAP_CMS_URL (the site's
# own variable) or GITCMS_API_URL (the editor build's), whichever is set.
if [ -z "${CMS_API_ORIGIN:-}" ]; then
	if [ -n "${ROADMAP_CMS_URL:-}" ]; then
		CMS_API_ORIGIN="$(origin "$ROADMAP_CMS_URL")"
	elif [ -n "${GITCMS_API_URL:-}" ]; then
		CMS_API_ORIGIN="$(origin "$GITCMS_API_URL")"
	fi
fi
export CMS_API_ORIGIN="${CMS_API_ORIGIN:-}"

CMS_WS_ORIGINS=""
if [ -n "${CMS_API_ORIGIN:-}" ]; then
	CMS_WS_ORIGINS="$(ws_origin "$CMS_API_ORIGIN")"
fi
if [ -n "${CMS_COLLAB_ORIGIN:-}" ]; then
	CMS_WS_ORIGINS="$CMS_WS_ORIGINS ${CMS_COLLAB_ORIGIN%/} $(ws_origin "$CMS_COLLAB_ORIGIN")"
fi
export CMS_WS_ORIGINS

CMS_PREVIEW_ORIGIN=""
if [ -n "${CMS_PREVIEW_SERVER:-}" ]; then
	CMS_PREVIEW_ORIGIN="$(origin "$CMS_PREVIEW_SERVER")"
fi
export CMS_PREVIEW_ORIGIN

export CMS_EDITOR_ORIGINS="${CMS_EDITOR_ORIGINS:-}"

if [ -z "${CMS_PREVIEW_SECRET:-}" ]; then
	echo "WARNING: CMS_PREVIEW_SECRET is unset — the preview middleware will accept" >&2
	echo "unsigned draft payloads, which lets anyone inject content into rendered pages." >&2
fi
if [ -z "${ROADMAP_CMS_TOKEN:-}" ]; then
	echo "WARNING: ROADMAP_CMS_TOKEN is unset — endorsement counts will be unavailable and voting disabled." >&2
fi
if [ -z "${ROADMAP_SESSION_SECRET:-}" ]; then
	echo "WARNING: ROADMAP_SESSION_SECRET is unset — sign-in is off; the roadmap renders signed out." >&2
fi

caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &

# PORT is Caddy's. The @astrojs/node standalone server reads PORT too, so it
# is overridden for this one process with ASTRO_PORT, which the Caddyfile
# already proxies to.
PORT="${ASTRO_PORT:-4321}" node /app/dist/server/entry.mjs &

wait -n
status=$?
term
exit "$status"
