import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon, SectionLabel } from "@gogitcms/design-system/web";
import type { Aggregates, Mine } from "~/lib/endorsements";
import { compareRanked, maxScoreOf, score, withOwnVote, ZERO, type Weight } from "~/lib/score";
import type { AppProps } from "./types";
import { AREA_FILTERS, type Row } from "./model";
import { TopBar } from "./TopBar";
import { Board } from "./Board";
import { RankedTable } from "./RankedTable";
import { MyEndorsements } from "./MyEndorsements";
import { FeatureDetail } from "./FeatureDetail";
import { SignInDialog } from "./SignInDialog";
import { Toast, type ToastState } from "./Toast";

const TOAST_MS = 2600;

/**
 * The island. Server-rendered with everything it needs (see src/lib/page.ts)
 * and hydrated once; from then on the URL is the source of truth for the
 * filter (`?area=`) and the open feature (`?feature=`), and the votes are
 * optimistic over the server's aggregate until each write reconciles them.
 *
 * `base` is the server's truth: the public aggregate, the number of endorsers,
 * and the votes it had already counted for this viewer when it took the
 * aggregate. `votes`/`notes` are the viewer's current state. The counts shown
 * are base adjusted by the difference, so a click moves exactly one unit.
 */
export default function RoadmapApp(props: AppProps) {
  const { view, features, viewer, authEnabled, canEndorse, cmsHost, stats, footer } = props;

  const [base, setBase] = useState<{ aggregates: Aggregates | null; endorsers: number | null; mine: Mine | null }>({
    aggregates: props.aggregates,
    endorsers: props.endorsers,
    mine: props.mine,
  });
  const [votes, setVotes] = useState<Record<string, Weight>>(props.mine?.votes ?? {});
  const [notes, setNotes] = useState<Record<string, string>>(props.mine?.notes ?? {});
  const [area, setArea] = useState(props.initialArea);
  const [openId, setOpenId] = useState<string | null>(props.initialFeature);
  const [signInOpen, setSignInOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((text: string, error = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, error });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  // ---- URL: the filter and the open feature ------------------------------

  const writeUrl = useCallback((next: { area?: string; feature?: string | null }, push: boolean) => {
    const url = new URL(window.location.href);
    if (next.area !== undefined) {
      if (next.area === "All") url.searchParams.delete("area");
      else url.searchParams.set("area", next.area);
    }
    if (next.feature !== undefined) {
      if (next.feature) url.searchParams.set("feature", next.feature);
      else url.searchParams.delete("feature");
    }
    // `pushed` marks an entry this island created by opening a feature, so
    // closing it can go back rather than leave a dead entry behind. A replace
    // (filter change, dropping ?auth=) must carry the marker forward, and a
    // fresh load has none: going back from there would land on whatever page
    // came before, which after a sign-in round-trip is a stale, signed-out
    // copy of this one.
    const pushed = push || Boolean(window.history.state?.rmPushed);
    const state = { rmPushed: pushed };
    if (push) window.history.pushState(state, "", url);
    else window.history.replaceState(state, "", url);
  }, []);

  useEffect(() => {
    // The sign-in callback lands with ?auth=<reason>; say it once and drop it.
    if (props.authNotice) {
      const url = new URL(window.location.href);
      url.searchParams.delete("auth");
      window.history.replaceState({ rmPushed: false }, "", url);
      switch (props.authNotice) {
        case "ok":
          flash(`Signed in · session read from ${cmsHost}`);
          break;
        case "signin":
          flash(`Sign in to ${cmsHost} first, then try again`, true);
          break;
        case "expired":
          flash("That sign-in attempt expired. Try again", true);
          break;
        default:
          flash("Sign-in failed. Try again", true);
      }
    }
    const onPop = () => {
      const url = new URL(window.location.href);
      const f = url.searchParams.get("feature");
      setOpenId(f && features.some((x) => x.id === f) ? f : null);
      const a = url.searchParams.get("area");
      setArea(a && (AREA_FILTERS as readonly string[]).includes(a) ? a : "All");
    };
    window.addEventListener("popstate", onPop);
    // A page restored from the back-forward cache was rendered for whoever
    // was signed in at the time. Sign-in and sign-out are full navigations, so
    // a restored copy may show the wrong session: render it again.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pageshow", onShow);
    };
    // Mount-only: the notice and the listener belong to the page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickArea = (a: string) => {
    setArea(a);
    writeUrl({ area: a }, false);
  };

  const openFeature = useCallback(
    (id: string) => {
      setOpenId(id);
      writeUrl({ feature: id }, true);
    },
    [writeUrl],
  );

  const closeFeature = useCallback(() => {
    setOpenId(null);
    if (window.history.state?.rmPushed) window.history.back();
    else writeUrl({ feature: null }, false);
  }, [writeUrl]);

  const askSignIn = useCallback(() => setSignInOpen(true), []);
  const closeSignIn = useCallback(() => setSignInOpen(false), []);

  // ---- derived rows ---------------------------------------------------------

  const rows: Row[] = useMemo(
    () =>
      features.map((feature) => {
        const mine = votes[feature.id];
        const counts = base.aggregates
          ? withOwnVote(base.aggregates[feature.id] ?? ZERO, base.mine?.votes[feature.id], mine)
          : null;
        return { feature, counts, score: counts ? score(counts) : null, mine };
      }),
    [features, votes, base],
  );
  const maxScore = useMemo(() => maxScoreOf(rows.map((r) => r.counts ?? ZERO)), [rows]);
  const visible = area === "All" ? rows : rows.filter((r) => r.feature.area === area);
  const ranked = [...visible].map((r) => ({ ...r, title: r.feature.title, counts: r.counts ?? ZERO })).sort(compareRanked);
  const open = openId ? rows.find((r) => r.feature.id === openId) ?? null : null;
  const mineCount = Object.values(votes).filter((w) => w !== "none").length;

  // ---- writes ---------------------------------------------------------------

  type WriteResult = { ok: boolean; message?: string; code?: string; aggregates?: Aggregates | null; endorsers?: number | null; mine?: Mine | null };

  async function call(method: "POST" | "DELETE", body: unknown): Promise<WriteResult> {
    const res = await fetch("/api/endorse", {
      method,
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as WriteResult;
  }

  function reconcile(r: WriteResult) {
    setBase({ aggregates: r.aggregates ?? null, endorsers: r.endorsers ?? null, mine: r.mine ?? null });
    setVotes(r.mine?.votes ?? {});
    setNotes(r.mine?.notes ?? {});
  }

  async function write(featureId: string, weight: Weight, note: string): Promise<boolean> {
    if (!viewer) {
      setSignInOpen(true);
      return false;
    }
    if (!canEndorse) {
      flash("Endorsements are unavailable on this deployment", true);
      return false;
    }
    setPending(true);
    try {
      const r = await call("POST", { featureId, weight, note });
      if (!r.ok) {
        if (r.code === "unauthenticated") setSignInOpen(true);
        else flash(r.message ?? "Could not save the endorsement", true);
        // Roll the optimistic vote back to what the server last confirmed.
        setVotes(base.mine?.votes ?? {});
        return false;
      }
      reconcile(r);
      return true;
    } catch {
      flash("Could not reach the roadmap server", true);
      setVotes(base.mine?.votes ?? {});
      return false;
    } finally {
      setPending(false);
    }
  }

  const onWeight = async (w: Weight) => {
    if (!open) return;
    const id = open.feature.id;
    setVotes((v) => ({ ...v, [id]: w }));
    await write(id, w, notes[id] ?? "");
  };

  const onSave = async (draft: string) => {
    if (!open) return;
    const id = open.feature.id;
    // Saving a note without a weight is an endorsement at the lighter weight.
    const weight = votes[id] ?? "nice";
    if (await write(id, weight, draft.trim())) {
      closeFeature();
      flash("Endorsement saved · forms/roadmap-endorsement · no commit");
    }
  };

  const onWithdraw = async () => {
    if (!open || !viewer) return;
    const id = open.feature.id;
    setPending(true);
    try {
      const r = await call("DELETE", { featureId: id });
      if (!r.ok) {
        if (r.code === "unauthenticated") setSignInOpen(true);
        else flash(r.message ?? "Could not withdraw the endorsement", true);
        return;
      }
      reconcile(r);
      closeFeature();
      flash("Endorsement withdrawn");
    } catch {
      flash("Could not reach the roadmap server", true);
    } finally {
      setPending(false);
    }
  };

  // Where sign-in returns to: this page, filter and open feature included.
  const signInNext = (() => {
    const path = view === "ranked" ? "/endorsements" : view === "me" ? "/me" : "/";
    const q = new URLSearchParams();
    if (area !== "All") q.set("area", area);
    if (openId) q.set("feature", openId);
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  })();

  return (
    <div className="rm-shell">
      <TopBar view={view} area={area} viewer={viewer} authEnabled={authEnabled} mineCount={mineCount} onSignIn={askSignIn} />

      {view !== "me" && (
        <>
          <div className="rm-header">
            <div className="rm-header__lede">
              <h1>What we're building next</h1>
              <p>
                Every item here is a content entry in this site's repo. Endorsements and notes are not: they post to
                the form API, so voting never writes a commit.
              </p>
            </div>
            <div className="rm-spacer" />
            <div className="rm-stats">
              <div className="rm-stat">
                <SectionLabel className="rm-label">Entries</SectionLabel>
                <div className="rm-stat__value">{stats.entries}</div>
              </div>
              <div className="rm-stat">
                <SectionLabel className="rm-label">Endorsers</SectionLabel>
                <div className="rm-stat__value">{base.endorsers == null ? "—" : base.endorsers.toLocaleString("en-US")}</div>
              </div>
              <div className="rm-stat">
                <SectionLabel className="rm-label">Last sync</SectionLabel>
                <div className="rm-stat__value">{stats.lastSync}</div>
              </div>
            </div>
          </div>

          <div className="rm-filters" role="group" aria-label="Filter by area">
            <SectionLabel className="rm-label">Area</SectionLabel>
            {AREA_FILTERS.map((a) => (
              <button
                key={a}
                type="button"
                className={["rm-chip", area === a && "rm-chip--active"].filter(Boolean).join(" ")}
                aria-pressed={area === a}
                onClick={() => pickArea(a)}
              >
                {a}
              </button>
            ))}
            <div className="rm-spacer" />
            <span className="rm-formula rm-mono">score = must-have × 3 + nice-to-have × 1</span>
          </div>
          {!base.aggregates && <div className="rm-unavailable rm-mono">Endorsement counts are unavailable.</div>}

          {view === "board" ? (
            <Board rows={visible} maxScore={maxScore} onOpen={openFeature} />
          ) : (
            <RankedTable rows={ranked} maxScore={maxScore} onOpen={openFeature} />
          )}
        </>
      )}

      {view === "me" && viewer && <MyEndorsements viewer={viewer} rows={rows} notes={notes} onOpen={openFeature} />}

      <footer className="rm-footer rm-mono">
        <Icon name="gitCommit" size={14} />
        <span>
          content/roadmap/*.md · {footer.sha ?? "working copy"} · built with Astro
        </span>
        <div className="rm-spacer" />
        <a href={footer.sourceUrl}>Read the source</a>
      </footer>

      {open && (
        <FeatureDetail
          row={open}
          maxScore={maxScore}
          viewer={viewer}
          canEndorse={canEndorse}
          savedNote={notes[open.feature.id] ?? ""}
          pending={pending}
          onClose={closeFeature}
          onWeight={onWeight}
          onSave={onSave}
          onWithdraw={onWithdraw}
          onSignIn={askSignIn}
        />
      )}

      {signInOpen && <SignInDialog next={signInNext} cmsHost={cmsHost} onClose={closeSignIn} />}

      <Toast toast={toast} />
    </div>
  );
}
