import React, { useEffect, useState } from 'react';
import {
  Coins,
  Gem,
  ArrowLeftRight,
  LogOut,
  Award,
  Check,
  Wallet,
  Send,
  User,
  Copy,
  Heart,
  HeartHandshake,
  HeartOff,
} from 'lucide-react';
import { CpRequest, UserProfile } from '../types';
import { PRESET_AVATARS, resolveAsset } from '../lib/assets';
import { getUserNameClass, isRechargeAllowedUser } from '../lib/userStyle';

interface ProfileWalletViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  incomingCpRequests?: CpRequest[];
  onUpdateProfile: (updates: { name: string; bio: string; avatar: string }) => Promise<void>;
  onWalletAction: (
    action: 'diamonds_to_coins' | 'coins_to_diamonds',
    amount?: number
  ) => Promise<void>;
  onRechargeUser: (targetUserId: string, amount: number) => Promise<boolean>;
  onRespondCp?: (requestId: string, accept: boolean) => Promise<void>;
  onBreakCp?: () => Promise<void>;
  onViewUserProfile: (userId: string) => void;
  onLogout: () => void;
}

export const ProfileWalletView: React.FC<ProfileWalletViewProps> = ({
  currentUser,
  allUsers,
  incomingCpRequests = [],
  onUpdateProfile,
  onWalletAction,
  onRechargeUser,
  onRespondCp,
  onBreakCp,
  onViewUserProfile,
  onLogout,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [saving, setSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);
  const [confirmBreakCp, setConfirmBreakCp] = useState(false);
  const [breakingCp, setBreakingCp] = useState(false);
  const [respondingCpId, setRespondingCpId] = useState<string | null>(null);
  const [diamondSwap, setDiamondSwap] = useState('50');
  const [coinSwap, setCoinSwap] = useState('3000');

  const otherUsers = allUsers.filter((u) => u.id !== currentUser.id);
  const [userSearch, setUserSearch] = useState('');
  const filteredRechargeUsers = otherUsers.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      (u.uid || '').toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });
  const [targetUserId, setTargetUserId] = useState<string>(otherUsers[0]?.id || '');
  const [rechargeAmount, setRechargeAmount] = useState<string>('500000');
  const [recharging, setRecharging] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  useEffect(() => {
    if (
      filteredRechargeUsers.length > 0 &&
      !filteredRechargeUsers.some((u) => u.id === targetUserId)
    ) {
      setTargetUserId(filteredRechargeUsers[0].id);
    }
  }, [filteredRechargeUsers, targetUserId]);

  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.floor(Number(rechargeAmount || 0));
    if (!targetUserId || amt < 100) return;
    setRecharging(true);
    try {
      await onRechargeUser(targetUserId, amt);
    } finally {
      setRecharging(false);
    }
  };

  const xpForCurrent = Math.pow(currentUser.level - 1, 2) * 40;
  const xpForNext = Math.pow(currentUser.level, 2) * 40;
  const xpProgress = Math.min(
    100,
    Math.max(8, Math.round(((currentUser.xp - xpForCurrent) / Math.max(1, xpForNext - xpForCurrent)) * 100))
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateProfile({ name, bio, avatar });
      setSavedFlag(true);
      setTimeout(() => setSavedFlag(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Profile &amp; Wallet</h1>
          <p className="text-sm text-slate-400 mt-1">
            Customize your stage identity, track Level XP, and manage Coins &amp; Diamonds
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="min-h-[44px] px-4 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-200 border border-white/10 text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Profile Card & Editor */}
        <div className="lg:col-span-6 rounded-3xl bg-[#161124] border border-white/10 p-6 space-y-6">
          <div className="flex items-center gap-4">
            <img
              src={resolveAsset(avatar)}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full object-cover border-2 border-amber-400 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2
                  className={`font-display text-xl font-bold truncate ${getUserNameClass(
                    currentUser.name,
                    currentUser.email,
                    'text-white'
                  )}`}
                >
                  {currentUser.name}
                </h2>
                <span className="text-xs font-mono-nums font-bold text-amber-300">
                  Lv.{currentUser.level}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentUser.authMethod === 'google'
                  ? currentUser.email
                  : currentUser.authMethod === 'phone'
                  ? currentUser.phone
                  : 'Guest Account'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono-nums font-semibold text-amber-200">
                  UID: {currentUser.uid || currentUser.id}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const val = currentUser.uid || currentUser.id;
                    if (navigator.clipboard?.writeText) {
                      navigator.clipboard.writeText(val).catch(() => {});
                    }
                    setCopiedUid(true);
                    setTimeout(() => setCopiedUid(false), 1800);
                  }}
                  className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-[10px] text-slate-300 flex items-center gap-1"
                  title="Copy my UID"
                >
                  {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUid ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Level Progress Bar */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-nums">
                  <span className="flex items-center gap-1 text-amber-300">
                    <Award className="w-3.5 h-3.5" />
                    Level {currentUser.level}
                  </span>
                  <span>
                    {currentUser.xp} / {xpForNext} XP
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#0C0914] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-400 transition-all"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/10 text-center">
            <div>
              <div className="font-mono-nums text-base font-bold text-white">
                {currentUser.followingIds.length}
              </div>
              <div className="text-[11px] text-slate-400">Following</div>
            </div>
            <div>
              <div className="font-mono-nums text-base font-bold text-white">
                {currentUser.followerCount}
              </div>
              <div className="text-[11px] text-slate-400">Followers</div>
            </div>
            <div>
              <div className="font-mono-nums text-base font-bold text-white">
                {currentUser.giftsSent}
              </div>
              <div className="text-[11px] text-slate-400">Gifts Sent</div>
            </div>
            <div>
              <div className="font-mono-nums text-base font-bold text-white">
                {currentUser.giftsReceived}
              </div>
              <div className="text-[11px] text-slate-400">Received</div>
            </div>
          </div>

          {/* CP Partner Section */}
          <div className="pt-4 border-t border-white/10 space-y-2.5">
            {currentUser.cpPartnerId ? (
              <div className="rounded-2xl bg-gradient-to-r from-rose-500/15 via-pink-500/10 to-amber-500/15 border border-rose-400/35 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center -space-x-2 shrink-0">
                      <img
                        src={resolveAsset(currentUser.avatar)}
                        alt={currentUser.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border-2 border-rose-400"
                      />
                      <img
                        src={resolveAsset(currentUser.cpPartnerAvatar)}
                        alt={currentUser.cpPartnerName || 'CP Partner'}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border-2 border-amber-400"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-rose-300 flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-rose-400 text-rose-400 shrink-0" />
                        <span>CP Partner</span>
                        <span className="font-mono-nums text-amber-300">
                          · Lv.{currentUser.cpLevel || 1}
                        </span>
                      </div>
                      <div
                        className={`text-sm font-bold truncate ${getUserNameClass(
                          currentUser.cpPartnerName,
                          undefined,
                          'text-white'
                        )}`}
                      >
                        {currentUser.cpPartnerName}
                      </div>
                      <div className="text-[11px] font-mono-nums text-slate-300">
                        UID: {currentUser.cpPartnerUid} · ❤️{' '}
                        {(currentUser.cpHearts || 0).toLocaleString()} Hearts
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onViewUserProfile(currentUser.cpPartnerId!)}
                    className="flex-1 min-h-[38px] px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white whitespace-nowrap"
                  >
                    View Partner
                  </button>
                  {onBreakCp && (
                    confirmBreakCp ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={breakingCp}
                          onClick={async () => {
                            setBreakingCp(true);
                            try {
                              await onBreakCp();
                              setConfirmBreakCp(false);
                            } finally {
                              setBreakingCp(false);
                            }
                          }}
                          className="min-h-[38px] px-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold whitespace-nowrap"
                        >
                          {breakingCp ? 'Ending...' : 'Confirm Break'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmBreakCp(false)}
                          className="min-h-[38px] px-2.5 rounded-xl bg-white/10 text-xs text-slate-300 whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmBreakCp(true)}
                        className="min-h-[38px] px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <HeartOff className="w-3.5 h-3.5" />
                        <span>Break CP</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : incomingCpRequests.length > 0 && onRespondCp ? (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-400/35 p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-200">
                  <HeartHandshake className="w-4 h-4 text-rose-400" />
                  <span>Incoming CP Proposals ({incomingCpRequests.length})</span>
                </div>
                {incomingCpRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[#0C0914] border border-white/10 p-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => onViewUserProfile(req.fromUserId)}
                      className="flex items-center gap-2 min-w-0 text-left"
                    >
                      <img
                        src={resolveAsset(req.fromUserAvatar)}
                        alt={req.fromUserName}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{req.fromUserName}</div>
                        <div className="text-[10px] font-mono-nums text-slate-400">
                          UID: {req.fromUserUid}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={respondingCpId === req.id}
                        onClick={async () => {
                          setRespondingCpId(req.id);
                          try {
                            await onRespondCp(req.id, true);
                          } finally {
                            setRespondingCpId(null);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-[11px] font-semibold"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={respondingCpId === req.id}
                        onClick={async () => {
                          setRespondingCpId(req.id);
                          try {
                            await onRespondCp(req.id, false);
                          } finally {
                            setRespondingCpId(null);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-[11px] font-semibold"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-[#0C0914] border border-white/10 px-3.5 py-2.5 flex items-center gap-2 text-xs text-slate-400">
                <HeartHandshake className="w-4 h-4 text-rose-400 shrink-0" />
                <span>No CP Partner yet · Open any user profile to propose CP (10,000 Coins).</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2 border-t border-white/10">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Select Studio Avatar
              </label>
              <div className="flex items-center gap-3">
                {PRESET_AVATARS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setAvatar(item.key)}
                    className={`rounded-full p-0.5 transition-transform ${
                      avatar === item.key
                        ? 'ring-2 ring-amber-400 scale-105'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={item.src}
                      alt={item.label}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Stage Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#0C0914] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Bio</label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#0C0914] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0C0914] font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {savedFlag ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Profile Saved</span>
                </>
              ) : (
                <span>{saving ? 'Saving...' : 'Save Profile'}</span>
              )}
            </button>
          </form>
        </div>

        {/* Right: Profile Wallet (Coins & Diamonds) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-3xl bg-[#161124] border border-amber-400/25 p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">My Profile Wallet</h3>
                  <p className="text-xs text-slate-400">
                    Manage your Coins &amp; Diamonds balance
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-2xl bg-[#0C0914] border border-amber-400/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
                    <Coins className="w-4 h-4" />
                    <span>Coins</span>
                  </span>
                </div>
                <div className="font-mono-nums text-2xl font-extrabold text-white">
                  {currentUser.coins.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-400">
                  For Fruit Party, Rocket, Wheel &amp; gifts
                </p>
              </div>

              <div className="rounded-2xl bg-[#0C0914] border border-sky-400/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-sky-300">
                    <Gem className="w-4 h-4" />
                    <span>Diamonds</span>
                  </span>
                </div>
                <div className="font-mono-nums text-2xl font-extrabold text-white">
                  {currentUser.diamonds.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-400">
                  For luxury gifts &amp; Coin conversions
                </p>
              </div>
            </div>
          </div>

          {/* Currency Exchange */}
          <div className="rounded-3xl bg-[#161124] border border-white/10 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-amber-400" />
              <h3 className="font-display text-base font-bold">Diamonds &amp; Coins Exchange</h3>
            </div>

            <div className="p-4 rounded-2xl bg-[#0C0914] border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Diamonds → Coins</span>
                <span className="font-mono-nums text-amber-300">1 Diamond = 25 Coins</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={diamondSwap}
                  onChange={(e) => setDiamondSwap(e.target.value)}
                  className="flex-1 h-11 px-3 rounded-xl bg-[#161124] border border-white/15 font-mono-nums text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => onWalletAction('diamonds_to_coins', Number(diamondSwap))}
                  className="min-h-[44px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-[#091320] font-semibold text-xs whitespace-nowrap"
                >
                  Convert (+{(Number(diamondSwap || 0) * 25).toLocaleString()} Coins)
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0C0914] border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Coins → Diamonds</span>
                <span className="font-mono-nums text-sky-300">30 Coins = 1 Diamond</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="30"
                  step="30"
                  value={coinSwap}
                  onChange={(e) => setCoinSwap(e.target.value)}
                  className="flex-1 h-11 px-3 rounded-xl bg-[#161124] border border-white/15 font-mono-nums text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => onWalletAction('coins_to_diamonds', Number(coinSwap))}
                  className="min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0C0914] font-semibold text-xs whitespace-nowrap"
                >
                  Convert (+{Math.floor(Number(coinSwap || 0) / 30).toLocaleString()} Diamonds)
                </button>
              </div>
            </div>
          </div>
          {/* Recharge Other User Coins */}
          {isRechargeAllowedUser(currentUser) && (
          <div className="rounded-3xl bg-[#161124] border border-emerald-400/25 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="font-display text-base font-bold text-white">
                  Recharge User Coins
                </h3>
              </div>
              <span className="text-[11px] font-mono-nums text-slate-400">
                {otherUsers.length} users
              </span>
            </div>

            {otherUsers.length === 0 ? (
              <p className="text-xs text-slate-400">No other users available yet.</p>
            ) : (
              <form onSubmit={handleRechargeSubmit} className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search user by Name or UID..."
                    className="w-full h-10 px-3 mb-2 rounded-xl bg-[#0C0914] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Select User to Recharge
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[#0C0914] border border-white/15 text-sm text-white focus:outline-none focus:border-emerald-400"
                  >
                    {filteredRechargeUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} · UID: {u.uid || u.id} (Lv.{u.level} · {u.coins.toLocaleString()} Coins)
                      </option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const selectedTarget = otherUsers.find((u) => u.id === targetUserId);
                  if (!selectedTarget) return null;
                  return (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0C0914] border border-white/10 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={resolveAsset(selectedTarget.avatar)}
                          alt={selectedTarget.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div
                            className={`truncate font-semibold ${getUserNameClass(
                              selectedTarget.name,
                              selectedTarget.email,
                              'text-white'
                            )}`}
                          >
                            {selectedTarget.name}
                          </div>
                          <div className="text-[10px] font-mono-nums text-slate-400 truncate">
                            UID: {selectedTarget.uid || selectedTarget.id} · {selectedTarget.coins.toLocaleString()} Coins
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onViewUserProfile(selectedTarget.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-100 text-[11px] font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap"
                      >
                        <User className="w-3 h-3" />
                        <span>View Profile</span>
                      </button>
                    </div>
                  );
                })()}

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '50K', val: '50000' },
                    { label: '500K', val: '500000' },
                    { label: '5M', val: '5000000' },
                    { label: '50M', val: '50000000' },
                    { label: '500M', val: '500000000' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setRechargeAmount(preset.val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono-nums font-bold border transition-colors ${
                        rechargeAmount === preset.val
                          ? 'bg-emerald-500 text-[#091320] border-emerald-400'
                          : 'bg-[#0C0914] text-slate-300 border-white/10 hover:border-emerald-400/50'
                      }`}
                    >
                      +{preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="Coins amount..."
                    className="flex-1 h-11 px-3 rounded-xl bg-[#0C0914] border border-white/15 font-mono-nums text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    disabled={
                      recharging ||
                      !targetUserId ||
                      Number(rechargeAmount) < 100 ||
                      currentUser.coins < Number(rechargeAmount)
                    }
                    className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#091320] font-semibold text-xs whitespace-nowrap disabled:opacity-40"
                  >
                    {recharging ? 'Sending...' : 'Recharge Coins'}
                  </button>
                </div>
              </form>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
