import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  BookOpen,
  Plus,
  Search,
  IndianRupee,
  Receipt,
  Phone,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Clock,
  Send,
  RefreshCw,
} from 'lucide-react';

const Khata = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hasUdhaarOnly, setHasUdhaarOnly] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal States
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (hasUdhaarOnly) params.hasUdhaar = 'true';

      const res = await api.get('/customers', { params });
      setCustomers(res.data.data || []);
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
    }
  };

  const handleOpenTransaction = (customer, type) => {
    setSelectedCustomer(customer);
    setTxType(type);
    setTxAmount('');
    setTxNotes(type === 'DEBIT' ? 'Udhaar par samaan liya' : 'Cash jama kiya');
    setTxMethod('CASH');
    setIsTxModalOpen(true);
  };

  const handleRecordTransaction = async (e) => {
    e.preventDefault();
    if (!txAmount || Number(txAmount) <= 0) return;

    try {
      const res = await api.post(`/customers/${selectedCustomer._id}/ledger`, {
        type: txType,
        amount: Number(txAmount),
        notes: txNotes,
        paymentMethod: txMethod,
      });

      setFeedback({
        type: 'success',
        message:
          txType === 'DEBIT'
            ? `₹${txAmount} Udhaar recorded for ${selectedCustomer.name}`
            : `₹${txAmount} payment recorded from ${selectedCustomer.name}`,
      });

      setIsTxModalOpen(false);
      fetchCustomers();

      if (selectedCustomer) {
        handleOpenLedger(selectedCustomer);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to record transaction.',
      });
    }
  };

  const getWhatsAppReminderUrl = (customer) => {
    const text = encodeURIComponent(
      `Namaste ${customer.name} ji 🙏, Aapka dukaan par kul baaki Udhaar rashi ₹${customer.balance.toFixed(
        2
      )} hai. Kripya samay par jama karwayein. Dhanyawaad!`
    );
    return `https://wa.me/91${customer.phone}?text=${text}`;
  };

  // Metrics
  const totalUdhaar = customers
    .filter((c) => c.balance > 0)
    .reduce((acc, curr) => acc + curr.balance, 0);
  const customersWithUdhaarCount = customers.filter((c) => c.balance > 0).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-emerald-600" />
            Udhaar Khata (उधारी खाता बही)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track customer credit balances, record Udhaar Diya and Jama Kiya payments.
          </p>
        </div>

        <button
          onClick={() => setIsAddCustomerOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-sm transition"
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Total Pending Udhaar (कुल बाकी)
          </span>
          <div className="text-3xl font-black text-amber-600 mt-1">
            ₹{totalUdhaar.toFixed(2)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Customer credit outstanding</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Customers with Dues
          </span>
          <div className="text-3xl font-black text-slate-900 mt-1">
            {customersWithUdhaarCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">Customers who owe money</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Filter View
            </span>
            <div className="text-xs text-slate-600 mt-1">Show only customers who have dues</div>
          </div>
          <button
            onClick={() => setHasUdhaarOnly(!hasUdhaarOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              hasUdhaarOnly
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {hasUdhaarOnly ? 'Showing Dues Only' : 'Show All'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer by name or 10-digit mobile number..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
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
            <h3 className="text-base font-bold text-slate-800">No customers found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add your regular customers to maintain a digital Udhaar bahi-khata.
            </p>
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
                      {c.name.charAt(0).toUpperCase()}
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
                        ₹{Math.abs(c.balance).toFixed(2)}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {hasBalance
                          ? 'Udhaar Baaki'
                          : c.balance < 0
                          ? 'Advance Jama'
                          : 'Settled (Chukta)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenTransaction(c, 'DEBIT')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition"
                      >
                        + Udhaar Diya
                      </button>
                      <button
                        onClick={() => handleOpenTransaction(c, 'CREDIT')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                      >
                        - Paisa Liya
                      </button>
                      <button
                        onClick={() => handleOpenLedger(c)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
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
                    ₹{Math.abs(selectedCustomer.balance).toFixed(2)}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    {selectedCustomer.balance > 0 ? 'Net Udhaar Due' : 'All Settled'}
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm"
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
                              ₹{bill.totalAmount.toFixed(2)}
                            </div>
                            <div className="text-[10px] font-semibold uppercase text-slate-500">
                              {bill.paymentMethod} · {bill.paymentStatus}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {bill.items.map((item, index) => (
                            <div key={`${bill._id}-${index}`} className="flex justify-between gap-3 text-xs">
                              <div className="min-w-0">
                                <div className="truncate font-medium text-slate-700">{item.name}</div>
                                <div className="text-slate-500">
                                  {item.quantity} {item.unit} × ₹{item.unitPrice.toFixed(2)}
                                </div>
                              </div>
                              <div className="shrink-0 font-semibold text-slate-700">
                                ₹{item.total.toFixed(2)}
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
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`text-sm font-black ${
                              isDebit ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {isDebit ? '+' : '-'}₹{tx.amount.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Bal: ₹{tx.balanceAfter?.toFixed(2)} •{' '}
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
      {isTxModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {txType === 'DEBIT' ? '🔴 Record Udhaar Diya' : '🟢 Record Paisa Jama Kiya'}
              </h3>
              <button
                onClick={() => setIsTxModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="space-y-4 mt-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                Customer: <strong className="text-slate-900">{selectedCustomer.name}</strong> •
                Current Balance:{' '}
                <strong
                  className={selectedCustomer.balance > 0 ? 'text-red-600' : 'text-emerald-700'}
                >
                  ₹{selectedCustomer.balance.toFixed(2)}
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
                  onClick={() => setIsTxModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-sm font-bold text-white rounded-xl shadow-sm ${
                    txType === 'DEBIT'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-5">
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
                  className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  Save Customer
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
