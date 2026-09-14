import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const linkBase =
  "text-sm font-medium transition-colors hover:text-ochre-light";

export default function Navbar() {
  const { isAuthenticated, role, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-20 bg-pine text-white/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-2xl italic text-white">
          Hearth
        </Link>

        <nav className="flex items-center gap-6">
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
      </div>
    </header>
  );
}
