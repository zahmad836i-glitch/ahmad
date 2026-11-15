import React, { useState } from 'react';
import { Phone, Mail, UserCheck, ArrowRight, Mic, Sparkles, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { STAGE_BACKDROP } from '../lib/assets';

interface AuthViewProps {
  onAuthenticated: (user: UserProfile, isNewUser?: boolean) => void;
}

type AuthTab = 'phone' | 'google' | 'guest';

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [tab, setTab] = useState<AuthTab>('phone');
  const [phone, setPhone] = useState('+1 555 234 8910');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('zahmad836i@gmail.com');
  const [googleName, setGoogleName] = useState('Zeeshan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/phone/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send code.');
      setOtpSent(true);
      setDemoOtp(data.demoCode);
      setOtpCode(data.demoCode);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode, name: displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed.');
      onAuthenticated(data.user, data.isNewUser);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: googleEmail, name: googleName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed.');
      onAuthenticated(data.user, data.isNewUser);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const savedGuestId = localStorage.getItem('vv_guest_id') || '';
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ existingId: savedGuestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Guest login failed.');
      localStorage.setItem('vv_guest_id', data.user.id);
      onAuthenticated(data.user, data.isNewUser);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0914] text-[#F5F2FA] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-white/10 bg-[#151022] shadow-2xl">
        {/* Left Atmospheric Stage Panel */}
        <div className="lg:col-span-6 relative min-h-[240px] lg:min-h-[580px] flex flex-col justify-between p-6 sm:p-10">
          <img
            src={STAGE_BACKDROP}
            alt="Zariya lounge stage"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C0914] via-[#0C0914]/65 to-[#0C0914]/40" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-[#0C0914] flex items-center justify-center shadow-lg">
              <Mic className="w-5 h-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">Zariya</span>
          </div>

          <div className="relative z-10 space-y-4 mt-12">
            <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight text-balance">
              Step onto the 9-seat voice stage.
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md">
              Join live party rooms, take a microphone seat, send animated gifts, chat with friends, and launch live Rocket &amp; Luxury Wheel rounds together.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber-300/90">
              <span>9-Seat Voice Rooms</span>
              <span aria-hidden="true">·</span>
              <span>Fruit Party &amp; Rocket</span>
              <span aria-hidden="true">·</span>
              <span>500,000 Coins Welcome Reward</span>
            </div>
          </div>
        </div>

        {/* Right Authentication Form */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold">Sign in to Zariya</h2>
            <p className="text-sm text-slate-400 mt-1">
              Choose Phone verification, Google account, or instant Guest entry.
            </p>
          </div>

          {/* Segmented Method Switch */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0C0914] rounded-xl border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => { setTab('phone'); setError(null); }}
              className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                tab === 'phone' ? 'bg-amber-500 text-[#0C0914]' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span>Phone</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('google'); setError(null); }}
              className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                tab === 'google' ? 'bg-amber-500 text-[#0C0914]' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('guest'); setError(null); }}
              className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                tab === 'guest' ? 'bg-amber-500 text-[#0C0914]' : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Guest</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-medium">
              {error}
            </div>
          )}

          {tab === 'phone' && (
            <form onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={otpSent}
                  placeholder="+1 555 000 0000"
                  className="w-full h-12 px-4 rounded-xl bg-[#0C0914] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              {otpSent && (
                <>
                  <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Verification code generated
                    </span>
                    <span className="font-mono-nums font-bold tracking-wider text-amber-300">
                      {demoOtp}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full h-12 px-4 rounded-xl bg-[#0C0914] border border-white/15 text-sm font-mono-nums tracking-widest text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Display Name (optional)
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your stage name"
                      className="w-full h-12 px-4 rounded-xl bg-[#0C0914] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-3 pt-1">
                {otpSent && (
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(''); }}
                    className="h-12 px-4 rounded-xl border border-white/15 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    Change Number
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-12 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0C0914] font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <span>{loading ? 'Please wait...' : otpSent ? 'Verify & Enter Lounge' : 'Send Verification Code'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {tab === 'google' && (
            <form onSubmit={handleGoogleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Google Account Email
                </label>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full h-12 px-4 rounded-xl bg-[#0C0914] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Stage Name
                </label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Display name"
                  className="w-full h-12 px-4 rounded-xl bg-[#0C0914] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 px-5 rounded-xl bg-white hover:bg-slate-100 text-[#0C0914] font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {tab === 'guest' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0C0914] border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                  <Sparkles className="w-4 h-4" />
                  <span>Instant Guest Pass</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Jump directly into any live voice party room with a 500,000 Coins welcome reward and 500 Diamonds in your Profile Wallet.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full h-12 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0C0914] font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <span>{loading ? 'Creating Guest Pass...' : 'Enter as Guest'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
