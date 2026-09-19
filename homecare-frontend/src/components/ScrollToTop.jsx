import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Resets scroll position on every route change, smoothly. Without this,
// React Router keeps the browser's natural scroll position when navigating
// to a new route, so going from a scrolled-down page (e.g. deep in the
// Home catalog) to a new page (e.g. Cart) lands you mid-page instead of
// at the top — a common, jarring SPA bug.
//
// Two things this deliberately does NOT override:
// - In-page anchor links (e.g. href="#services-catalog" on Home) still
//   scroll to that section instead of being yanked back to the top.
// - Actual back/forward browser button presses during this session keep
//   restoring the scroll position the visitor was at, matching native
//   multi-page-site behavior, instead of always jumping to the top.
//
// A hard refresh (F5) is also reported as a "POP" navigation by React
// Router — identical in type to a real back/forward press — so it can't be
// told apart from those using navigationType alone. isInitialMount below
// specifically catches "this is the very first render of the app", which
// covers both a fresh page load and a refresh, and always sends those to
// the top (paired with history.scrollRestoration = 'manual' in main.jsx,
// which stops the browser from restoring an old offset before React even
// mounts).
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (hash) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      return;
    }

    if (navigationType === "POP") return; // real back/forward — preserve scroll

    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname, hash, navigationType]);

  return null;
}
