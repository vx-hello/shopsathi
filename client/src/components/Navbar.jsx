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

  // Role-based links: Staff cannot access store-wide Khata or Settings
  const isOwner = user?.role === 'owner';

  const navLinks = isOwner
    ? [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'POS Billing', path: '/billing', icon: Receipt },
        { name: 'Inventory', path: '/inventory', icon: Package },
        { name: 'Udhaar Khata', path: '/khata', icon: BookOpen },
        { name: 'Store Settings', path: '/settings', icon: Settings },
      ]
    : [
        { name: 'Counter Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'POS Billing', path: '/billing', icon: Receipt },
        { name: 'Product Catalog', path: '/inventory', icon: Package },
      ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Navigation Links */}
          <div className="flex items-center gap-6 md:gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-xl shadow-sm group-hover:scale-105 transition-transform">
                <span className="text-white">₹</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-emerald-700 transition">
                  Shop<span className="text-emerald-600">Sathi</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase -mt-1">
                  Dukaan Ka Saathi
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            {isAuthenticated && (
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {/* Shop / User details */}
                <div className="hidden sm:flex flex-col text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <Store className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-800">
                      {user.shopName || 'ShopSathi Store'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end text-xs text-slate-500">
                    <span>{user.name}</span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <Link
                  to="/login"
                  className="px-3.5 py-2 font-medium text-slate-700 hover:text-emerald-600 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm"
                >
                  Register Shop
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
