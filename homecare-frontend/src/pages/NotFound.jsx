import { Link } from "react-router-dom";
import { btnPrimary } from "../lib/ui";
import Footer from "../components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div className="mx-auto max-w-md px-6 py-24 text-center my-auto space-y-4">
        <div className="text-6xl font-black text-amber-500 font-display">404</div>
        <h1 className="font-display text-3xl font-bold text-white">Page Not Found</h1>
        <p className="text-sm text-slate-400">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="pt-4">
          <Link to="/" className={btnPrimary}>
            ← Return to Services Catalog
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
