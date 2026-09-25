import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, CheckCircle2, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/authService';
import { Spinner } from '../components/Spinner';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

type Step = 'EMAIL' | 'OTP' | 'PASSWORD' | 'SUCCESS';

export const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 6 separate OTP input boxes
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();

  // Resend Countdown
  useEffect(() => {
    let timer: any;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Requirement checks
  const checks = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'At least one number or symbol', met: /[0-9!@#$%^&*]/.test(newPassword) },
    { label: 'Passwords match', met: newPassword.length > 0 && newPassword === confirmPassword },
  ];

  // Step 1: Request OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authService.sendPasswordResetOtp(email.trim());
      setStep('OTP');
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      verifyOtpCode(fullCode);
    }
  };

  const verifyOtpCode = async (code: string) => {
    setError(null);
    setLoading(true);

    try {
      await authService.verifyPasswordResetOtp(email.trim(), code);
      setStep('PASSWORD');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError(null);
    try {
      await authService.sendPasswordResetOtp(email.trim());
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    }
  };

  // Step 3: Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await authService.updatePassword(newPassword);
      setStep('SUCCESS');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base text-text-main flex flex-col justify-between">
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-text-main text-surface font-mono font-bold text-xs flex items-center justify-center">
            R
          </div>
          <span className="font-semibold text-sm tracking-tight text-text-main">DocuRAG</span>
        </div>
        <ThemeSwitcher />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-border bg-surface shadow-level2 overflow-hidden">
          
          <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
            
            {/* 3-Segment Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`h-1.5 flex-1 rounded-full transition-all ${step !== 'EMAIL' ? 'bg-success' : 'bg-accent'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all ${step === 'PASSWORD' || step === 'SUCCESS' ? 'bg-success' : step === 'OTP' ? 'bg-accent' : 'bg-surface-2 border border-border'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all ${step === 'SUCCESS' ? 'bg-success' : step === 'PASSWORD' ? 'bg-accent' : 'bg-surface-2 border border-border'}`} />
            </div>

            <AnimatePresence mode="wait">
              {step === 'EMAIL' && (
                <motion.div
                  key="step-email"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-5">
                    <h1 className="text-2xl font-bold tracking-tight text-text-main">Reset password</h1>
                    <p className="text-xs text-text-secondary mt-1">
                      Enter your account email to receive a secure recovery code.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg border-l-4 border-danger bg-danger-tint text-danger text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-main mb-1.5">
                        Work email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-text-secondary absolute left-3.5 top-3.5" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@domain.com"
                          className="w-full h-11 pl-10 pr-3.5 bg-surface-2 border border-border rounded-lg text-sm text-text-main placeholder-text-secondary/60 focus:bg-surface transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 rounded-lg bg-accent text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
                    >
                      {loading ? <Spinner size="sm" /> : 'Send Recovery Code'}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-border text-center text-xs text-text-secondary">
                    Remember your password?{' '}
                    <Link to="/login" className="font-semibold text-accent hover:underline">
                      Sign in
                    </Link>
                  </div>
                </motion.div>
              )}

              {step === 'OTP' && (
                <motion.div
                  key="step-otp"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={() => setStep('EMAIL')}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-main mb-4"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-text-main">Enter recovery code</h1>
                    <p className="text-xs text-text-secondary mt-1">
                      Check your email <span className="font-mono text-text-main font-semibold">{email}</span> for the 6-digit code.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg border-l-4 border-danger bg-danger-tint text-danger text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 my-6">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-lg font-mono font-bold rounded-lg border bg-surface-2 transition-all ${
                          digit
                            ? 'border-accent bg-surface text-text-main ring-1 ring-accent'
                            : 'border-border text-text-main focus:border-accent'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => verifyOtpCode(otpDigits.join(''))}
                    disabled={loading || otpDigits.includes('')}
                    className="w-full h-11 rounded-lg bg-accent text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {loading ? <Spinner size="sm" /> : 'Verify Code'}
                  </button>

                  <div className="mt-6 text-center text-xs text-text-secondary">
                    {countdown > 0 ? (
                      <span>Resend in <strong className="font-mono">{countdown}s</strong></span>
                    ) : (
                      <button onClick={handleResend} className="font-semibold text-accent hover:underline">
                        Resend code now
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 'PASSWORD' && (
                <motion.div
                  key="step-password"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-5">
                    <h1 className="text-2xl font-bold tracking-tight text-text-main">Set new password</h1>
                    <p className="text-xs text-text-secondary mt-1">
                      Choose a strong, unique password for your workspace.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg border-l-4 border-danger bg-danger-tint text-danger text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdatePassword} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-text-main mb-1">
                        New password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-text-secondary absolute left-3.5 top-3.5" />
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-11 pl-10 pr-3.5 bg-surface-2 border border-border rounded-lg text-sm text-text-main placeholder-text-secondary/60 focus:bg-surface transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-main mb-1">
                        Confirm new password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-text-secondary absolute left-3.5 top-3.5" />
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-11 pl-10 pr-3.5 bg-surface-2 border border-border rounded-lg text-sm text-text-main placeholder-text-secondary/60 focus:bg-surface transition-all"
                        />
                      </div>
                    </div>

                    {/* Live Requirements Checklist */}
                    <div className="p-3 rounded-lg bg-surface-2 border border-border space-y-1.5 text-xs">
                      {checks.map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${c.met ? 'bg-success text-white' : 'bg-border text-text-secondary'}`}>
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span className={c.met ? 'text-text-main font-medium' : 'text-text-secondary'}>
                            {c.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || checks.some((c) => !c.met)}
                      className="w-full h-11 rounded-lg bg-accent text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
                    >
                      {loading ? <Spinner size="sm" /> : 'Update Password & Sign In'}
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 'SUCCESS' && (
                <motion.div
                  key="step-success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-success-tint border border-success text-success flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-text-main">Password Updated</h2>
                  <p className="text-xs text-text-secondary mt-1">
                    Redirecting you to login...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden lg:flex lg:col-span-5 bg-surface-2 p-10 flex-col justify-between border-l border-border relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            />

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-[11px] font-mono text-text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>Encrypted OTP Recovery</span>
              </div>
            </div>

            <div className="relative z-10 my-auto">
              <blockquote className="text-lg font-medium leading-snug text-text-main">
                "Direct token verification via your secure SMTP provider ensures unauthorized password resets are impossible."
              </blockquote>
            </div>

            <div className="text-[11px] text-text-secondary">
              DocuRAG Enterprise Access Security
            </div>
          </div>

        </div>
      </main>

      <footer className="w-full py-4 text-center text-[11px] text-text-secondary">
        DocuRAG Platform · Enterprise Multi-Tenant Intelligence
      </footer>
    </div>
  );
};
