import { Link } from "react-router-dom";
import { btnPrimary } from "../lib/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-sm px-6 py-24 text-center">
      <h1 className="font-display text-4xl text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-ink-soft">
        That page doesn't exist, or you don't have access to it.
      </p>
      <Link to="/" className={`${btnPrimary} mt-6 inline-flex`}>
        Back to services
      </Link>
    </div>
  );
}
