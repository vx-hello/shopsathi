import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  BookOpen,
  Plus,
  Search,
  Receipt,
  Phone,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Send,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';

const Khata = () => {
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    customersWithDues: 0,
    totalPendingUdhaar: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hasUdhaarOnly, setHasUdhaarOnly] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);

  // Modal States
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [transactionCustomer, setTransactionCustomer] = useState(null);
  const [customerLedger, setCustomerLedger] = useState([]);
  const [customerBills, setCustomerBills] = useState([]);
  const [customerDetailTab, setCustomerDetailTab] = useState('ledger');
  const [customerDetailError, setCustomerDetailError] = useState('');
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  // Quick Transaction Modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState('DEBIT'); // DEBIT (Udhaar Diya) or CREDIT (Paisa Liya)
  const [txAmount, setTxAmount] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txMethod, setTxMethod] = useState('CASH');

  // Add Customer Form
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    creditLimit: '',
    initialBalance: '',
    notes: '',
  });

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (hasUdhaarOnly) params.hasUdhaar = 'true';

      const res = await api.get('/customers', { params });
      setCustomers(res.data.data || []);
      if (res.data.summary) setSummary(res.data.summary);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setFeedback({ type: 'error', message: 'Failed to load customers.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, hasUdhaarOnly]);

  const handleOpenLedger = async (customer) => {
    setSelectedCustomer(customer);
    setCustomerBills([]);
    setCustomerDetailTab('ledger');
    setCustomerDetailError('');
    setIsLedgerLoading(true);
    try {
      const res = await api.get(`/customers/${customer._id}`);
      setSelectedCustomer(res.data.data.customer);
      setCustomerLedger(res.data.data.ledger || []);
      setCustomerBills(res.data.data.bills || []);
    } catch (err) {
      console.error('Error loading ledger:', err);
      setCustomerDetailError(err.response?.data?.message || 'Could not load customer history. Please try again.');
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    setIsSavingCustomer(true);
    try {
      await api.post('/customers', customerForm);
      setFeedback({
        type: 'success',
        message: `Customer "${customerForm.name}" added to Udhaar Khata.`,
      });
      setIsAddCustomerOpen(false);
      setCustomerForm({
        name: '',
        phone: '',
        address: '',
        creditLimit: '',
        initialBalance: '',
        notes: '',
      });
      fetchCustomers();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Error adding customer.',
      });
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleOpenTransaction = (customer, type) => {
    setTransactionCustomer(customer);
    setTxType(type);
    setTxAmount('');
    setTxNotes(type === 'DEBIT' ? 'Udhaar par samaan liya' : 'Cash jama kiya');
    setTxMethod('CASH');
    setIsTxModalOpen(true);
  };

  const handleRecordTransaction = async (e) => {
    e.preventDefault();
    if (!txAmount || !Number.isFinite(Number(txAmount)) || Number(txAmount) <= 0) {
      setFeedback({ type: 'error', message: 'Enter an amount greater than zero.' });
      return;
    }

    setIsSavingTransaction(true);
    try {
      await api.post(`/customers/${transactionCustomer._id}/ledger`, {
        type: txType,
        amount: Number(txAmount),
        notes: txNotes,
        paymentMethod: txMethod,
      });

      setFeedback({
        type: 'success',
        message:
          txType === 'DEBIT'
            ? `${formatCurrency(txAmount)} Udhaar recorded for ${transactionCustomer.name}`
            : `${formatCurrency(txAmount)} payment recorded from ${transactionCustomer.name}`,
      });

      setIsTxModalOpen(false);
      await fetchCustomers();

      if (selectedCustomer?._id === transactionCustomer._id) {
        await handleOpenLedger(selectedCustomer);
      }
      setTransactionCustomer(null);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to record transaction.',
      });
    } finally {
      setIsSavingTransaction(false);
    }
  };

  const getWhatsAppReminderUrl = (customer) => {
    const digits = customer.phone.replace(/\D/g, '');
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const text = encodeURIComponent(
      `Namaste ${customer.name} ji 🙏, Aapka dukaan par kul baaki Udhaar rashi ${formatCurrency(
        customer.balance
      )} hai. Kripya samay par jama karwayein. Dhanyawaad!`
    );
    return `https://wa.me/${phone}?text=${text}`;
  };

  // Metrics
  const totalUdhaar = Number(summary.totalPendingUdhaar) || 0;
  const customersWithUdhaarCount = Number(summary.customersWithDues) || 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            Customer accounts
          </p>
          <h1 className="mt-1 flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Udhaar Khata <span className="text-lg font-semibold text-slate-500">(उधारी खाता)</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track customer credit balances, record Udhaar Diya and Jama Kiya payments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddCustomerOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          Add Customer (नया ग्राहक)
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback.message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback({ type: '', message: '' })}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Total Pending Udhaar (कुल बाकी)
          </span>
          <div className="mt-1 text-3xl font-black tracking-tight text-amber-700">
            {formatCurrency(totalUdhaar)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Outstanding across all active customers</p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-white to-red-50/60 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Customers with Dues
          </span>
          <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            {customersWithUdhaarCount}
          </div>
          <p className="mt-1 text-xs text-slate-500">Customers with a positive Khata balance</p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-5 shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              All customers
            </span>
            <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              {summary.totalCustomers}
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <User className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name or mobile number"
              aria-label="Search customers by name or mobile number"
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear customer search"
                className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setHasUdhaarOnly((value) => !value)}
            aria-pressed={hasUdhaarOnly}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
              hasUdhaarOnly
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {hasUdhaarOnly ? 'Showing dues only' : 'Filter: all customers'}
          </button>
        </div>
        <div className="flex items-center justify-between px-1 pt-3 text-xs text-slate-500">
          <span>
            {loading ? 'Updating customer list…' : `${customers.length} customer${customers.length === 1 ? '' : 's'} shown`}
          </span>
          {hasUdhaarOnly && (
            <span className="inline-flex items-center gap-1 font-medium text-amber-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Positive balance
            </span>
          )}
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              {search || hasUdhaarOnly ? 'No matching customers' : 'No customers yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || hasUdhaarOnly
                ? 'Try another name or phone number, or clear the dues filter.'
                : 'Add your regular customers to maintain a digital Udhaar bahi-khata.'}
            </p>
            {!search && !hasUdhaarOnly && (
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(true)}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Add your first customer
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {customers.map((c) => {
              const hasBalance = c.balance > 0;
              return (
                <div
                  key={c._id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base shrink-0">
                      {c.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {c.name}
                        {c.address && (
                          <span className="text-[11px] font-normal text-slate-500">
                            ({c.address})
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {c.phone}
                        </span>
                        {c.creditLimit > 0 && (
                          <span>Limit: ₹{c.creditLimit.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <div
                        className={`text-base font-extrabold ${
                          hasBalance
                            ? 'text-red-600'
                            : c.balance < 0
                            ? 'text-blue-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(Math.abs(c.balance))}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {hasBalance
                          ? 'Udhaar Baaki'
                          : c.balance < 0
                          ? 'Advance Jama'
                          : 'Settled (Chukta)'}
                      </span>
                      {c.creditLimit > 0 && (
                        <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100 sm:ml-auto">
                          <div
                            className={`h-full rounded-full ${
                              c.balance >= c.creditLimit ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                (Math.max(c.balance, 0) / c.creditLimit) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenTransaction(c, 'DEBIT')}
                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
                      >
                        + Udhaar Diya
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenTransaction(c, 'CREDIT')}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        - Paisa Liya
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenLedger(c)}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        View Khata
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer Ledger Statement Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedCustomer.name}'s Khata Ledger`}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-600" />
                  {selectedCustomer.name}'s Khata Ledger
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  Phone: {selectedCustomer.phone}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div
                    className={`text-lg font-black ${
                      selectedCustomer.balance > 0 ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {formatCurrency(Math.abs(selectedCustomer.balance))}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    {selectedCustomer.balance > 0
                      ? 'Net Udhaar Due'
                      : selectedCustomer.balance < 0
                      ? 'Advance Jama'
                      : 'All Settled'}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Actions inside Ledger */}
            <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenTransaction(selectedCustomer, 'DEBIT')}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-sm"
                >
                  + Record Udhaar (Diya)
                </button>
                <button
                  onClick={() => handleOpenTransaction(selectedCustomer, 'CREDIT')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm"
                >
                  - Record Payment (Paisa Liya)
                </button>
              </div>

              {selectedCustomer.balance > 0 && (
                <a
                  href={getWhatsAppReminderUrl(selectedCustomer)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-700"
                >
                  <Send className="w-3.5 h-3.5" />
                  WhatsApp Reminder
                </a>
              )}
            </div>

            <div className="flex border-b border-slate-200 px-5" role="tablist" aria-label="Customer history">
              <button
                type="button"
                role="tab"
                aria-selected={customerDetailTab === 'ledger'}
                onClick={() => setCustomerDetailTab('ledger')}
                className={`px-4 py-3 text-xs font-semibold border-b-2 ${
                  customerDetailTab === 'ledger'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Khata Ledger
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={customerDetailTab === 'purchases'}
                onClick={() => setCustomerDetailTab('purchases')}
                className={`inline-flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 ${
                  customerDetailTab === 'purchases'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" /> Purchase History ({customerBills.length})
              </button>
            </div>

            {/* Customer History */}
            <div className="flex-1 overflow-y-auto p-5">
              {isLedgerLoading ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  Loading customer history...
                </div>
              ) : customerDetailError ? (
                <div className="py-12 text-center text-red-600 text-sm">
                  {customerDetailError}
                </div>
              ) : customerDetailTab === 'purchases' ? (
                customerBills.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    No linked purchases yet. For future POS bills, select this saved customer or enter their registered phone number.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerBills.map((bill) => (
                      <div key={bill._id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="text-sm font-bold text-slate-900">{bill.invoiceNumber}</div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {new Date(bill.createdAt).toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-extrabold text-slate-900">
                              {formatCurrency(bill.totalAmount)}
                            </div>
                            <div className="text-[10px] font-semibold uppercase text-slate-500">
                              {bill.paymentMethod} · {bill.paymentStatus}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                          <span className="text-slate-500">
                            Paid: <strong className="text-slate-700">{formatCurrency(bill.paidAmount)}</strong>
                          </span>
                          <span className={Number(bill.balanceDue) > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                            Due: <strong>{formatCurrency(bill.balanceDue)}</strong>
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {bill.items.map((item, index) => (
                            <div key={`${bill._id}-${index}`} className="flex justify-between gap-3 text-xs">
                              <div className="min-w-0">
                                <div className="truncate font-medium text-slate-700">{item.name}</div>
                                <div className="text-slate-500">
                                  {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                                </div>
                              </div>
                              <div className="shrink-0 font-semibold text-slate-700">
                                {formatCurrency(item.total)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : isLedgerLoading ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  Loading ledger transactions...
                </div>
              ) : customerLedger.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No transactions recorded yet for this customer.
                </div>
              ) : (
                <div className="space-y-3">
                  {customerLedger.map((tx) => {
                    const isDebit = tx.type === 'DEBIT';
                    return (
                      <div
                        key={tx._id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between ${
                          isDebit
                            ? 'bg-red-50/40 border-red-200'
                            : 'bg-emerald-50/40 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isDebit
                                ? 'bg-red-100 text-red-600'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isDebit ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {isDebit ? 'Udhaar Diya (+)' : 'Payment Received (-)'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {tx.notes || (isDebit ? 'Udhaar entry' : 'Jama')} • Mode:{' '}
                              {tx.paymentMethod}
                              {tx.bill?.invoiceNumber && (
                                <span className="ml-1 font-semibold text-emerald-700">
                                  • Invoice {tx.bill.invoiceNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`text-sm font-black ${
                              isDebit ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {isDebit ? '+' : '-'}{formatCurrency(tx.amount)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Bal: {formatCurrency(Math.abs(tx.balanceAfter || 0))}
                            {tx.balanceAfter < 0 ? ' advance' : ''} •{' '}
                            {new Date(tx.date || tx.createdAt).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Transaction Modal */}
      {isTxModalOpen && transactionCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={txType === 'DEBIT' ? 'Record Udhaar' : 'Record payment'}
            className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {txType === 'DEBIT' ? '🔴 Record Udhaar Diya' : '🟢 Record Paisa Jama Kiya'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsTxModalOpen(false);
                  setTransactionCustomer(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="space-y-4 mt-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                Customer: <strong className="text-slate-900">{transactionCustomer.name}</strong> •
                Current Balance:{' '}
                <strong
                  className={
                    transactionCustomer.balance > 0
                      ? 'text-red-600'
                      : transactionCustomer.balance < 0
                      ? 'text-blue-600'
                      : 'text-emerald-700'
                  }
                >
                  {formatCurrency(Math.abs(transactionCustomer.balance))}
                  {transactionCustomer.balance < 0 ? ' advance' : ''}
                </strong>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    autoFocus
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2 text-base font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {txType === 'CREDIT' && (
                <div>
                  <p className="mb-2 text-xs text-slate-500">
                    This payment updates the customer’s net Khata balance.
                  </p>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={txMethod}
                    onChange={(e) => setTxMethod(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="CASH">Cash (नकद)</option>
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Notes / Remark
                </label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="e.g. Samaan udhaar par diya / Google Pay se prapt"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsTxModalOpen(false);
                    setTransactionCustomer(null);
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTransaction}
                  className={`px-5 py-2 text-sm font-bold text-white rounded-xl shadow-sm ${
                    txType === 'DEBIT'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isSavingTransaction ? 'Saving…' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add new Khata customer"
            className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Khata Customer</h3>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="e.g. Mukesh Sharma"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Mobile Number * (10 Digits)
                </label>
                <input
                  type="tel"
                  required
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Address / Locality (Optional)
                </label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="e.g. Gali No. 3, Near Temple"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Opening Udhaar (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customerForm.initialBalance}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, initialBalance: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customerForm.creditLimit}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, creditLimit: e.target.value })
                    }
                    placeholder="0 = No limit"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingCustomer ? 'Saving…' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Khata;
