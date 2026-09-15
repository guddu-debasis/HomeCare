import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { cartApi } from "../lib/api";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";

const linkBase =
  "text-sm font-medium transition-all px-3 py-1.5 rounded-lg flex items-center gap-2";

const getLinkClass = ({ isActive }) =>
  `${linkBase} ${
    isActive
      ? "bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20"
      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
  }`;

export default function Navbar() {
  const { isAuthenticated, role, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const closeMenu = () => setMenuOpen(false);

  // Fetch cart count when customer is authenticated
  useEffect(() => {
    if (isAuthenticated && role === "customer") {
      cartApi
        .list()
        .then((res) => {
          const items = res.data || [];
          setCartCount(items.length);
        })
        .catch(() => setCartCount(0));
    } else {
      setCartCount(0);
    }
  }, [isAuthenticated, role, location.pathname]);

  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        {/* Brand Logo */}
        <Link to={role === "seller" ? "/seller/services" : "/"} className="flex items-center gap-3 group" onClick={closeMenu}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 font-black text-slate-950 shadow-lg shadow-amber-600/20 group-hover:scale-105 transition-all">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
              Hearth
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 -mt-1">
              HomeCare
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-2 md:flex">
          {role !== "seller" && (
            <NavLink to="/" end className={getLinkClass}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Services Catalog
            </NavLink>
          )}

          {role === "customer" && (
            <>
              <NavLink to="/cart" className={getLinkClass}>
                <div className="relative flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  Cart
                  {cartCount > 0 && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-extrabold text-slate-950 shadow-md">
                      {cartCount}
                    </span>
                  )}
                </div>
              </NavLink>

              <NavLink to="/orders" className={getLinkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                My Bookings
              </NavLink>
            </>
          )}

          {role === "seller" && (
            <NavLink to="/seller/services" className={getLinkClass}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              My Service Offerings
            </NavLink>
          )}

          {role === "admin" && (
            <NavLink to="/admin/services" className={getLinkClass}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Manage Master Catalog
            </NavLink>
          )}

          <div className="ml-4 flex items-center gap-3 border-l border-slate-800 pl-4">
            <ThemeToggle />
            {isAuthenticated && (role === "seller" || role === "customer") && (
              <NotificationBell role={role} />
            )}
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                    {(user?.username || user?.name || role || "U")[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-200 leading-none">
                      {user?.username || user?.name || "User"}
                    </span>
                    <span className="text-[10px] capitalize text-emerald-400 font-bold tracking-wide">
                      {role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-all"
                  title="Sign out"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          {isAuthenticated && (role === "seller" || role === "customer") && (
            <NotificationBell role={role} />
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {menuOpen && (
        <nav className="border-t border-slate-800 bg-slate-950 px-6 py-4 space-y-2 md:hidden animate-fade-in">
          {role !== "seller" && (
            <NavLink to="/" end className={getLinkClass} onClick={closeMenu}>
              Services Catalog
            </NavLink>
          )}

          {role === "customer" && (
            <>
              <NavLink to="/cart" className={getLinkClass} onClick={closeMenu}>
                Cart {cartCount > 0 && `(${cartCount})`}
              </NavLink>
              <NavLink to="/orders" className={getLinkClass} onClick={closeMenu}>
                My Bookings
              </NavLink>
            </>
          )}

          {role === "seller" && (
            <NavLink to="/seller/services" className={getLinkClass} onClick={closeMenu}>
              My Offerings
            </NavLink>
          )}

          {role === "admin" && (
            <NavLink to="/admin/services" className={getLinkClass} onClick={closeMenu}>
              Manage Catalog
            </NavLink>
          )}

          <div className="pt-4 border-t border-slate-800">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-sm">
                    {(user?.username || user?.name || role || "U")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{user?.username || user?.name}</p>
                    <p className="text-xs text-emerald-400 capitalize">{role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-center text-sm font-medium text-red-400"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  className="w-full rounded-xl border border-slate-800 py-2.5 text-center text-sm font-medium text-slate-200"
                  onClick={closeMenu}
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="w-full rounded-xl bg-amber-500 py-2.5 text-center text-sm font-semibold text-slate-950"
                  onClick={closeMenu}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
