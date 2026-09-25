import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/authService';
import { Spinner } from '../components/Spinner';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

type Step = 'FORM' | 'OTP' | 'SUCCESS';

export const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<Step>('FORM');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // 6 separate OTP input boxes
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isSuccessPulse, setIsSuccessPulse] = useState(false);
  const navigate = useNavigate();

  // Resend Countdown
  useEffect(() => {
    let timer: any;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { level: 0, label: 'None' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score === 1) return { level: 1, label: 'Weak' };
    if (score === 2) return { level: 2, label: 'Good' };
    return { level: 3, label: 'Strong' };
  };

  const strength = getPasswordStrength();

  // Step 1: Submit Form
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await authService.register(email.trim(), password, fullName.trim());
      if (data?.session) {
        navigate('/');
        return;
      }
      setStep('OTP');
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // Handle individual OTP digit change
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit on 6th digit
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      submitOtpCode(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const submitOtpCode = async (code: string) => {
    setError(null);
    setLoading(true);

    try {
      await authService.verifySignupOtp(email.trim(), code);
      setIsSuccessPulse(true);
      setTimeout(() => {
        setStep('SUCCESS');
        setTimeout(() => navigate('/'), 1200);
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code');
      setIsSuccessPulse(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError(null);
    try {
      await authService.resendSignupOtp(email.trim());
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    }
  };

  return (
    <div className="min-h-screen bg-base text-text-main flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-text-main text-surface font-mono font-bold text-xs flex items-center justify-center">
            R
          </div>
          <span className="font-semibold text-sm tracking-tight text-text-main">DocuRAG</span>
        </div>
        <ThemeSwitcher />
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-border bg-surface shadow-level2 overflow-hidden">
          
          {/* Left Column: Form / OTP (55%) */}
          <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
            
            {/* 2-Segment Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  step === 'FORM' ? 'bg-accent' : 'bg-success'
                }`}
              />
              <div
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  step === 'OTP' || step === 'SUCCESS' ? 'bg-accent' : 'bg-surface-2 border border-border'
                }`}
              />
            </div>

            <AnimatePresence mode="wait">
              {step === 'FORM' && (
                <motion.div
                  key="step-form"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-5">
                    <h1 className="text-2xl font-bold tracking-tight text-text-main">Create workspace</h1>
                    <p className="text-xs text-text-secondary mt-1">
                      Step 1 of 2 · Register your isolated document environment.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg border-l-4 border-danger bg-danger-tint text-danger text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-text-main mb-1">
                        Full name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-text-secondary absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jane Doe"
                          className="w-full h-11 pl-10 pr-3.5 bg-surface-2 border border-border rounded-lg text-sm text-text-main placeholder-text-secondary/60 focus:bg-surface transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-main mb-1">
                        Work email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-text-secondary absolute left-3.5 top-3.5" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jane@company.com"
                          className="w-full h-11 pl-10 pr-3.5 bg-surface-2 border border-border rounded-lg text-sm text-text-main placeholder-text-secondary/60 focus:bg-surface transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-main mb-1">
                        Password (min 8 characters)
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-text-secondary absolute left-3.5 top-3.5" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-11 pl-10 pr-3.5 bg-surface-2 border border-border rounded-lg text-sm text-text-main placeholder-text-secondary/60 focus:bg-surface transition-all"
                        />
                      </div>

                      {/* 3-Segment Strength Bar */}
                      {password && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <div className="flex-1 grid grid-cols-3 gap-1">
                            <div className={`h-1 rounded-full ${strength.level >= 1 ? (strength.level === 1 ? 'bg-danger' : strength.level === 2 ? 'bg-warning' : 'bg-success') : 'bg-surface-2'}`} />
                            <div className={`h-1 rounded-full ${strength.level >= 2 ? (strength.level === 2 ? 'bg-warning' : 'bg-success') : 'bg-surface-2'}`} />
                            <div className={`h-1 rounded-full ${strength.level >= 3 ? 'bg-success' : 'bg-surface-2'}`} />
                          </div>
                          <span className="text-[10px] font-mono text-text-secondary">{strength.label}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 mt-2 rounded-lg bg-accent text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Spinner size="sm" />
                          <span>Sending code...</span>
                        </>
                      ) : (
                        'Continue to Verification'
                      )}
                    </button>
                  </form>

                  <div className="mt-5 pt-5 border-t border-border text-center text-xs text-text-secondary">
                    Already have an account?{' '}
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
                    onClick={() => setStep('FORM')}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-main mb-4"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-text-main">Enter 6-digit code</h1>
                    <p className="text-xs text-text-secondary mt-1">
                      We sent a verification code to <span className="font-mono text-text-main font-semibold">{email}</span>.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg border-l-4 border-danger bg-danger-tint text-danger text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  {/* 6-Box OTP Inputs */}
                  <div className="flex items-center justify-between gap-2 my-6">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-lg font-mono font-bold rounded-lg border bg-surface-2 transition-all ${
                          isSuccessPulse
                            ? 'border-success bg-success-tint text-success ring-2 ring-success'
                            : digit
                            ? 'border-accent bg-surface text-text-main ring-1 ring-accent'
                            : 'border-border text-text-main focus:border-accent'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => submitOtpCode(otpDigits.join(''))}
                    disabled={loading || otpDigits.includes('')}
                    className="w-full h-11 rounded-lg bg-accent text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {loading ? <Spinner size="sm" /> : 'Verify & Launch Workspace'}
                  </button>

                  <div className="mt-6 text-center text-xs text-text-secondary">
                    {countdown > 0 ? (
                      <span>Resend code in <strong className="font-mono">{countdown}s</strong></span>
                    ) : (
                      <button
                        onClick={handleResend}
                        className="font-semibold text-accent hover:underline"
                      >
                        Resend code now
                      </button>
                    )}
                  </div>
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
                  <h2 className="text-xl font-bold text-text-main">Workspace Activated</h2>
                  <p className="text-xs text-text-secondary mt-1">
                    Redirecting you to your dashboard...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Editorial Panel (45%) */}
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
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Encrypted Multi-Tenancy</span>
              </div>
            </div>

            <div className="relative z-10 my-auto">
              <blockquote className="text-lg font-medium leading-snug text-text-main">
                "Upload your research papers, contracts, and notes. Get verified answers without leaking private documents."
              </blockquote>
              <div className="mt-4 flex items-center gap-2 text-xs font-mono text-text-secondary">
                <span>✓ PDF</span>
                <span>✓ Word (.docx)</span>
                <span>✓ Markdown</span>
                <span>✓ Text</span>
              </div>
            </div>

            <div className="text-[11px] text-text-secondary">
              Strict database isolation enforced per user tenant
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
