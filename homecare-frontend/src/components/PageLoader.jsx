import HomeCareSpinner from "./HomeCareSpinner";

// Shown briefly while a lazy-loaded route's JS chunk is downloading.
export default function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-950">
      <HomeCareSpinner size="lg" label="Loading HomeCare..." />
    </div>
  );
}
