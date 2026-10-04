import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { servicesApi, sellerServicesApi, cartApi } from "../lib/api";
import { formatMoney } from "../lib/format";
import { btnPrimary, btnSecondary } from "../lib/ui";
import Modal from "../components/Modal";
import Footer from "../components/Footer";
import AiSearchPanel from "../components/AiSearchPanel";
import HomeCareSpinner from "../components/HomeCareSpinner";
import { TradeIcon, getServiceIconType } from "../components/TradeIcon";

// ---------------------------------------------------------------------
// Rich category definitions covering all backend services & homecare trades
// ---------------------------------------------------------------------
const CATEGORIES = [
  { id: "all", label: "All Services", iconType: "all", keywords: [] },
  { id: "ac", label: "AC & Cooling", iconType: "ac", keywords: ["ac", "cool", "air", "chiller", "hvac"] },
  { id: "solar", label: "Solar & Energy", iconType: "solar", keywords: ["solar", "sun", "panel", "energy", "inverter"] },
  { id: "care", label: "Baby & Elderly Care", iconType: "care", keywords: ["baby", "care", "elderly", "nurse", "nursing", "patient", "child", "mother"] },
  { id: "cleaning", label: "Deep Cleaning", iconType: "clean", keywords: ["clean", "maid", "wash", "dust", "sanitiz"] },
  { id: "plumbing", label: "Plumbing", iconType: "plumb", keywords: ["plumb", "pipe", "drain", "leak", "faucet", "water"] },
  { id: "electrical", label: "Electrical", iconType: "electr", keywords: ["electr", "wire", "switch", "fuse", "power", "light"] },
  { id: "appliances", label: "Appliance Repair", iconType: "appliance", keywords: ["appliance", "tv", "wash", "refrig", "fridge", "oven"] },
  { id: "carpentry", label: "Carpentry", iconType: "carpent", keywords: ["carpent", "wood", "furnitur", "door", "lock"] },
  { id: "painting", label: "Painting", iconType: "paint", keywords: ["paint", "wall", "proof"] },
  { id: "pest", label: "Pest Control", iconType: "pest", keywords: ["pest", "termite", "insect", "bug"] },
];

