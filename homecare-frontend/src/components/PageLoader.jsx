// Shown briefly while a lazy-loaded route's JS chunk is still downloading.
// Matches the app's dark theme so a route change never flashes an
// unstyled white screen while Suspense waits for the chunk.
export default function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-500" />
        <span className="text-xs font-medium text-slate-500">Loading…</span>
      </div>
    </div>
  );
}
