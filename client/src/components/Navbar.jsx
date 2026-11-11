import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  LogOut,
  LayoutDashboard,
  Receipt,
  Package,
  BookOpen,
  Settings,
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Staff cannot access the store-wide customer ledger or settings.
  const isOwner = user?.role === 'owner';

  const navLinks = isOwner
    ? [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'POS Billing', path: '/billing', icon: Receipt },
        { name: 'Inventory', path: '/inventory', icon: Package },
        { name: 'Customer Credit Ledger', path: '/khata', icon: BookOpen },
        { name: 'Store Settings', path: '/settings', icon: Settings },
      ]
    : [
        { name: 'Counter Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'POS Billing', path: '/billing', icon: Receipt },
        { name: 'Product Catalog', path: '/inventory', icon: Package },
      ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4 max-[380px]:gap-1">
          {/* Logo & Navigation Links */}
          <div className="flex items-center gap-6 max-[380px]:gap-2 md:gap-8">
            <Link to="/" className="flex items-center gap-2 group max-[380px]:gap-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-xl shadow-sm group-hover:scale-105 transition-transform">
                <span className="text-white">₹</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-emerald-700 transition max-[380px]:text-lg">
                  Shop<span className="text-emerald-600">Sathi</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase -mt-1">
                  Your Digital Shop Assistant
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            {isAuthenticated && (
              <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 p-1 md:flex">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Navigation / User Profile */}
          <div className="flex items-center gap-4 max-[380px]:gap-2">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {/* Shop / User details */}
                <div className="hidden rounded-full border border-slate-200 bg-slate-50/80 px-3 py-2 sm:flex sm:flex-col sm:text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Store className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-800">
                      {user.shopName || 'ShopSathi Store'}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 text-xs text-slate-500">
                    <span>{user.name}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isOwner
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isOwner ? '👑 Owner' : '👷 Staff'}
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm max-[380px]:gap-1">
                <Link
                  to="/login"
                  className="rounded-lg px-3.5 py-2 font-medium text-slate-700 transition hover:bg-slate-100 hover:text-emerald-600 max-[380px]:px-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-emerald-700 max-[380px]:px-2"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        {isAuthenticated && (
          <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 overflow-x-auto">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs font-medium shrink-0 transition ${
                    isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
