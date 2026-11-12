import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Khata from './pages/Khata';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

const ROUTE_TITLES = {
  '/': 'Dashboard | ShopSathi',
  '/billing': 'Billing | ShopSathi',
  '/inventory': 'Inventory | ShopSathi',
  '/khata': 'Customer Credit Ledger | ShopSathi',
  '/settings': 'Store Settings | ShopSathi',
  '/login': 'Login | ShopSathi',
  '/register': 'Register | ShopSathi',
};

const PageTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = ROUTE_TITLES[pathname] || 'Page Not Found | ShopSathi';
  }, [pathname]);

  return null;
};

// Public Route helper: redirects to dashboard if already authenticated
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <PageTitle />
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 font-['Inter',sans-serif] text-slate-900 antialiased">
          <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
            <div className="absolute right-[-5%] top-20 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-100/60 blur-3xl" />
          </div>

          <Navbar />
          <main className="flex-1 px-3 pb-8 pt-4 sm:px-4 lg:px-6">
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />

              {/* Protected Routes - Accessible by both Owner and Staff */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/billing"
                element={
                  <ProtectedRoute>
                    <Billing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute>
                    <Inventory />
                  </ProtectedRoute>
                }
              />

              {/* Owner-Only Protected Routes */}
              <Route
                path="/khata"
                element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <Khata />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
