import React, { useState } from 'react';
import {
  X,
  Award,
  Coins,
  Gem,
  UserPlus,
  Check,
  MessageCircle,
  Copy,
  Send,
  Heart,
  HeartHandshake,
} from 'lucide-react';
import { CpRequest, UserProfile } from '../types';
import { resolveAsset } from '../lib/assets';
import { getUserNameClass, isRechargeAllowedUser } from '../lib/userStyle';

interface UserProfileModalProps {
  user: UserProfile | null;
  currentUser: UserProfile;
  outgoingCpIds?: string[];
  incomingCpRequest?: CpRequest | null;
  onClose: () => void;
  onFollowToggle: (targetId: string) => void;
  onOpenChat: (targetId: string) => void;
  onRechargeUser: (targetUserId: string, amount: number) => Promise<boolean>;
  onProposeCp?: (toUserId: string) => Promise<boolean>;
  onRespondCp?: (requestId: string, accept: boolean) => Promise<void>;
  onViewUserProfile?: (userId: string) => void;
  onToast: (msg: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  currentUser,
  outgoingCpIds = [],
  incomingCpRequest = null,
  onClose,
  onFollowToggle,
  onOpenChat,
  onRechargeUser,
  onProposeCp,
  onRespondCp,
  onViewUserProfile,
  onToast,
}) => {
  const [rechargeAmt, setRechargeAmt] = useState('500000');
  const [recharging, setRecharging] = useState(false);
  const [proposingCp, setProposingCp] = useState(false);
  const [respondingCp, setRespondingCp] = useState(false);

  if (!user) return null;

  const isMe = user.id === currentUser.id;
  const isFollowing = currentUser.followingIds.includes(user.id);
  const xpForCurrent = Math.pow(user.level - 1, 2) * 40;
  const xpForNext = Math.pow(user.level, 2) * 40;
  const xpProgress = Math.min(
    100,
    Math.max(8, Math.round(((user.xp - xpForCurrent) / Math.max(1, xpForNext - xpForCurrent)) * 100))
  );

  const handleCopyId = () => {
    const uidToCopy = user.uid || user.id;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(uidToCopy).catch(() => {});
    }
    onToast(`Copied UID: ${uidToCopy}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#161124] border border-white/15 p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={resolveAsset(user.avatar)}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border-2 border-amber-400"
              />
              {user.isOnline && (
                <span
                  className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#161124]"
                  title="Online"
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  className={`font-display text-lg font-bold truncate ${getUserNameClass(
                    user.name,
                    user.email,
                    'text-white'
                  )}`}
                >
                  {user.name}
                </h2>
                <span className="text-xs font-mono-nums font-bold text-amber-300 shrink-0">
                  Lv.{user.level}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-mono-nums font-semibold text-amber-200">
                  UID: {user.uid || user.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-300"
                  title="Copy User UID"
                  aria-label="Copy User UID"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 capitalize mt-0.5">
                {user.authMethod} account
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 shrink-0"
            aria-label="Close profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bio */}
        <div className="rounded-2xl bg-[#0C0914] border border-white/10 px-4 py-3 text-xs text-slate-300">
          {user.bio || 'No bio added yet.'}
        </div>

        {/* Level XP Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono-nums text-slate-400">
            <span className="flex items-center gap-1 text-amber-300">
              <Award className="w-3.5 h-3.5" />
              Level {user.level}
            </span>
            <span>
              {user.xp} / {xpForNext} XP
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#0C0914] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-rose-400 transition-all"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        {/* Social Stats */}
        <div className="grid grid-cols-4 gap-2 py-3 border-y border-white/10 text-center">
          <div>
            <div className="font-mono-nums text-sm font-bold text-white">
              {user.followingIds.length}
            </div>
            <div className="text-[11px] text-slate-400">Following</div>
          </div>
          <div>
            <div className="font-mono-nums text-sm font-bold text-white">
              {user.followerCount}
            </div>
            <div className="text-[11px] text-slate-400">Followers</div>
          </div>
          <div>
            <div className="font-mono-nums text-sm font-bold text-white">
              {user.giftsSent}
            </div>
            <div className="text-[11px] text-slate-400">Sent</div>
          </div>
          <div>
            <div className="font-mono-nums text-sm font-bold text-white">
              {user.giftsReceived}
            </div>
            <div className="text-[11px] text-slate-400">Received</div>
          </div>
        </div>

        {/* Wallet Snapshot */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#0C0914] border border-amber-400/20 p-3 flex items-center gap-2.5">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400">Coins</div>
              <div className="font-mono-nums text-xs font-bold text-amber-300 truncate">
                {user.coins.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-[#0C0914] border border-sky-400/20 p-3 flex items-center gap-2.5">
            <Gem className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400">Diamonds</div>
              <div className="font-mono-nums text-xs font-bold text-sky-300 truncate">
                {user.diamonds.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* CP Partner Card */}
        {user.cpPartnerId && (
          <div className="rounded-2xl bg-gradient-to-r from-rose-500/15 via-pink-500/10 to-amber-500/15 border border-rose-400/35 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center -space-x-2 shrink-0">
                <img
                  src={resolveAsset(user.avatar)}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border-2 border-rose-400"
                />
                <img
                  src={resolveAsset(user.cpPartnerAvatar)}
                  alt={user.cpPartnerName || 'CP Partner'}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border-2 border-amber-400"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-rose-300 flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-rose-400 text-rose-400 shrink-0" />
                  <span>CP Partner</span>
                  <span className="font-mono-nums text-amber-300">· Lv.{user.cpLevel || 1}</span>
                </div>
                <div
                  className={`text-xs font-bold truncate ${getUserNameClass(
                    user.cpPartnerName,
                    undefined,
                    'text-white'
                  )}`}
                >
                  {user.cpPartnerName}
                </div>
                <div className="text-[10px] font-mono-nums text-slate-300">
                  ❤️ {(user.cpHearts || 0).toLocaleString()} CP Hearts
                </div>
              </div>
            </div>
            {onViewUserProfile && user.cpPartnerId !== user.id && (
              <button
                type="button"
                onClick={() => onViewUserProfile(user.cpPartnerId!)}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white whitespace-nowrap shrink-0"
              >
                Partner ID
              </button>
            )}
          </div>
        )}

        {/* Actions for Other Users */}
        {!isMe && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onFollowToggle(user.id)}
                className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  isFollowing
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'bg-amber-500 text-[#0C0914] hover:bg-amber-400'
                }`}
              >
                {isFollowing ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>{isFollowing ? 'Following' : 'Follow'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenChat(user.id);
                  onClose();
                }}
                className="min-h-[44px] px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Message</span>
              </button>
            </div>

            {/* CP Proposal Controls */}
            {!currentUser.cpPartnerId && !user.cpPartnerId && onProposeCp && (
              incomingCpRequest && onRespondCp ? (
                <div className="rounded-2xl bg-rose-500/10 border border-rose-400/35 p-3 space-y-2">
                  <div className="text-xs font-semibold text-rose-200 flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{user.name} sent you a CP Partner proposal!</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={respondingCp}
                      onClick={async () => {
                        setRespondingCp(true);
                        try {
                          await onRespondCp(incomingCpRequest.id, true);
                        } finally {
                          setRespondingCp(false);
                        }
                      }}
                      className="min-h-[40px] rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold"
                    >
                      Accept CP
                    </button>
                    <button
                      type="button"
                      disabled={respondingCp}
                      onClick={async () => {
                        setRespondingCp(true);
                        try {
                          await onRespondCp(incomingCpRequest.id, false);
                        } finally {
                          setRespondingCp(false);
                        }
                      }}
                      className="min-h-[40px] rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ) : outgoingCpIds.includes(user.id) ? (
                <div className="min-h-[42px] px-4 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-rose-400" />
                  <span>CP Proposal Pending</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={proposingCp || currentUser.coins < 10000}
                  onClick={async () => {
                    setProposingCp(true);
                    try {
                      await onProposeCp(user.id);
                    } finally {
                      setProposingCp(false);
                    }
                  }}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:opacity-95 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-45"
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>{proposingCp ? 'Sending Proposal...' : 'Propose CP (10,000 Coins)'}</span>
                </button>
              )
            )}

            {/* Recharge User Coins */}
            {isRechargeAllowedUser(currentUser) && (
              <div className="rounded-2xl bg-[#0C0914] border border-emerald-400/25 p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    <span>Recharge Coins to {user.name}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '50K', val: '50000' },
                    { label: '500K', val: '500000' },
                    { label: '5M', val: '5000000' },
                    { label: '50M', val: '50000000' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setRechargeAmt(p.val)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono-nums font-bold border ${
                        rechargeAmt === p.val
                          ? 'bg-emerald-500 text-[#091320] border-emerald-400'
                          : 'bg-[#161124] text-slate-300 border-white/10'
                      }`}
                    >
                      +{p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={rechargeAmt}
                    onChange={(e) => setRechargeAmt(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl bg-[#161124] border border-white/15 font-mono-nums text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    disabled={
                      recharging ||
                      Number(rechargeAmt) < 100 ||
                      currentUser.coins < Number(rechargeAmt)
                    }
                    onClick={async () => {
                      setRecharging(true);
                      try {
                        await onRechargeUser(user.id, Math.floor(Number(rechargeAmt)));
                      } finally {
                        setRecharging(false);
                      }
                    }}
                    className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#091320] font-semibold text-xs whitespace-nowrap disabled:opacity-40"
                  >
                    {recharging ? 'Sending...' : 'Send Coins'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
