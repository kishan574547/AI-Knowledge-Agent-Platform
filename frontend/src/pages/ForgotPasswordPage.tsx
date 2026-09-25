import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, Shield, ShieldCheck } from 'lucide-react';
import { authService } from '../services/authService';
import { Spinner } from '../components/Spinner';
import { Alert } from '../components/Alert';

type Step = 'EMAIL' | 'VERIFY_OTP' | 'NEW_PASSWORD' | 'SUCCESS';

export const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  // STEP 1: Send Password Reset OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      await authService.sendPasswordResetOtp(email.trim());
      setStep('VERIFY_OTP');
      setInfoMessage(`We've sent a 6-digit reset code to ${email.trim()}`);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset code. Please check your email or try again later.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
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
      // Verifies recovery OTP and opens authenticated recovery session
      await authService.verifyPasswordResetOtp(email.trim(), otp.trim());
      setStep('NEW_PASSWORD');
      setInfoMessage('Code verified successfully! Please enter your new password.');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setError(null);
    setResending(true);
    try {
      await authService.sendPasswordResetOtp(email.trim());
      setInfoMessage('A fresh 6-digit reset code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please wait a moment.');
    } finally {
      setResending(false);
    }
  };

  // STEP 3: Set New Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      await authService.updatePassword(newPassword);
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md space-y-6 glass-panel bg-slate-900/80 p-8 rounded-2xl border border-slate-800 shadow-2xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 'EMAIL' ? 'w-8 bg-emerald-500' : 'w-3 bg-slate-700'}`} />
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 'VERIFY_OTP' ? 'w-8 bg-emerald-500' : 'w-3 bg-slate-700'}`} />
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 'NEW_PASSWORD' ? 'w-8 bg-emerald-500' : 'w-3 bg-slate-700'}`} />
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 'SUCCESS' ? 'w-8 bg-emerald-500' : 'w-3 bg-slate-700'}`} />
        </div>

        {/* Header Icon */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 mb-4">
            {step === 'SUCCESS' ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : step === 'NEW_PASSWORD' ? (
              <ShieldCheck className="w-6 h-6" />
            ) : step === 'VERIFY_OTP' ? (
              <KeyRound className="w-6 h-6" />
            ) : (
              <Mail className="w-6 h-6" />
            )}
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white">
            {step === 'EMAIL' && 'Reset Password'}
            {step === 'VERIFY_OTP' && 'Verify Your Identity'}
            {step === 'NEW_PASSWORD' && 'Create New Password'}
            {step === 'SUCCESS' && 'Password Updated!'}
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            {step === 'EMAIL' && 'Enter your registered email to receive a 6-digit verification code'}
            {step === 'VERIFY_OTP' && `Enter the 6-digit OTP sent to ${email}`}
            {step === 'NEW_PASSWORD' && 'Enter and confirm your new secure password'}
            {step === 'SUCCESS' && 'Your password has been changed. You can now log in.'}
          </p>
        </div>

        {/* Alerts */}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {infoMessage && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-xs text-emerald-300">
            {infoMessage}
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 'EMAIL' && (
          <form className="mt-6 space-y-5" onSubmit={handleSendOtp}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registered Email Address
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Send 6-Digit OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Verify 6-Digit OTP */}
        {step === 'VERIFY_OTP' && (
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
                  <span>Verify OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep('EMAIL');
                  setError(null);
                  setInfoMessage(null);
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

        {/* STEP 3: Set New Password */}
        {step === 'NEW_PASSWORD' && (
          <form className="mt-6 space-y-4" onSubmit={handleUpdatePassword}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                New Password (Min 8 chars)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 4: Success Screen */}
        {step === 'SUCCESS' && (
          <div className="space-y-4 pt-2 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all shadow-lg shadow-emerald-500/20"
            >
              <span>Back to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer Return Link */}
        <div className="text-center pt-2 border-t border-slate-800/80">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sign In</span>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Protected by Supabase Auth & Secure OTP</span>
        </div>
      </div>
    </div>
  );
};
