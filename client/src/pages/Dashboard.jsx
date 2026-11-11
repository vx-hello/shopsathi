import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  IndianRupee,
  Package,
  BookOpen,
  Users,
  ShieldCheck,
  Phone,
  Mail,
  Clock,
  ArrowRight,
  Receipt,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  const [stats, setStats] = useState({
    todaySales: 0,
    todayBillsCount: 0,
    totalPendingUdhaar: null,
    totalProducts: 0,
    lowStockCount: 0,
    totalCustomers: null,
    staffCount: 0,
    staffMembers: [],
    recentBills: [],
    recentLedger: [],
  });
  const [udhaarInvoices, setUdhaarInvoices] = useState([]);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePages, setInvoicePages] = useState(0);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [invoiceError, setInvoiceError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  const fetchStats = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get('/dashboard/stats');
      if (res.data.data) {
        setStats(res.data.data);
      }
      setStatsError('');
    } catch (err) {
      console.error('Could not fetch live dashboard stats:', err);
      setStatsError('Dashboard data could not be refreshed. Check your connection and try again.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchUdhaarInvoices = async (page = 1) => {
    setInvoicesLoading(true);
    try {
      const res = await api.get('/dashboard/udhaar-invoices', {
        params: { page, limit: 8 },
      });
      setUdhaarInvoices(Array.isArray(res.data.data) ? res.data.data : []);
      const pages = res.data.pages || 0;
      setInvoicePages(pages);
      setInvoiceTotal(res.data.total || 0);
      setInvoiceError('');
      if (page > pages) setInvoicePage(Math.max(pages, 1));
    } catch (err) {
      console.error('Could not fetch Udhaar invoices:', err);
      setInvoiceError('Udhaar invoices could not be loaded. Please try refreshing.');
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(true);
    const refreshInterval = window.setInterval(() => fetchStats(), 30000);
    const refreshOnFocus = () => fetchStats();
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, []);

  useEffect(() => {
    if (!isOwner) return undefined;

    fetchUdhaarInvoices(invoicePage);
    const refreshInterval = window.setInterval(
      () => fetchUdhaarInvoices(invoicePage),
      30000
    );
    const refreshOnFocus = () => fetchUdhaarInvoices(invoicePage);
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [isOwner, invoicePage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStats(),
      isOwner ? fetchUdhaarInvoices(invoicePage) : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            {isOwner ? 'Owner workspace' : 'Counter workspace'}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {isOwner ? 'Store overview' : 'Your dashboard'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            <span className="mx-2 text-slate-300">•</span>
            Updates automatically every 30 seconds
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {statsError && (
        <div
          role="alert"
          className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{statsError}</span>
          <button
            type="button"
            onClick={handleRefresh}
            className="font-bold underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {/* Welcome Hero Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden mb-8 ${
          isOwner
            ? 'bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700'
            : 'bg-gradient-to-r from-slate-800 via-slate-700 to-emerald-800'
        }`}
      >
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider text-white mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
              <span>
                {isOwner ? '👑 Shop Owner Account' : '👷 Counter Staff Account'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Namaste, {user?.name}! 🙏
            </h1>
            <p className="mt-2 text-emerald-100 max-w-xl text-sm sm:text-base">
              {isOwner ? (
                <>
                  Managing <span className="font-bold text-white">{user?.shopName || 'ShopSathi Store'}</span>.
                  Here is your real-time store financial summary.
                </>
              ) : (
                <>
                  Logged in at counter for{' '}
                  <span className="font-bold text-white">{user?.shopName || 'ShopSathi Store'}</span>.
                  Ready for customer billing and stock lookups.
                </>
              )}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col gap-2 min-w-[220px]">
            <div className="flex items-center justify-between text-xs text-emerald-100">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-300" />
                <span className="font-medium truncate">{user?.shopName || 'Retail Store'}</span>
              </div>
              {isOwner && (
                <Link
                  to="/settings"
                  className="text-[10px] text-emerald-200 hover:text-white underline"
                >
                  Edit
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-100">
              <Phone className="w-4 h-4 text-emerald-300" />
              <span>{user?.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-100">
              <Mail className="w-4 h-4 text-emerald-300" />
              <span className="truncate">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <div
        className={`grid grid-cols-1 ${
          isOwner ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2'
        } gap-4 mb-8`}
      >
        <Link
          to="/billing"
          className="flex items-center justify-between p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm">POS Billing</div>
              <div className="text-xs text-emerald-100">10-sec Invoice Generator</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/inventory"
          className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 shadow-sm transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">
                {isOwner ? 'Manage Inventory' : 'Product Catalog'}
              </div>
              <div className="text-xs text-slate-500">
                {isOwner ? 'Stock & purchase rates' : 'Check MRP & stock levels'}
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        {isOwner && (
          <Link
            to="/khata"
            className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 shadow-sm transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">Udhaar Khata</div>
                <div className="text-xs text-slate-500">Customer debts & jama</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}

        {isOwner && (
          <Link
            to="/settings"
            className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 shadow-sm transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">Settings & Staff</div>
                <div className="text-xs text-slate-500">Store info & staff logins</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>

      {/* Role-Sensitive Metrics Grid */}
      <div
        className={`grid grid-cols-1 ${
          isOwner ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'
        } gap-5 mb-8`}
      >
        {/* Sales Card */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isOwner ? "Today's Total Sales" : "My Counter Sales Today"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black tracking-tight text-slate-950">
            {loading ? '—' : formatCurrency(stats.todaySales)}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {stats.todayBillsCount} bill(s) generated today
          </p>
        </div>

        {/* Pending Udhaar (Owner Only) */}
        {isOwner && (
          <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Pending Udhaar (कुल बाकी)
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black tracking-tight text-amber-700">
              {loading ? '—' : formatCurrency(stats.totalPendingUdhaar ?? 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Customer credit outstanding</p>
          </div>
        )}

        {/* Catalog Items */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Catalog Items
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black tracking-tight text-slate-950">
            {loading ? '—' : stats.totalProducts}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            {stats.lowStockCount > 0 ? (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {stats.lowStockCount} item(s) low stock
              </span>
            ) : (
              <span>All items in stock</span>
            )}
          </p>
        </div>

        {/* Khata Customers / Staff Count (Owner Only) */}
        {isOwner && (
          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Khata Customers & Staff
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black tracking-tight text-slate-950">
              {loading ? '—' : stats.totalCustomers || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.staffCount || 0} staff counter account(s)
            </p>
            <div className="mt-2 max-h-24 overflow-y-auto divide-y divide-slate-100">
              {stats.staffMembers?.length ? (
                stats.staffMembers.map((staff) => (
                  <div key={staff._id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                    <span className="font-medium text-slate-700">{staff.name}</span>
                    {!staff.isActive && <span className="text-[10px] text-red-600">Inactive</span>}
                  </div>
                ))
              ) : (
                <p className="py-1.5 text-xs text-slate-400">No staff registered yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Staff Quick Action for third box */}
        {!isOwner && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Staff Quick Billing
              </span>
              <Receipt className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-sm font-semibold text-slate-700">
              Start new invoice for walk-in customer
            </div>
            <Link
              to="/billing"
              className="mt-2 inline-flex items-center justify-center py-2 px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition"
            >
              Open POS Counter →
            </Link>
          </div>
        )}
      </div>

      {isOwner && (
        <section className="mb-7 overflow-hidden rounded-3xl border border-amber-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-white p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                  Credit book
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-950 sm:text-xl">
                  Udhaar invoices
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {invoiceTotal} invoice{invoiceTotal === 1 ? '' : 's'} across all pages
                  {' · '}repayments update the live Khata balance
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-amber-200 bg-white px-4 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total outstanding
                </p>
                <p className="mt-0.5 text-lg font-black text-amber-700">
                  {formatCurrency(stats.totalPendingUdhaar)}
                </p>
              </div>
              <Link
                to="/khata"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700"
              >
                Open Khata <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {invoicesLoading && udhaarInvoices.length === 0 ? (
            <div className="space-y-3 p-5 sm:p-6" aria-label="Loading Udhaar invoices">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : udhaarInvoices.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Bill total</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-6 py-3 text-right">Credit at issue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {udhaarInvoices.map((bill) => {
                      const balanceDue = Number(bill.balanceDue) || 0;
                      return (
                        <tr key={bill._id} className="transition hover:bg-amber-50/40">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">
                              {bill.customer?.name || bill.customerName || 'Walk-in Customer'}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {bill.customer?.phone || bill.customerPhone || 'No phone on file'}
                            </p>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-700">
                            {bill.invoiceNumber}
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {new Date(bill.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-4 text-right font-semibold text-slate-700">
                            {formatCurrency(bill.totalAmount)}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600">
                            {formatCurrency(bill.paidAmount)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-extrabold text-amber-700">
                              {formatCurrency(balanceDue)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-slate-500">
                  Showing {Math.min((invoicePage - 1) * 8 + 1, invoiceTotal)}–
                  {Math.min(invoicePage * 8, invoiceTotal)} of {invoiceTotal} invoices
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoicePage((page) => Math.max(1, page - 1))}
                    disabled={invoicePage <= 1 || invoicesLoading}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <span className="min-w-16 text-center text-xs font-semibold text-slate-600">
                    {invoicePage} / {Math.max(invoicePages, 1)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setInvoicePage((page) => Math.min(invoicePages, page + 1))}
                    disabled={invoicePage >= invoicePages || invoicesLoading}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : invoiceError ? (
            <div className="px-5 py-10 text-center sm:px-6">
              <p className="font-semibold text-red-700">Could not load invoices</p>
              <button
                type="button"
                onClick={() => fetchUdhaarInvoices(invoicePage)}
                className="mt-2 text-sm font-bold text-emerald-700 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="px-5 py-10 text-center sm:px-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Receipt className="h-5 w-5" />
              </div>
              <p className="mt-3 font-semibold text-slate-800">No Udhaar invoices yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Credit invoices created at the billing counter will appear here.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Tables Row: Recent Bills & Ledger (Ledger feed is Owner-Only) */}
      <div
        className={`grid grid-cols-1 ${
          isOwner ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto'
        } gap-6`}
      >
        {/* Recent Bills */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />{' '}
              {isOwner ? 'Recent Store Bills' : 'My Recent Counter Bills'}
            </h2>
            <Link to="/billing" className="text-xs font-bold text-emerald-600 hover:underline">
              Open POS →
            </Link>
          </div>

          {stats.recentBills.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No bills generated yet today. Go to{' '}
              <Link to="/billing" className="text-emerald-600 font-semibold underline">
                POS Billing
              </Link>{' '}
              to start billing!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentBills.map((bill) => (
                <div key={bill._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">
                      {bill.customerName || 'Walk-in Customer'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {bill.invoiceNumber} •{' '}
                      {new Date(bill.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {isOwner && bill.createdBy?.name && (
                        <span> • by {bill.createdBy.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-slate-900">
                      {formatCurrency(bill.totalAmount || 0)}
                    </div>
                    <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                      {bill.paymentMethod}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Owner-Only Recent Udhaar Ledger Feed */}
        {isOwner && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" /> Recent Khata Ledger Activity
              </h2>
              <Link to="/khata" className="text-xs font-bold text-amber-600 hover:underline">
                Open Khata →
              </Link>
            </div>

            {stats.recentLedger.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No khata transactions recorded yet. Go to{' '}
                <Link to="/khata" className="text-amber-600 font-semibold underline">
                  Udhaar Khata
                </Link>{' '}
                to record credit!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.recentLedger.map((tx) => {
                  const isDebit = tx.type === 'DEBIT';
                  return (
                    <div
                      key={tx._id}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            isDebit
                              ? 'bg-red-100 text-red-600'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isDebit ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownLeft className="w-3 h-3" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {tx.customer?.name || 'Customer'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {tx.notes || (isDebit ? 'Udhaar diya' : 'Paisa jama')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-extrabold ${
                            isDebit ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {isDebit ? '+' : '-'}{formatCurrency(tx.amount || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(tx.date || tx.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
