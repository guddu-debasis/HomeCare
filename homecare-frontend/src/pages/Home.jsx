import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { servicesApi } from "../lib/api";
import { formatMoney } from "../lib/format";
import { input, btnPrimary, btnSecondary } from "../lib/ui";
import Footer from "../components/Footer";

const CATEGORIES = [
  { id: "all", label: "All Services", icon: "✨" },
  { id: "cleaning", label: "Home Cleaning", icon: "🧹" },
  { id: "plumbing", label: "Plumbing", icon: "🚰" },
  { id: "electrical", label: "Electrical", icon: "⚡" },
  { id: "repair", label: "Handyman & Repair", icon: "🛠️" },
  { id: "painting", label: "Painting & Walls", icon: "🎨" },
  { id: "gardening", label: "Lawn & Garden", icon: "🌿" },
];

export default function Home() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    servicesApi
      .list()
      .then((res) => setServices(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const goToSeller = (e) => {
    e.preventDefault();
    if (sellerId.trim()) navigate(`/sellers/${sellerId.trim()}`);
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === "all") return matchesSearch;
    return matchesSearch && s.serviceName?.toLowerCase().includes(activeCategory);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 py-20 lg:py-28">
        {/* Glow ambient effects */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 right-10 w-[400px] h-[400px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Trusted Home Care Marketplace
              </div>

              <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
                Care for your home, arranged by local experts.
              </h1>

              <p className="text-lg leading-relaxed text-slate-300 max-w-2xl">
                Book verified plumbers, electricians, cleaners, and technicians near you. Upfront rates, flexible scheduling, and guaranteed service quality.
              </p>

              {/* Search input bar */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
                  <div className="relative flex-1 flex items-center">
                    <svg className="w-5 h-5 text-slate-400 absolute left-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search services (e.g. Plumbing, Cleaning, AC Repair)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent pl-12 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none text-sm"
                    />
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Trust stats pills */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">★ 4.9/5</span>
                  <span>Average Rating</span>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">100%</span>
                  <span>Vetted Providers</span>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-bold">Instant</span>
                  <span>Booking Confirmation</span>
                </div>
              </div>
            </div>

            {/* Right Provider Lookup Box */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 backdrop-blur-xl shadow-2xl space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xl">
                    🔍
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-display text-white">Know a Provider?</h3>
                    <p className="text-xs text-slate-400">View rates & reviews for a specific provider ID</p>
                  </div>
                </div>

                <form onSubmit={goToSeller} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Provider ID Number
                    </label>
                    <input
                      type="text"
                      className={input}
                      placeholder="Enter provider ID (e.g. 1, 2)"
                      value={sellerId}
                      onChange={(e) => setSellerId(e.target.value)}
                    />
                  </div>
                  <button type="submit" className={`${btnPrimary} w-full py-3`}>
                    View Provider Profile & Offerings →
                  </button>
                </form>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">💡 Tip for Homeowners:</p>
                  <p>Providers give their unique ID so you can directly select their custom discounted rates and read customer reviews.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills Bar */}
      <section className="border-b border-slate-800 bg-slate-900/40 py-6">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                  activeCategory === cat.id
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog Grid Section */}
      <section className="mx-auto max-w-7xl px-6 py-16 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">Master Catalog</span>
            <h2 className="font-display text-3xl font-bold text-white mt-1">Available Services</h2>
          </div>
          <p className="text-sm text-slate-400 max-w-md">
            Browse our standard service categories. Lookup local providers offering these services at competitive rates.
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300 text-center">
            {error}
          </div>
        )}

        {!loading && !error && filteredServices.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-3">
            <div className="text-4xl">🧹</div>
            <h3 className="text-lg font-bold text-slate-200">No Services Found</h3>
            <p className="text-sm text-slate-400">
              {searchQuery ? `No services matched "${searchQuery}".` : "No services listed in the catalog yet."}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className={btnSecondary}>
                Clear Search Filter
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/10"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-lg">
                    🏡
                  </div>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
                    Standard Catalog
                  </span>
                </div>

                <h3 className="font-display text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                  {service.serviceName}
                </h3>

                <p className="text-sm leading-relaxed text-slate-400 line-clamp-3">
                  {service.description || "Professional home service standard coverage provided by registered hearth specialists."}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Base Price</span>
                  <span className="text-lg font-extrabold text-amber-400">
                    From {formatMoney(service.basePrice)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const sampleId = prompt("Enter a provider ID to view their offerings:", "1");
                    if (sampleId) navigate(`/sellers/${sampleId}`);
                  }}
                  className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-amber-500 hover:text-slate-950 transition-colors"
                >
                  Book Provider →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & Features Banner */}
      <section className="border-t border-slate-800 bg-slate-900/50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">Why Homeowners Trust Hearth</span>
            <h2 className="font-display text-3xl font-bold text-white">Built for Complete Peace of Mind</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 text-2xl font-bold">
                🛡️
              </div>
              <h3 className="text-lg font-bold font-display text-white">Vetted Specialists</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every provider on Hearth undergoes background verification, credential checks, and continuous customer review monitoring.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 text-2xl font-bold">
                💰
              </div>
              <h3 className="text-lg font-bold font-display text-white">Transparent Pricing</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                No surprise fees or hidden surcharges. Compare rates, inspect exact quotes before adding to cart, and track booking costs.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 text-2xl font-bold">
                ⭐
              </div>
              <h3 className="text-lg font-bold font-display text-white">Real Customer Ratings</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Authentic reviews from fellow homeowners in your neighborhood so you can choose the best provider with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
