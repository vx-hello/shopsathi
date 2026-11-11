import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  Users,
  UserPlus,
  Lock,
  Trash2,
  XCircle,
  X,
  AlertCircle,
  Save,
  RefreshCw,
} from 'lucide-react';

const Settings = () => {
  const { user, updateProfile } = useAuth();

  // Store Profile State
  const [profileForm, setProfileForm] = useState({
    shopName: user?.shopName || '',
    shopAddress: user?.shopAddress || '',
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Staff Management State
  const [staffList, setStaffList] = useState([]);
  const [isStaffLoading, setIsStaffLoading] = useState(true);
  const [staffLoadError, setStaffLoadError] = useState('');
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Sync profile form when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        shopName: user.shopName || '',
        shopAddress: user.shopAddress || '',
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Load Staff List
  const fetchStaff = async (showLoading = false) => {
    try {
      if (showLoading) setIsStaffLoading(true);
      const res = await api.get('/auth/staff');
      setStaffList(res.data.data || []);
      setStaffLoadError('');
    } catch (err) {
      console.error('Error fetching staff members:', err);
      setStaffLoadError(err.response?.data?.message || 'Could not load staff accounts. Please try again.');
    } finally {
      if (showLoading) setIsStaffLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff(true);
    const refreshInterval = window.setInterval(() => fetchStaff(), 30000);
    const refreshOnFocus = () => fetchStaff();
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, []);

  // Update Store Profile
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setFeedback({ type: '', message: '' });

    const result = await updateProfile(profileForm);
    setIsUpdatingProfile(false);

    if (result.success) {
      setFeedback({ type: 'success', message: 'Shop and Profile details updated successfully!' });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  // Add Staff Member
  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/staff', staffForm);
      setFeedback({
        type: 'success',
        message: `Staff account created for ${staffForm.name}. They can now login with email & password.`,
      });
      setIsAddStaffOpen(false);
      setStaffForm({ name: '', email: '', phone: '', password: '' });
      fetchStaff();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to create staff account.',
      });
    }
  };

  // Toggle Staff Status (Active/Deactive)
  const handleToggleStatus = async (staffId, currentStatus, staffName) => {
    try {
      await api.put(`/auth/staff/${staffId}/status`);
      setFeedback({
        type: 'success',
        message: `${staffName} has been ${currentStatus ? 'deactivated' : 'activated'}.`,
      });
      fetchStaff();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to update staff status.' });
    }
  };

  // Delete Staff Member
  const handleDeleteStaff = async (staffId, staffName) => {
    if (!window.confirm(`Are you sure you want to remove staff member "${staffName}"?`)) return;
    try {
      await api.delete(`/auth/staff/${staffId}`);
      setFeedback({ type: 'success', message: `Staff member ${staffName} removed.` });
      fetchStaff();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to delete staff member.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Store className="w-7 h-7 text-emerald-600" />
          Store Settings & Staff Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Update your shop information and manage staff counter permissions.
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Store Profile Edit (5 Cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-600" /> Shop & Owner Profile
            </h2>

            <form onSubmit={handleProfileSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Shop / Store Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.shopName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, shopName: e.target.value })
                  }
                  placeholder="e.g. Gupta General Store"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Owner Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: e.target.value })
                  }
                  placeholder="Owner Name"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone: e.target.value })
                  }
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Shop Address (Printed on Bills)
                </label>
                <textarea
                  rows="3"
                  value={profileForm.shopAddress}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, shopAddress: e.target.value })
                  }
                  placeholder="Shop No., Market road, City, State"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isUpdatingProfile ? 'Saving Changes...' : 'Save Store Details'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Staff Management (7 Cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" /> Staff Counter Accounts
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Staff can generate bills & check stock, but cannot see wholesale purchase prices or store profits.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fetchStaff(true)}
                  aria-label="Refresh staff list"
                  title="Refresh staff list"
                  className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${isStaffLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsAddStaffOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Add Staff
                </button>
              </div>
            </div>

            {/* Staff List */}
            <div className="mt-4">
              {isStaffLoading ? (
                <div className="p-8 text-center text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                  Loading staff accounts...
                </div>
              ) : staffLoadError ? (
                <div className="p-8 text-center text-red-700 text-sm">
                  <p>{staffLoadError}</p>
                  <button
                    type="button"
                    onClick={() => fetchStaff(true)}
                    className="mt-3 font-semibold underline"
                  >
                    Try again
                  </button>
                </div>
              ) : staffList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No staff members created yet. Click "+ Add Staff" to create counter logins for your store assistants.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {staffList.map((st) => (
                    <div
                      key={st._id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{st.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              st.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {st.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                          <span>{st.email}</span>
                          <span>•</span>
                          <span>{st.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(st._id, st.isActive, st.name)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                            st.isActive
                              ? 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                          }`}
                        >
                          {st.isActive ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          onClick={() => handleDeleteStaff(st._id, st.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete staff account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Add Staff Member
              </h3>
              <button
                onClick={() => setIsAddStaffOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Staff Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Staff Login Email *
                </label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="suresh@yourstore.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  placeholder="9876501234"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Assign Password * (Min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
