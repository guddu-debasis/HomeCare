import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { servicesApi, sellerServicesApi, cartApi } from "../lib/api";
import { formatMoney } from "../lib/format";
import { btnPrimary, btnSecondary } from "../lib/ui";
import Modal from "../components/Modal";
import Footer from "../components/Footer";

const CATEGORIES = [
  { id: "all", label: "All Services", icon: "✨" },
  { id: "cleaning", label: "Deep Cleaning", icon: "🧹", keywords: ["clean"] },
  { id: "plumbing", label: "Plumbing", icon: "🚰", keywords: ["plumb", "pipe", "drain", "leak"] },
  { id: "electrical", label: "Electrical", icon: "⚡", keywords: ["electr", "wire", "switch"] },
  { id: "ac", label: "AC & Cooling", icon: "❄️", keywords: ["ac", "cool", "air"] },
  { id: "carpentry", label: "Carpentry", icon: "🪚", keywords: ["carpent", "wood", "furnitur"] },
  { id: "painting", label: "Painting", icon: "🎨", keywords: ["paint", "wall", "proof"] },
  { id: "appliances", label: "Appliance Repair", icon: "🧺", keywords: ["appliance", "tv", "wash", "refrig"] },
  { id: "pest", label: "Pest Control", icon: "🐜", keywords: ["pest", "termite"] },
];

const SERVICE_BENEFITS = {
  plumb: ["Leakage inspection & diagnosis", "Pipe & faucet replacement", "Pressure testing & drain unblocking", "30-day post-service warranty"],
  clean: ["Eco-friendly hospital-grade sanitizers", "Full kitchen & bathroom degreasing", "Dust mite & upholstery deep vacuum", "Post-cleaning walk-through guarantee"],
  electr: ["Certified licensed technicians", "Shock-proof fuse & wiring fixes", "Appliance connection & testing", "Compliance with electrical safety codes"],
  ac: ["Deep filter & condenser coil cleaning", "Gas level check & leak diagnosis", "Cooling performance benchmark", "Standard 30-day servicing warranty"],
  paint: ["Surface scraping & primer basecoat", "Zero-VOC odorless wall emulsions", "Furniture masking & protection", "Spotless post-paint floor cleanup"],
  carpent: ["Lock, hinge & handle fitting", "Precision wood cutting & polishing", "Furniture assembly with warranty", "Genuine hardware supplies provided"],
  appliance: ["Genuine brand spare parts", "Diagnostic testing before repairs", "Transparent parts billing", "90-day parts warranty guarantee"],
  pest: ["Odorless government-approved chemicals", "Safe for kids, elderly & pets", "Complete eradication of nest sources", "Includes follow-up check assurance"],
};

const getBenefits = (serviceName = "") => {
  const lower = serviceName.toLowerCase();
  for (const [key, list] of Object.entries(SERVICE_BENEFITS)) {
    if (lower.includes(key)) return list;
  }
  return [
    "Certified verified specialist",
    "Transparent upfront pricing",
    "Complete safety & quality check",
    "30-day rework guarantee",
  ];
};

const SERVICE_ICONS = {
  plumb: "🚰",
  clean: "🧹",
  electr: "⚡",
  ac: "❄️",
  paint: "🎨",
  carpent: "🪚",
  pest: "🐜",
  appliance: "🧺",
  tv: "📺",
};

