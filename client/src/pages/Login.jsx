import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(normalizedEmail, password);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setFormError(result.message);
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      setFormError('Sign in failed unexpectedly. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand header */}
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-2xl font-black text-white shadow-lg shadow-emerald-900/10">
            ₹
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Welcome to Shop<span className="text-emerald-600">Sathi</span>
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Your shop operations, all in one place.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="rounded-3xl border border-slate-200/80 bg-white/95 px-6 py-7 shadow-xl shadow-slate-900/5 backdrop-blur sm:px-10 sm:py-9">
          {formError && (
            <div
              id="login-error"
              role="alert"
              aria-live="polite"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Sign in to your shop account</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Enter your registered email and password. Demo account emails must be entered manually.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPassword('Password@123');
                  setFormError('');
                }}
                disabled={isSubmitting}
                aria-label="Fill demo owner password"
                className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100/70"
              >
                Shop Owner
              </button>
              <button
                type="button"
                onClick={() => {
                  setPassword('Password@123');
                  setFormError('');
                }}
                disabled={isSubmitting}
                aria-label="Fill demo staff password"
                className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100/70"
              >
                Staff Member
              </button>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} aria-busy={isSubmitting}>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError('');
                  }}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(formError)}
                  aria-describedby={formError ? 'login-error' : undefined}
                  placeholder="shopkeeper@example.com"
                  className="block w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm transition placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formError) setFormError('');
                  }}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(formError)}
                  aria-describedby={formError ? 'login-error' : undefined}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-slate-300 py-3 pl-10 pr-11 text-sm transition placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3.5 text-slate-400 transition hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-900/10 transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign In to Shop
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
            Secure access for your store team
          </div>
        </div>

        {/* Footer Link */}
        <p className="mt-6 text-center text-sm text-slate-600">
          New shopkeeper on ShopSathi?{' '}
          <Link
            to="/register"
            className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Create shop account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