const SERVICE_BENEFITS = {
  ac: [
    "Deep jet coil cleaning & air filter flush",
    "Coolant gas pressure & leak diagnosis",
    "Compressor load & electrical safety test",
    "30-day post-service cooling warranty",
  ],
  solar: [
    "Solar panel output & cell performance benchmark",
    "Inverter efficiency & DC/AC voltage diagnosis",
    "Surge protection & junction box safety test",
    "Certified solar technician with safety gear",
  ],
  care: [
    "Verified & background-checked caregiver",
    "Infant/elderly hygiene, feeding & routine schedule",
    "Vitals monitoring & emergency safety protocols",
    "Loving, trustworthy & compassionate service",
  ],
  baby: [
    "Verified & police-checked infant nanny",
    "Feeding, burping, sterilization & nap schedules",
    "Infant hygiene, bathing & sensory playtime",
    "Daily routine log & mother-support assistance",
  ],
  clean: [
    "Eco-friendly hospital-grade sanitizers",
    "Full kitchen & bathroom degreasing",
    "Dust mite & upholstery deep vacuum",
    "Post-cleaning walk-through guarantee",
  ],
  plumb: [
    "Leakage inspection & diagnosis",
    "Pipe & faucet replacement",
    "Pressure testing & drain unblocking",
    "30-day post-service warranty",
  ],
  electr: [
    "Certified licensed technicians",
    "Shock-proof fuse & wiring fixes",
    "Appliance connection & testing",
    "Compliance with electrical safety codes",
  ],
  paint: [
    "Surface scraping & primer basecoat",
    "Zero-VOC odorless wall emulsions",
    "Furniture masking & protection",
    "Spotless post-paint floor cleanup",
  ],
  carpent: [
    "Lock, hinge & handle fitting",
    "Precision wood cutting & polishing",
    "Furniture assembly with warranty",
    "Genuine hardware supplies provided",
  ],
  appliance: [
    "Genuine brand spare parts",
    "Diagnostic testing before repairs",
    "Transparent parts billing",
    "90-day parts warranty guarantee",
  ],
  pest: [
    "Odorless government-approved chemicals",
    "Safe for kids, elderly & pets",
    "Complete eradication of nest sources",
    "Includes follow-up check assurance",
  ],
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

const CATEGORY_ACCENTS = {
  ac: "border-l-sky-500/80",
  solar: "border-l-amber-500/80",
  care: "border-l-rose-500/80",
  clean: "border-l-emerald-500/80",
  plumb: "border-l-blue-500/80",
  electr: "border-l-yellow-400/80",
  carpent: "border-l-amber-700/80",
  paint: "border-l-purple-500/80",
  appliance: "border-l-cyan-500/80",
  pest: "border-l-emerald-600/80",
  tool: "border-l-amber-500/80",
};

const FAQ_ITEMS = [
  {
    q: "How are HomeCare service professionals vetted and verified?",
    a: "Every specialist on HomeCare undergoes strict background checks, government ID verification, and technical skill assessments before being permitted to offer services. We also review customer feedback after every completed booking.",
  },
  {
    q: "Are the prices fixed or are there hidden fees?",
    a: "All service rates displayed are 100% upfront and transparent. You will see the exact pricing before adding any service to your cart. If additional spare parts are needed, the specialist will provide an itemized quote before starting.",
  },
  {
    q: "Can I reschedule or cancel my booking?",
    a: "Yes! You can reschedule or cancel pending bookings directly from your 'My Bookings' tab anytime before the provider begins work, with zero penalty.",
  },
  {
    q: "What is HomeCare's 30-day satisfaction guarantee?",
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
  const [addingProviderKey, setAddingProviderKey] = useState(null);

  // FAQ open item
  const [openFaq, setOpenFaq] = useState(0);

  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();

  const loadData = () => {
    setLoading(true);
    setError("");
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
  };

  useEffect(() => {
    if (isAuthenticated && role === "seller") {
      navigate("/seller/services");
      return;
    }
    loadData();
  }, [isAuthenticated, role, navigate]);

  // Providers available for a given service
  const getProvidersForService = (serviceId) => {
    return offerings.filter((o) => o.serviceId === serviceId);
  };

  // Helper to count how many services in the backend belong to a category
  const getCategoryCount = (cat) => {
    if (cat.id === "all") return services.length;
    return services.filter((s) => {
      const sName = (s.serviceName || "").toLowerCase();
      const sDesc = (s.description || "").toLowerCase();
      return cat.keywords.some((kw) => sName.includes(kw) || sDesc.includes(kw));
    }).length;
  };

  // Sort categories so populated ones in the backend appear right after "All Services"
  const sortedCategories = [...CATEGORIES].sort((a, b) => {
    if (a.id === "all") return -1;
    if (b.id === "all") return 1;
    const countA = getCategoryCount(a);
    const countB = getCategoryCount(b);
    if (countA > 0 && countB === 0) return -1;
    if (countA === 0 && countB > 0) return 1;
    return 0;
  });

  // Filter services by category and search query
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

  // Add service to cart
  const handleAddToCart = async (service, provider = null) => {
    if (!isAuthenticated) {
      showError("Please log in as a customer to book home care services.");
      navigate("/login");
      return;
    }

    if (role !== "customer") {
      showError("Please sign in with a customer account to book services.");
      return;
    }

    const availableProviders = getProvidersForService(service.id);

    // If multiple providers exist and none was specifically picked, open the modal to let user choose
    if (!provider && availableProviders.length > 1) {
      setSelectedService(service);
      setIsDetailModalOpen(true);
      return;
    }

    // Determine target provider
    const targetProvider = provider || availableProviders[0];

    if (!targetProvider) {
      showError(`Specialists for "${service.serviceName}" are currently being onboarded. Please check back shortly!`);
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
          Added <strong>{service.serviceName}</strong> with pro <strong>{targetProvider.sellerName}</strong> to your cart.{" "}
          <Link to="/cart" className="underline font-bold text-amber-300 ml-1">
            View cart
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
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-900/60 to-slate-950 pt-16 pb-20 lg:pt-20 lg:pb-28">
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Verified Doorstep HomeCare Services
              </div>

              <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.4rem] leading-[1.14]">
                Expert care for your home and family, right at your doorstep.
              </h1>

              <p className="text-base sm:text-lg leading-relaxed text-slate-300 max-w-xl">
                From emergency AC & solar repairs to compassionate baby & family care, HomeCare connects you with verified local specialists — transparent upfront pricing, backed by a 30-day satisfaction guarantee.
              </p>

              {/* Search Bar */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
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
                      placeholder="What needs doing? Try 'AC Repairing', 'Solar Repair', or 'Baby Care'"
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
                    className="rounded-xl bg-amber-500 px-6 py-3 text-xs font-bold text-white hover:bg-amber-400 transition-colors text-center flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20"
                  >
                    Browse Services
                  </a>
                </div>
              </div>

              {/* Quick Suggestions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 font-medium">Popular services:</span>
                {services.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSearchQuery(s.serviceName);
                      const el = document.getElementById("services-catalog");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:border-amber-500/40 hover:text-white transition-all"
                  >
                    <TradeIcon type={getServiceIconType(s.serviceName)} className="w-3.5 h-3.5 text-amber-400" />
                    {s.serviceName}
                  </button>
                ))}
              </div>
            </div>

            {/* Hero Right: The HomeCare Standard Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-dashed border-slate-700 bg-slate-900/80">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <TradeIcon type="check-shield" className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold font-display text-white">The HomeCare Standard</h3>
                      <p className="text-[11px] text-slate-400">Doorstep service you can trust</p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    GUARANTEED
                  </span>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {[
                    {
                      title: "Background-Checked Specialists",
                      desc: "Police verified, trade-licensed, and skill-assessed before being assigned to your home.",
                    },
                    {
                      title: "Upfront, Honest Pricing",
                      desc: "You see the exact rate before you book. Zero hidden surprise call-out fees.",
                    },
                    {
                      title: "30-Day Rework Warranty",
                      desc: "Not fully satisfied with the job? We send a specialist back to fix it at zero extra charge.",
                    },
                  ].map((item, idx) => (
                    <div key={item.title} className="flex items-start gap-3.5 px-6 py-4">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-500/40 text-[10px] font-bold text-amber-400">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 border-t border-dashed border-slate-700 text-center bg-slate-950/40">
                  <div className="p-3.5 border-r border-slate-800">
                    <div className="text-base font-extrabold text-white">4.9★</div>
                    <div className="text-[10px] text-slate-400">Customer Rating</div>
                  </div>
                  <div className="p-3.5 border-r border-slate-800">
                    <div className="text-base font-extrabold text-amber-400">15 min</div>
                    <div className="text-[10px] text-slate-400">Avg. Response</div>
                  </div>
                  <div className="p-3.5">
                    <div className="text-base font-extrabold text-emerald-400">100%</div>
                    <div className="text-[10px] text-slate-400">Verified Pros</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1.5. AI SEARCH PANEL */}
      <AiSearchPanel />

      {/* 2. DYNAMIC CATEGORY FILTER BAR */}
      <section id="services-catalog" className="sticky top-[65px] z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur-lg py-4">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {sortedCategories.map((cat) => {
              const isActive = activeCategory === cat.id;
              const count = getCategoryCount(cat);

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                    isActive
                      ? "bg-amber-500 text-white border-amber-500 font-bold shadow-md shadow-amber-600/20"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80"
                  }`}
                >
                  <TradeIcon type={cat.iconType} className="w-4 h-4" />
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-slate-800 text-amber-400 border border-slate-700"
                      }`}
                    >
                      {count}
                    </span>
                  )}
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
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              HomeCare Service Catalog
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {filteredServices.length} {filteredServices.length === 1 ? "service" : "services"} ready to book, handled by verified specialists with guarantee.
            </p>
          </div>
        </div>

        {/* LOADING SPINNER STATE */}
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center">
            <HomeCareSpinner size="xl" label="Loading HomeCare services & verified specialists..." />
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center space-y-4 max-w-lg mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <TradeIcon type="check-shield" className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-red-200">Unable to load services</h3>
            <p className="text-xs text-red-300 leading-relaxed">{error}</p>
            <button
              onClick={loadData}
              className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-500 transition-colors shadow-md"
            >
              Retry Loading
            </button>
          </div>
        )}

        {/* EMPTY SEARCH / FILTER */}
        {!loading && !error && filteredServices.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-16 text-center space-y-4 max-w-md mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
              <TradeIcon type="all" className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">No services found in this category</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {searchQuery
                ? `Nothing matches "${searchQuery}" right now.`
                : "Specialists for this category are being onboarded. View our available services below."}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className={btnSecondary}
            >
              Show All Services ({services.length})
            </button>
          </div>
        )}

        {/* SERVICES CARDS */}
        {!loading && !error && filteredServices.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => {
              const providers = getProvidersForService(service.id);
              const benefits = getBenefits(service.serviceName);
              const iconType = getServiceIconType(service.serviceName);
              const accentClass = CATEGORY_ACCENTS[iconType] || CATEGORY_ACCENTS.tool;

              // Calculate lowest custom price from verified providers
              const lowestCustom = providers.length
                ? Math.min(...providers.map((p) => Number(p.customPrice || service.basePrice)))
                : Number(service.basePrice);

              const displayPrice = lowestCustom || Number(service.basePrice);

              return (
                <div
                  key={service.id}
                  className={`group flex flex-col justify-between rounded-2xl border border-l-4 ${accentClass} border-slate-800 bg-slate-900/60 transition-all duration-200 hover:border-slate-700 hover:-translate-y-1 hover:shadow-xl`}
                >
                  <div className="p-6 space-y-4">
                    {/* Card Header: Icon & Verified Pros Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/90 border border-slate-700/80 text-amber-400 shadow-sm">
                        <TradeIcon type={iconType} className="w-6 h-6" />
                      </div>

                      {providers.length > 0 ? (
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {providers.length} {providers.length === 1 ? "pro available" : "pros available"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                          Certified HomeCare
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="font-display text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                        {service.serviceName}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {service.description ||
                          `Standard certified home care service provided by verified specialists with complete quality assurance.`}
                      </p>
                    </div>

                    {/* Feature Bullets */}
                    <div className="space-y-1.5 pt-1">
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

                  {/* Card Footer: Price & Action Buttons */}
                  <div className="mt-2 border-t border-dashed border-slate-700 px-6 py-4 flex items-center justify-between gap-3 bg-slate-950/30 rounded-b-2xl">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                        Starting from
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
                        title="View details & available specialists"
                      >
                        Details
                      </button>

                      <button
                        type="button"
                        disabled={addingServiceId === service.id}
                        onClick={() => handleAddToCart(service)}
                        className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-400 transition-all disabled:opacity-50 shadow-md shadow-amber-600/20"
                      >
                        {addingServiceId === service.id ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Adding…
                          </span>
                        ) : (
                          "Book Now"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. HOW HOMECARE WORKS */}
      <section className="border-t border-slate-800 bg-slate-900/40 py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-12">
          <div className="max-w-xl space-y-2">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              How HomeCare works
            </h2>
            <p className="text-sm text-slate-400">
              Four simple steps from booking to doorstep completion.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            <div className="hidden lg:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-slate-800" />
            {[
              { icon: "clipboard", title: "Choose your service", desc: "Select from AC, Solar, Baby Care, Plumbing & more with upfront rates." },
              { icon: "calendar", title: "Pick date & slot", desc: "Pick a convenient morning, afternoon, or evening window that fits your schedule." },
              { icon: "toolbox", title: "Specialist arrives", desc: "A background-checked, verified technician arrives equipped at your doorstep." },
              { icon: "check-shield", title: "Satisfaction guaranteed", desc: "Inspect completed work, pay securely, backed by our 30-day rework warranty." },
            ].map((s, idx) => (
              <div key={s.title} className="relative space-y-3">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 border-2 border-amber-500/60 text-amber-400">
                  <TradeIcon type={s.icon} className="w-5 h-5" />
                </div>
                <h3 className="font-display text-base font-bold text-white">
                  {idx + 1}. {s.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. VERIFIED REVIEWS */}
      <section className="border-t border-slate-800 bg-slate-950 py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-12">
          <div className="max-w-xl space-y-2">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              Trusted by homeowners & families
            </h2>
            <p className="text-sm text-slate-400">
              Real reviews from customers who booked verified homecare specialists.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Priya Sharma",
                service: "Baby Care & Attendant",
                review: "Booked baby care assistance through HomeCare. The caregiver was extremely gentle, experienced, and very attentive to infant safety routines. Such peace of mind!",
                rating: 5,
              },
              {
                name: "Rahul Mehra",
                service: "Ac Repairing",
                review: "The AC technician arrived on time, diagnosed the coolant leak immediately, and repaired it with transparent pricing. Works like brand new!",
                rating: 5,
              },
              {
                name: "Siddharth Das",
                service: "Solar Repair",
                review: "Our rooftop solar inverter tripped after a storm. The certified technician tested the wiring, replaced a blown fuse, and restored full power generation.",
                rating: 5,
              },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex text-amber-400 text-xs">{"★".repeat(t.rating)}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    "{t.review}"
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs border border-amber-500/20">
                    {t.name[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{t.name}</h4>
                    <p className="text-[10px] text-slate-400">{t.service}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FREQUENTLY ASKED QUESTIONS */}
      <section className="border-t border-slate-800 bg-slate-900/30 py-20">
        <div className="mx-auto max-w-3xl px-6 space-y-8">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white text-center">
            Frequently Asked Questions
          </h2>

          <div className="divide-y divide-slate-800 border-y border-slate-800">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left text-sm font-bold text-slate-200 hover:text-white"
                  >
                    <span>{item.q}</span>
                    <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-amber-400 text-sm">
                      {isOpen ? "–" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="pb-5 text-xs text-slate-400 leading-relaxed">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. CALL TO ACTION FOOTER BANNER */}
      <section className="border-t border-slate-800 bg-gradient-to-r from-amber-600 to-amber-700 py-14 text-white">
        <div className="mx-auto max-w-7xl px-6 text-center space-y-4">
          <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight">
            Ready to experience professional doorstep HomeCare?
          </h2>
          <p className="text-sm sm:text-base font-medium max-w-xl mx-auto opacity-95">
            Book verified specialists in under a minute with upfront transparent pricing and a 30-day guarantee.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#services-catalog"
              className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-amber-400 hover:bg-slate-900 transition-colors shadow-lg"
            >
              Browse Services
            </a>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="rounded-xl bg-white/20 hover:bg-white/30 px-6 py-3 text-sm font-bold text-white transition-colors"
              >
                Create Free Account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 8. SERVICE DETAILS & PROVIDER SELECTION MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedService?.serviceName || "Service Details"}
      >
        {selectedService && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="rounded-xl bg-slate-950/70 p-4 border border-slate-800 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <TradeIcon type={getServiceIconType(selectedService.serviceName)} className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-base text-white">{selectedService.serviceName}</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {selectedService.description || "Certified doorstep home care coverage with safety protocol adherence."}
                </p>
                <div className="mt-2 text-xs font-semibold text-amber-400">
                  Standard base price: {formatMoney(selectedService.basePrice)}
                </div>
              </div>
            </div>

            {/* Inclusions */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                What's Included
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {getBenefits(selectedService.serviceName).map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span className="truncate">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Verified Specialists */}
            <div className="space-y-3 pt-3 border-t border-dashed border-slate-700">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Verified Specialists Offering This Service
              </h5>

              {getProvidersForService(selectedService.id).length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-300">
                    Verified specialists for this service are currently being onboarded. Please check back shortly or explore our active AC, Solar, and Care services!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {getProvidersForService(selectedService.id).map((prov) => (
                    <div
                      key={prov.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 font-bold text-sm border border-amber-500/20">
                          {prov.sellerName ? prov.sellerName[0].toUpperCase() : "P"}
                        </div>
                        <div>
                          <h6 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{prov.sellerName}</span>
                            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                              Verified
                            </span>
                          </h6>
                          <span className="text-xs font-extrabold text-amber-400">
                            {formatMoney(prov.customPrice || prov.basePrice)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={addingProviderKey === prov.sellerId}
                        onClick={() => handleAddToCart(selectedService, prov)}
                        className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-400 transition-colors disabled:opacity-50 shadow-sm"
                      >
                        {addingProviderKey === prov.sellerId ? "Adding…" : "Book with Pro"}
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