const getServiceIcon = (name = "") => {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(SERVICE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "🛠️";
};

const FAQ_ITEMS = [
  {
    q: "How are Hearth service professionals vetted and verified?",
    a: "Every specialist on Hearth undergoes strict background checks, government ID verification, and technical skill assessments before being permitted to offer services. We also review customer feedback after every completed booking.",
  },
  {
    q: "Are the prices fixed or are there hidden fees?",
    a: "All service rates displayed are 100% upfront and transparent. You will see the exact pricing before adding any service to your cart. If additional spare parts are needed, the provider will provide an itemized quote before starting.",
  },
  {
    q: "Can I reschedule or cancel my booking?",
    a: "Yes! You can reschedule or cancel pending bookings directly from your 'My Bookings' tab anytime before the provider begins work, with zero penalty.",
  },
  {
    q: "What is Hearth's 30-day satisfaction guarantee?",
    a: "If you encounter any issue or are unsatisfied with the quality of service provided, report it within 30 days and our verified specialist will return to fix it at zero extra cost.",
  },
];

export default function Home() {
  const [services, setServices] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Details / Provider Selection Modal
  const [selectedService, setSelectedService] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [addingServiceId, setAddingServiceId] = useState(null);
  // Tracks the specific provider button being clicked inside the modal
  // (keyed by sellerId, or "base" for the no-provider fallback button) so
  // that clicking one "Book with Pro" button doesn't show every sibling
  // provider's button as loading too.
  const [addingProviderKey, setAddingProviderKey] = useState(null);

  // FAQ open item
  const [openFaq, setOpenFaq] = useState(0);

  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (isAuthenticated && role === "seller") {
      navigate("/seller/services");
      return;
    }

    setLoading(true);
    Promise.all([
      servicesApi.list().catch(() => ({ data: [] })),
      sellerServicesApi.listAll().catch(() => ({ data: [] })),
    ])
      .then(([servicesRes, offeringsRes]) => {
        setServices(servicesRes.data || []);
        setOfferings(offeringsRes.data || []);
      })
      .catch((err) => setError(err.message || "Failed to load services"))
      .finally(() => setLoading(false));
  }, [isAuthenticated, role, navigate]);

  // Filter services by category and search
  const filteredServices = services.filter((s) => {
    const sName = s.serviceName?.toLowerCase() || "";
    const sDesc = s.description?.toLowerCase() || "";
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || sName.includes(q) || sDesc.includes(q);

    if (activeCategory === "all") return matchesSearch;

    const catObj = CATEGORIES.find((c) => c.id === activeCategory);
    const keywords = catObj?.keywords || [activeCategory];
    const matchesCategory = keywords.some((kw) => sName.includes(kw) || sDesc.includes(kw));

    return matchesSearch && matchesCategory;
  });

  // Providers available for a given service
  const getProvidersForService = (serviceId) => {
    return offerings.filter((o) => o.serviceId === serviceId);
  };

  // Add service to cart
  const handleAddToCart = async (service, provider = null) => {
    if (!isAuthenticated) {
      showError("Please log in as a customer to book home services.");
      navigate("/login");
      return;
    }

    if (role !== "customer") {
      showError("Please sign in with a customer account to book home services.");
      return;
    }

    const availableProviders = getProvidersForService(service.id);

    // If multiple providers exist and none was specifically picked, open the modal to pick
    if (!provider && availableProviders.length > 1) {
      setSelectedService(service);
      setIsDetailModalOpen(true);
      return;
    }

    // Determine which provider to use
    const targetProvider = provider || availableProviders[0];

    if (!targetProvider) {
      // Fallback: If no provider mapped yet, show informative message
      showError(`Currently all specialists for "${service.serviceName}" are booked. Please check back shortly!`);
      return;
    }

    setAddingServiceId(service.id);
    setAddingProviderKey(provider ? provider.sellerId : "base");
    try {
      await cartApi.add({
        serviceId: service.id,
        sellerId: targetProvider.sellerId,
        quantity: 1,
      });
      showSuccess(
        <span>
          Added <strong>{service.serviceName}</strong> with pro {targetProvider.sellerName} to your cart!{" "}
          <Link to="/cart" className="underline font-bold text-amber-300 ml-1">
            View Cart →
          </Link>
        </span>
      );
      if (isDetailModalOpen) setIsDetailModalOpen(false);
    } catch (err) {
      showError(err.message || "Failed to add service to cart.");
    } finally {
      setAddingServiceId(null);
      setAddingProviderKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* 1. TOP HERO SECTION */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 pt-16 pb-20 lg:pt-24 lg:pb-28">
        {/* Glow ambient background effects */}
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-4 w-[450px] h-[450px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Verified & Certified Home Care Services
              </div>

              <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.12]">
                Care for your home, done right by{" "}
                <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                  trusted local experts.
                </span>
              </h1>

              <p className="text-base sm:text-lg leading-relaxed text-slate-300 max-w-2xl">
                From emergency plumbing and electrical repairs to deep house cleaning and AC tune-ups. Book background-checked professionals with upfront pricing and guaranteed quality.
              </p>

              {/* Search Bar */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-2xl">
                  <div className="relative flex-1 flex items-center">
                    <svg
                      className="w-5 h-5 text-amber-400 absolute left-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search services (e.g. Plumbing, Deep Cleaning, AC Repair)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent pl-12 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none text-sm"
                    />
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <a
                    href="#services-catalog"
                    className="rounded-xl bg-amber-500 px-6 py-3 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20 text-center flex items-center justify-center gap-1.5"
                  >
                    <span>Browse All</span>
                    <span>↓</span>
                  </a>
                </div>
              </div>

              {/* Quick Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 font-medium">Popular:</span>
                {[
                  { label: "🚰 Plumbing", cat: "plumbing" },
                  { label: "🧹 Cleaning", cat: "cleaning" },
                  { label: "⚡ Electrician", cat: "electrical" },
                  { label: "❄️ AC Servicing", cat: "ac" },
                  { label: "🪚 Carpentry", cat: "carpentry" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setActiveCategory(item.cat);
                      const el = document.getElementById("services-catalog");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:border-amber-500/40 hover:text-white transition-all"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Trust Badges Bar */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-400 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">★ 4.9/5</span>
                  <span>Average Rating</span>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">100%</span>
                  <span>Vetted & Insured</span>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-2">
                  <span className="text-sky-400 font-bold">30-Day</span>
                  <span>Rework Warranty</span>
                </div>
              </div>
            </div>

            {/* Hero Right: Service Highlights & Feature Cards (Replacing Provider ID Input) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 font-bold text-xl">
                      🛡️
                    </div>
                    <div>
                      <h3 className="text-base font-bold font-display text-white">The Hearth Standard</h3>
                      <p className="text-xs text-slate-400">Guaranteed quality on every booking</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                    Verified Pros
                  </span>
                </div>

                {/* 3 Key Guarantees */}
                <div className="space-y-3.5">
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-bold text-sm">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">100% Background-Checked Specialists</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Police verified identity, trade license verification, and rigorous technical assessments.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-sm">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Upfront & Honest Pricing</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        No surprise extra charges at your doorstep. Compare provider quotes before booking.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 font-bold text-sm">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">30-Day Hassle-Free Rework Warranty</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Not fully satisfied? We send our certified pro back to resolve it at zero cost.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Stats */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                  <div className="p-2 rounded-xl bg-slate-950/40">
                    <div className="text-base font-extrabold text-white">4.9★</div>
                    <div className="text-[10px] text-slate-500">Service Rating</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/40">
                    <div className="text-base font-extrabold text-amber-400">15 min</div>
                    <div className="text-[10px] text-slate-500">Fast Response</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/40">
                    <div className="text-base font-extrabold text-emerald-400">100%</div>
                    <div className="text-[10px] text-slate-500">Satisfaction</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY PILLS FILTER BAR */}
      <section id="services-catalog" className="sticky top-[65px] z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur-lg py-4">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                    isActive
                      ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-bold scale-105"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. MAIN SERVICES CATALOG GRID */}
      <section className="mx-auto max-w-7xl px-6 py-16 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase font-bold tracking-widest text-amber-400 mb-1">
              <span>EXPLORE SERVICES</span>
              <span>•</span>
              <span className="text-slate-400">{filteredServices.length} Options Available</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              Professional Home Care Services
            </h2>
          </div>
          <p className="text-sm text-slate-400 max-w-md">
            Every service is handled by vetted, background-checked specialists using professional tools and guaranteed parts.
          </p>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300 text-center">
            {error}
          </div>
        )}

        {/* Empty Search / Filter */}
        {!loading && !error && filteredServices.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-16 text-center space-y-4 max-w-md mx-auto">
            <div className="text-5xl">🔍</div>
            <h3 className="text-lg font-bold text-white">No Services Found</h3>
            <p className="text-xs text-slate-400">
              {searchQuery
                ? `No service matches "${searchQuery}" in the selected category.`
                : "No services are currently listed in this category."}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className={btnSecondary}
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Services Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const providers = getProvidersForService(service.id);
            const benefits = getBenefits(service.serviceName);
            const icon = getServiceIcon(service.serviceName);

            // If a provider customized price, show starting price or lowest price
            const lowestCustom = providers.length
              ? Math.min(...providers.map((p) => Number(p.customPrice || service.basePrice)))
              : Number(service.basePrice);

            const displayPrice = lowestCustom || Number(service.basePrice);

            return (
              <div
                key={service.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/10"
              >
                <div className="space-y-4">
                  {/* Card Header: Icon & Badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 text-2xl shadow-inner group-hover:scale-105 transition-transform">
                      {icon}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {providers.length > 0 ? (
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {providers.length} {providers.length === 1 ? "Pro Available" : "Pros Available"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                          Certified Service
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-display text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                      {service.serviceName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {service.description ||
                        "Standard professional certified home care service provided by registered hearth specialists."}
                    </p>
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                    {benefits.slice(0, 3).map((b, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
                        <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="truncate">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Price & Book Button */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                      Starting From
                    </span>
                    <span className="text-xl font-extrabold text-amber-400">
                      {formatMoney(displayPrice)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedService(service);
                        setIsDetailModalOpen(true);
                      }}
                      className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      title="View service inclusions and details"
                    >
                      Details
                    </button>

                    <button
                      type="button"
                      disabled={addingServiceId === service.id}
                      onClick={() => handleAddToCart(service)}
                      className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {addingServiceId === service.id ? (
                        <span>Adding...</span>
                      ) : (
                        <>
                          <span>Book Now</span>
                          <span>→</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. HOW HEARTH WORKS (4-STEP PROCESS) */}
      <section className="border-t border-slate-800 bg-slate-900/40 py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
              SIMPLE & EFFORTLESS
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              How Hearth Works
            </h2>
            <p className="text-sm text-slate-400">
              From booking in seconds to flawless job completion. Here is how we ensure five-star service every time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                icon: "📱",
                title: "Choose Your Service",
                desc: "Explore our transparent catalog of home services with upfront rates and clear inclusions.",
              },
              {
                step: "02",
                icon: "📅",
                title: "Pick Date & Schedule",
                desc: "Choose an exact date and convenient time slot that matches your household schedule.",
              },
              {
                step: "03",
                icon: "🧰",
                title: "Certified Pro Arrives",
                desc: "Your background-checked specialist arrives on time equipped with genuine parts and tools.",
              },
              {
                step: "04",
                icon: "✨",
                title: "Satisfaction Guaranteed",
                desc: "Inspect the finished job and relax with complete peace of mind and our 30-day rework warranty.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{s.icon}</span>
                  <span className="font-mono text-xs font-black text-amber-400/60 bg-amber-400/10 px-2 py-0.5 rounded-md">
                    Step {s.step}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-white">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. WHY CHOOSE HEARTH (TRUST & QUALITY ASSURANCE) */}
      <section className="border-t border-slate-800 bg-slate-950 py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">
              QUALITY YOU CAN COUNT ON
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              Why Homeowners Love Hearth
            </h2>
            <p className="text-sm text-slate-400">
              We eliminate the stress of hiring contractors through strict vetting and guaranteed service standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/50 space-y-4 hover:border-amber-500/30 transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 text-2xl font-bold">
                🛡️
              </div>
              <h3 className="text-lg font-bold font-display text-white">100% Verified Specialists</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                No random strangers. Every technician undergoes identity verification, criminal background checks, and trade skill certifications before joining the platform.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/50 space-y-4 hover:border-emerald-500/30 transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 text-2xl font-bold">
                💰
              </div>
              <h3 className="text-lg font-bold font-display text-white">Upfront & Transparent Rates</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                No hidden callout fees or unexpected surcharges. You see certified service rates upfront before confirming your booking.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/50 space-y-4 hover:border-sky-500/30 transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 text-2xl font-bold">
                🔄
              </div>
              <h3 className="text-lg font-bold font-display text-white">30-Day Satisfaction Warranty</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your satisfaction is guaranteed. If any job does not meet your expectations, we send our certified specialist back to fix it with zero extra fee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. VERIFIED CUSTOMER REVIEWS */}
      <section className="border-t border-slate-800 bg-slate-900/30 py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
              REAL HOMEOWNER EXPERIENCES
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              Trusted by 5,000+ Homes
            </h2>
            <p className="text-sm text-slate-400">
              Read authentic feedback from homeowners who booked through Hearth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Priya Sharma",
                service: "Deep Home Cleaning",
                review: "Booked a full house deep clean before our family celebration. The team arrived on time, was extremely polite, and left every tile and window shining!",
                rating: 5,
                tag: "Verified Booking",
              },
              {
                name: "Rahul Mehra",
                service: "Plumbing & Pipe Repair",
                review: "Had a severe water pipe leak under the kitchen sink. The certified plumber arrived within 45 minutes, replaced the damaged valve, and tested everything thoroughly.",
                rating: 5,
                tag: "Emergency Repair",
              },
              {
                name: "Ananya Sen",
                service: "AC Repair & Servicing",
                review: "Transparent pricing with zero hidden charges. The technician cleaned the cooling coils and refilled the refrigerant. The AC works like brand new now.",
                rating: 5,
                tag: "Verified Booking",
              },
            ].map((t, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex text-amber-400 text-sm">{"★".repeat(t.rating)}</div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      {t.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    "{t.review}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{t.name}</h4>
                    <p className="text-[10px] text-slate-500">{t.service}</p>
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
                    {t.name[0]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section className="border-t border-slate-800 bg-slate-950 py-20">
        <div className="mx-auto max-w-4xl px-6 space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
              GOT QUESTIONS?
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-400">
              Everything you need to know about booking services on Hearth.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-slate-200 hover:text-white"
                  >
                    <span>{item.q}</span>
                    <span className={`text-amber-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION FOOTER BANNER */}
      <section className="border-t border-slate-800 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 py-14 text-slate-950">
        <div className="mx-auto max-w-7xl px-6 text-center space-y-4">
          <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight">
            Ready to give your home the care it deserves?
          </h2>
          <p className="text-sm sm:text-base font-medium max-w-xl mx-auto opacity-90">
            Book certified specialists in under a minute with transparent pricing and 30-day rework warranty.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#services-catalog"
              className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-amber-400 hover:bg-slate-900 transition-colors shadow-xl"
            >
              Browse Services Catalog →
            </a>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-3 text-sm font-bold text-slate-950 transition-colors"
              >
                Create Free Account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 9. SERVICE DETAILS & PROVIDER SELECTION MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedService?.serviceName || "Service Details"}
      >
        {selectedService && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="rounded-xl bg-slate-950/70 p-4 border border-slate-800 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-2xl border border-amber-500/20">
                {getServiceIcon(selectedService.serviceName)}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-base text-white">{selectedService.serviceName}</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {selectedService.description || "Standard certified home care coverage."}
                </p>
                <div className="mt-2 text-xs font-semibold text-amber-400">
                  Standard Catalog Base: {formatMoney(selectedService.basePrice)}
                </div>
              </div>
            </div>

            {/* Inclusions */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                What's Included in this Service:
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {getBenefits(selectedService.serviceName).map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Verified Specialists */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Available Certified Specialists:
              </h5>

              {getProvidersForService(selectedService.id).length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-300">
                    Our platform automatically assigns an available verified specialist for this booking upon checkout.
                  </p>
                  <button
                    type="button"
                    disabled={addingProviderKey === "base"}
                    onClick={() => handleAddToCart(selectedService)}
                    className={`${btnPrimary} w-full py-2.5 text-xs`}
                  >
                    {addingProviderKey === "base" ? "Adding..." : "Add to Cart at Base Price"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {getProvidersForService(selectedService.id).map((prov) => (
                    <div
                      key={prov.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-bold text-sm">
                          {prov.sellerName ? prov.sellerName[0].toUpperCase() : "P"}
                        </div>
                        <div>
                          <h6 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{prov.sellerName}</span>
                            <span className="text-[10px] text-emerald-400 font-normal">● Certified</span>
                          </h6>
                          <span className="text-[11px] font-extrabold text-amber-400">
                            {formatMoney(prov.customPrice || prov.basePrice)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={addingProviderKey === prov.sellerId}
                        onClick={() => handleAddToCart(selectedService, prov)}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {addingProviderKey === prov.sellerId ? "Adding..." : "Book with Pro"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className={btnSecondary}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Footer />
    </div>
  );
}
