import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const linkBase =
  "text-sm font-medium transition-colors hover:text-ochre-light";

const mobileLinkBase =
  "block rounded-md px-3 py-2.5 text-base font-medium text-white/90 hover:bg-white/10";

export default function Navbar() {
  const { isAuthenticated, role, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-20 bg-pine text-white/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-2xl italic text-white" onClick={closeMenu}>
          Hearth
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/" end className={linkBase}>
            Services
          </NavLink>

          {role === "customer" && (
            <>
              <NavLink to="/cart" className={linkBase}>
                Cart
              </NavLink>
              <NavLink to="/orders" className={linkBase}>
                Bookings
              </NavLink>
            </>
          )}

          {role === "seller" && (
            <NavLink to="/seller/services" className={linkBase}>
              My offerings
            </NavLink>
          )}

          {role === "admin" && (
            <NavLink to="/admin/services" className={linkBase}>
              Manage catalog
            </NavLink>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-3 border-l border-white/20 pl-6">
              <span className="text-sm text-white/70">
                {user?.username || user?.name}
                <span className="ml-1.5 rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize">
                  {role}
                </span>
              </span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-white/70 hover:text-white"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 border-l border-white/20 pl-6">
              <Link to="/login" className={linkBase}>
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-ochre px-4 py-1.5 text-sm font-semibold text-pine-dark hover:bg-ochre-dark hover:text-white"
              >
                Get started
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white/90 hover:bg-white/10 md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
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

      {/* Mobile nav panel */}
      {menuOpen && (
        <nav className="border-t border-white/10 bg-pine-dark px-4 pb-4 pt-2 md:hidden">
          <NavLink to="/" end className={mobileLinkBase} onClick={closeMenu}>
            Services
          </NavLink>

          {role === "customer" && (
            <>
              <NavLink to="/cart" className={mobileLinkBase} onClick={closeMenu}>
                Cart
              </NavLink>
              <NavLink to="/orders" className={mobileLinkBase} onClick={closeMenu}>
                Bookings
              </NavLink>
            </>
          )}

          {role === "seller" && (
            <NavLink to="/seller/services" className={mobileLinkBase} onClick={closeMenu}>
              My offerings
            </NavLink>
          )}

          {role === "admin" && (
            <NavLink to="/admin/services" className={mobileLinkBase} onClick={closeMenu}>
              Manage catalog
            </NavLink>
          )}

          <div className="mt-2 border-t border-white/10 pt-2">
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 text-sm text-white/70">
                  {user?.username || user?.name}
                  <span className="ml-1.5 rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize">
                    {role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className={`${mobileLinkBase} w-full text-left`}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={mobileLinkBase} onClick={closeMenu}>
                  Log in
                </NavLink>
                <NavLink to="/register" className={mobileLinkBase} onClick={closeMenu}>
                  Get started
                </NavLink>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
