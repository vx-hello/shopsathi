import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Receipt,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  IndianRupee,
  User,
  ShoppingBag,
  CreditCard,
  QrCode,
  BookOpen,
  X,
  AlertCircle,
  UserPlus,
  Phone,
} from 'lucide-react';

const Billing = () => {
  const { user } = useAuth();

  // Inventory & Customers for picking
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');

  // Cart & Customer State
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, UPI, customer credit
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Quick Customer Creation Modal State
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBill, setCreatedBill] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Custom Item Modal
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState(1);
  const [customItemUnit, setCustomItemUnit] = useState('pcs');

  // Load products and customers on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [prodRes, custRes] = await Promise.all([
          api.get('/products'),
          api.get('/customers'),
        ]);
        setProducts(prodRes.data.data || []);
        setCustomers(custRes.data.data || []);
      } catch (err) {
        console.error('Failed to load billing data:', err);
      }
    };
    loadInitialData();
  }, []);

  // Filter products by search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchProduct.toLowerCase())) ||
      p.category.toLowerCase().includes(searchProduct.toLowerCase())
  );

  // Add to cart
  const handleAddToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
            : item
        );
      } else {
        return [
          ...prev,
          {
            productId: product._id,
            name: product.name,
            quantity: 1,
            unit: product.unit || 'pcs',
            unitPrice: product.sellingPrice,
            purchasePrice: product.purchasePrice || 0,
            total: product.sellingPrice,
            stock: product.stock,
          },
        ];
      }
    });
  };

  // Add custom loose item
  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!customItemName || !customItemPrice) return;

    const qty = Number(customItemQty) || 1;
    const price = Number(customItemPrice) || 0;

    setCart((prev) => [
      ...prev,
      {
        productId: null,
        name: customItemName.trim(),
        quantity: qty,
        unit: customItemUnit,
        unitPrice: price,
        purchasePrice: 0,
        total: qty * price,
        stock: 999,
      },
    ]);

    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty(1);
    setIsCustomItemOpen(false);
  };

  // Quick register customer from billing counter
  const handleQuickAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    setIsSavingCustomer(true);
    try {
      const res = await api.post('/customers', {
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        address: newCustAddress.trim(),
      });
      const newCust = res.data.data;
      setCustomers((prev) => [newCust, ...prev]);
      setSelectedCustomer(newCust);
      setIsAddCustomerOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to add customer.');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleUpdateQty = (index, delta) => {
    setCart((prev) =>
      prev
        .map((item, i) => {
          if (i === index) {
            const newQty = Math.max(0.1, Number((item.quantity + delta).toFixed(2)));
            return {
              ...item,
              quantity: newQty,
              total: Number((newQty * item.unitPrice).toFixed(2)),
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = Math.max(0, subtotal - (Number(discount) || 0));

  const handleCheckout = async () => {
    setErrorMsg('');
    if (cart.length === 0) {
      setErrorMsg('Please add at least one product to the bill.');
      return;
    }

    // Credit sales require a registered customer or a walk-in phone number to track the balance.
    if (paymentMethod === 'UDHAAR') {
      const hasIdentity = selectedCustomer || (walkinPhone && walkinPhone.trim().length >= 4);
      if (!hasIdentity) {
        setErrorMsg(
          'For credit billing, enter the customer’s name and mobile number, or select a registered customer.'
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomer ? selectedCustomer._id : null,
        customerName: selectedCustomer ? selectedCustomer.name : walkinName || 'Walk-in Customer',
        customerPhone: selectedCustomer ? selectedCustomer.phone : walkinPhone || '',
        items: cart,
        discount: Number(discount) || 0,
        tax: 0,
        paymentMethod,
        paidAmount: paymentMethod === 'UDHAAR' ? Number(paidAmount) || 0 : grandTotal,
        notes,
      };

      const res = await api.post('/bills', payload);
      setCreatedBill(res.data.data);

      // Reload customers list to reflect new balances
      api.get('/customers').then((cRes) => setCustomers(cRes.data.data || []));

      // Reset cart and fields
      setCart([]);
      setDiscount(0);
      setPaidAmount('');
      setNotes('');
      setWalkinName('');
      setWalkinPhone('');
      setSelectedCustomer(null);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete bill.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-emerald-600" />
            POS Billing Counter
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate quick bills using cash, UPI, or customer credit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs border border-emerald-200 transition"
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            + New Customer
          </button>
          <button
            onClick={() => setIsCustomItemOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            <Plus className="w-4 h-4" />
            + Custom Loose Item
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Product Selection Catalog */}
        <div className="lg:col-span-7 space-y-4">
          {/* Customer Selection Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Customer Details
              </span>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(true)}
                className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Quick Add
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">
                  Select Registered Customer
                </label>
                <select
                  value={selectedCustomer ? selectedCustomer._id : ''}
                  onChange={(e) => {
                    const cust = customers.find((c) => c._id === e.target.value);
                    setSelectedCustomer(cust || null);
                    setErrorMsg('');
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.phone}) - Credit Balance: ₹{c.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm">{selectedCustomer.name}</div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                      <span>Phone: {selectedCustomer.phone}</span>
                      <span>•</span>
                      <span className="font-bold">
                        Current Credit Balance: ₹{selectedCustomer.balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 bg-white rounded border border-slate-200"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={walkinName}
                      onChange={(e) => setWalkinName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">
                      Mobile Number (Required for credit)
                    </label>
                    <input
                      type="tel"
                      value={walkinPhone}
                      onChange={(e) => setWalkinPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Catalog Picker */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Search items by name, barcode, or category..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No matching products. Add items from the Inventory page.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const inCartItem = cart.find((item) => item.productId === p._id);
                  return (
                    <div
                      key={p._id}
                      onClick={() => handleAddToCart(p)}
                      className="py-2.5 px-2 flex items-center justify-between hover:bg-emerald-50/60 rounded-xl cursor-pointer transition"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="text-emerald-700 font-semibold">
                            ₹{Number(p.sellingPrice).toFixed(2)} / {p.unit}
                          </span>
                          <span>•</span>
                          <span
                            className={
                              p.stock <= p.lowStockThreshold
                                ? 'text-amber-600 font-bold'
                                : 'text-slate-500'
                            }
                          >
                            Stock: {p.stock} {p.unit}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {inCartItem && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            {inCartItem.quantity} in cart
                          </span>
                        )}
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Cart & Checkout Summary */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-full">
            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" /> Current Bill
              </span>
              <span className="text-xs text-slate-500 font-normal">
                {cart.length} item(s)
              </span>
            </h2>

            {/* Cart Items List */}
            <div className="flex-1 max-h-[300px] overflow-y-auto divide-y divide-slate-100 my-3">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Your cart is empty. Click any product on the left to add.
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        ₹{item.unitPrice.toFixed(2)} × {item.quantity} {item.unit}
                      </div>
                    </div>

                    {/* Qty Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUpdateQty(idx, -1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-6 text-center text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(idx, 1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right shrink-0 w-16">
                      <div className="text-xs font-extrabold text-slate-900">
                        ₹{item.total.toFixed(2)}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-300 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Bill Summary Calculations */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-20 px-2 py-1 text-right text-xs rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-lg text-emerald-700">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Payment Method
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('CASH');
                    setErrorMsg('');
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition ${
                    paymentMethod === 'CASH'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <IndianRupee className="w-4 h-4 mb-0.5" />
                  Cash
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('UPI');
                    setErrorMsg('');
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition ${
                    paymentMethod === 'UPI'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-4 h-4 mb-0.5" />
                  UPI / QR
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('UDHAAR');
                    setErrorMsg('');
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition ${
                    paymentMethod === 'UDHAAR'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <BookOpen className="w-4 h-4 mb-0.5 text-amber-600" />
                  Customer Credit
                </button>
              </div>

              {paymentMethod === 'UDHAAR' && (
                <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                  {selectedCustomer ? (
                    <>
                      📖 Adding <strong>₹{grandTotal.toFixed(2)}</strong> to{' '}
                      <strong>{selectedCustomer.name}</strong>'s credit ledger.
                    </>
                  ) : walkinPhone ? (
                    <>
                      📖 Customer with mobile <strong>{walkinPhone}</strong> will be
                      automatically added to the customer ledger as <strong>₹{grandTotal.toFixed(2)}</strong>{' '}
                      in credit.
                    </>
                  ) : (
                    <>
                      ⚠️ Please select a customer from dropdown OR type their Mobile Number in
                      Customer Details.
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Complete Bill Button */}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  'Saving Bill...'
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    Complete Bill (₹{grandTotal.toFixed(2)})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                Add Customer
              </h3>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="space-y-3 mt-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Mobile Number * (10 Digits)
                </label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Address / Locality (Optional)
                </label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g. Ward No. 3, Near Temple"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSavingCustomer ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Receipt Modal (Printable) */}
      {createdBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Bill Generated
              </span>
              <button
                onClick={() => setCreatedBill(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thermal / Paper Receipt Layout */}
            <div id="printable-receipt" className="my-4 font-mono text-xs text-slate-800 space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <div className="font-extrabold text-sm uppercase">
                  {user?.shopName || 'ShopSathi Store'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {user?.shopAddress || 'Local Market'}
                </div>
                <div className="text-[10px] text-slate-500">Phone: {user?.phone}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Inv: {createdBill.invoiceNumber} •{' '}
                  {new Date(createdBill.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>

              <div className="text-[11px] pb-1 border-b border-dashed border-slate-200">
                Customer: <strong>{createdBill.customerName}</strong>
                {createdBill.customerPhone && <span> ({createdBill.customerPhone})</span>}
              </div>

              {/* Items */}
              <div className="space-y-1.5 py-1">
                {createdBill.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="truncate pr-2">
                      {it.name} ({it.quantity} {it.unit})
                    </span>
                    <span className="shrink-0">₹{it.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{createdBill.subtotal.toFixed(2)}</span>
                </div>
                {createdBill.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-₹{createdBill.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-slate-200">
                  <span>TOTAL:</span>
                  <span>₹{createdBill.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Payment Mode:</span>
                  <span className="font-bold uppercase">{createdBill.paymentMethod}</span>
                </div>
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-400">
                *** Dhanyawaad! Phir Aayein 🙏 ***
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={handlePrint}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Bill
              </button>
              <button
                onClick={() => setCreatedBill(null)}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
              >
                Done (New Bill)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Loose Item Modal */}
      {isCustomItemOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add Custom Loose Item</h3>
              <button
                onClick={() => setIsCustomItemOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3 mt-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Item Description *
                </label>
                <input
                  type="text"
                  required
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  placeholder="e.g. Loose Sugar (500g)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomItemOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Add to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
