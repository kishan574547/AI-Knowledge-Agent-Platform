import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Database, Lock, Mail, User, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
import { authService } from '../services/authService';
import { Spinner } from '../components/Spinner';
import { Alert } from '../components/Alert';

type Step = 'REGISTER_FORM' | 'OTP_VERIFICATION' | 'SUCCESS';

export const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<Step>('REGISTER_FORM');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  // Step 1: Register Account
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const data = await authService.register(email.trim(), password, fullName.trim());
      
      // If user is already active/confirmed (e.g. local mode or email confirm disabled)
      if (data?.session) {
        navigate('/');
        return;
      }

      // Supabase sent verification OTP email
      setStep('OTP_VERIFICATION');
      setInfoMessage(`We've sent a 6-digit verification code to ${email}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length < 6) {
      setError('Please enter the complete 6-digit OTP code');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      await authService.verifySignupOtp(email.trim(), otp.trim());
      setStep('SUCCESS');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    setError(null);
    setResending(true);
    try {
      await authService.resendSignupOtp(email.trim());
      setInfoMessage('A new 6-digit code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP. Please wait a moment.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md space-y-6 glass-panel bg-slate-900/80 p-8 rounded-2xl border border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 mb-4">
            {step === 'SUCCESS' ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : step === 'OTP_VERIFICATION' ? (
              <KeyRound className="w-6 h-6" />
            ) : (
              <Database className="w-6 h-6" />
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {step === 'REGISTER_FORM' && 'Create Your Account'}
            {step === 'OTP_VERIFICATION' && 'Verify Your Email'}
            {step === 'SUCCESS' && 'Email Verified!'}
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            {step === 'REGISTER_FORM' && 'Get started with isolated multi-tenant RAG architecture'}
            {step === 'OTP_VERIFICATION' && `Enter the 6-digit code sent to ${email}`}
            {step === 'SUCCESS' && 'Your account is verified. Redirecting to dashboard...'}
          </p>
        </div>

        {/* Alerts */}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {infoMessage && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-xs text-emerald-300">
            {infoMessage}
          </div>
        )}

        {/* STEP 1: Registration Form */}
        {step === 'REGISTER_FORM' && (
          <form className="mt-6 space-y-4" onSubmit={handleRegister}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password (Min 8 chars)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: OTP Verification Form */}
        {step === 'OTP_VERIFICATION' && (
          <form className="mt-6 space-y-5" onSubmit={handleVerifyOtp}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Enter 6-Digit Verification Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.trim())}
                  placeholder="123456"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-center tracking-[0.35em] font-mono text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold text-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify & Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep('REGISTER_FORM');
                  setError(null);
                }}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change email</span>
              </button>

              <button
                type="button"
                disabled={resending}
                onClick={handleResendOtp}
                className="font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
              >
                {resending ? 'Resending...' : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 'SUCCESS' && (
          <div className="space-y-4 pt-2 text-center">
            <p className="text-sm text-emerald-400 font-medium">
              Account activated! Redirecting...
            </p>
            <Spinner size="md" />
          </div>
        )}

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-slate-800/80">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-emerald-400 hover:text-emerald-300">
              Sign in
            </Link>
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Protected by Supabase Auth & Secure OTP</span>
        </div>
      </div>
    </div>
  );
};
