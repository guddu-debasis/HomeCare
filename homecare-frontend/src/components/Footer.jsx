import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-800 bg-slate-950/80 text-slate-400">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold font-display text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-md">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              </div>
              <span className="font-extrabold text-white">
                Home<span className="text-amber-400">Care</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400 max-w-sm">
              Connecting homes and families with certified, background-checked specialists. Guaranteed quality, upfront transparent pricing, and 30-day rework warranty.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-emerald-400 font-medium">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              Over 10,000+ verified home service bookings completed
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-amber-400 transition-colors">AC & Cooling Repair</Link></li>
              <li><Link to="/" className="hover:text-amber-400 transition-colors">Solar Panel Repair</Link></li>
              <li><Link to="/" className="hover:text-amber-400 transition-colors">Baby & Family Care</Link></li>
              <li><Link to="/" className="hover:text-amber-400 transition-colors">Home Deep Cleaning</Link></li>
              <li><Link to="/" className="hover:text-amber-400 transition-colors">Plumbing & Electrical</Link></li>
            </ul>
          </div>

          {/* Platform & Account */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="hover:text-amber-400 transition-colors">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-amber-400 transition-colors">Create Account</Link></li>
              <li><Link to="/register?role=seller" className="hover:text-amber-400 transition-colors">Become a Specialist</Link></li>
              <li><Link to="/cart" className="hover:text-amber-400 transition-colors">My Cart</Link></li>
              <li><Link to="/orders" className="hover:text-amber-400 transition-colors">My Bookings</Link></li>
            </ul>
          </div>

          {/* Trust & Guarantee */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200">HomeCare Guarantee</h4>
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                100% Satisfaction Guarantee
              </div>
              <p className="text-xs text-slate-400">
                All specialists are background-checked and skill-assessed. If you're not delighted with the service, our support team is available 24/7 to make it right with zero extra charge.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} HomeCare Technologies Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Trust & Safety</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
