import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/authService';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

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
  const navigate = useNavigate();

  // Resend Countdown
  useEffect(() => {
    let timer: any;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

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
      const data: any = await authService.register(email.trim(), password, fullName.trim());
      if (data?.session) {
        navigate('/');
        return;
      }

      // Check if user is already registered (identities empty array)
      if (data?.user?.identities && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError('This email is already registered. Please sign in or use "Forgot password" to recover your account.');
        return;
      }

      setStep('OTP');
      setCountdown(60);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        setError('Email rate limit exceeded (Supabase limit is 3 emails/hr). Please wait a few minutes before trying again.');
      } else {
        setError(msg || "We couldn't send the code. Try again.");
      }
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

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(paste)) return;

    const digits = paste.split('');
    setOtpDigits(digits);
    otpInputRefs.current[5]?.focus();
    submitOtpCode(paste);
  };

  const submitOtpCode = async (code: string) => {
    setError(null);
    setLoading(true);

    try {
      await authService.verifySignupOtp(email.trim(), code);
      setStep('SUCCESS');
      setTimeout(() => navigate('/'), 1200);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code');
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
      const msg = err.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        setError('Rate limit reached for sending emails. Please wait a few minutes before resending.');
      } else {
        setError(msg || 'Failed to resend code');
      }
    }
  };

  return (
    <AuthLayout>
      {/* 2-Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1 flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
              step === 'FORM'
                ? 'bg-accent text-text-on-accent'
                : 'bg-success text-white'
            }`}
          >
            {step === 'FORM' ? '1' : '✓'}
          </div>
          <span className="text-xs font-semibold text-text-main">Account</span>
        </div>

        <div className="w-8 h-[1px] bg-border" />

        <div className="flex-1 flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
              step === 'OTP' || step === 'SUCCESS'
                ? 'bg-accent text-text-on-accent'
                : 'bg-surface-2 text-text-muted border border-border'
            }`}
          >
            2
          </div>
          <span className={`text-xs font-semibold ${step === 'OTP' ? 'text-text-main' : 'text-text-muted'}`}>
            Verify
          </span>
        </div>
      </div>

      {/* Server Error Banner with Left Accent Bar */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="flex items-start gap-2.5 p-3 rounded-md border-l-4 border-danger bg-danger-muted text-danger text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'FORM' && (
          <motion.div
            key="step-form"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-6 text-left">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-text-main">
                Create account
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                Register your isolated document workspace.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                label="Full name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                leftIcon={<User className="w-4 h-4" />}
              />

              <Input
                label="Email address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Password (min 8 characters)"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
              />

              {/* Primary button full width at bottom of form */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                className="mt-2"
              >
                Continue to Verification
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border text-center text-xs text-text-secondary">
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
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={() => setStep('FORM')}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-main mb-4 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change email</span>
            </button>

            <div className="mb-6 text-left">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-text-main">
                Enter 6-digit code
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                We sent a verification code to <span className="font-mono text-text-main font-semibold">{email}</span>.
              </p>
            </div>

            {/* 6-box OTP with paste support */}
            <div className="flex items-center justify-between gap-2 my-6">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={handleOtpPaste}
                  className="w-11 h-12 sm:w-12 sm:h-13 text-center text-lg font-mono font-bold rounded-md border border-border bg-surface-2 text-text-main focus:border-accent focus:bg-surface transition-all"
                />
              ))}
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={otpDigits.includes('')}
              onClick={() => submitOtpCode(otpDigits.join(''))}
            >
              Verify & Launch Workspace
            </Button>

            <div className="mt-6 text-center text-xs text-text-secondary">
              {countdown > 0 ? (
                <span>
                  Resend code in <strong className="font-mono text-text-main">{countdown}s</strong>
                </span>
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
            className="py-10 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-success-muted text-success flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="font-heading text-xl font-bold text-text-main">Workspace Activated</h2>
            <p className="text-xs text-text-secondary mt-1">
              Redirecting you to your dashboard...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};
