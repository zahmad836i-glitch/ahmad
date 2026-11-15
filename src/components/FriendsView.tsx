import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  Check,
  Send,
  MessageCircle,
  ArrowLeft,
  Coins,
  Search,
  User,
  HeartHandshake,
} from 'lucide-react';
import { CpRequest, DirectMessage, UserProfile } from '../types';
import { resolveAsset } from '../lib/assets';
import { getUserNameClass, isRechargeAllowedUser } from '../lib/userStyle';

interface FriendsViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  directMessages: DirectMessage[];
  incomingCpRequests?: CpRequest[];
  onFollowToggle: (targetId: string) => void;
  onSelectPeer: (peerId: string) => void;
  selectedPeerId: string | null;
  onSendDirectMessage: (toUserId: string, text: string) => Promise<void>;
  onRechargeUser: (targetUserId: string, amount: number) => Promise<boolean>;
  onRespondCp?: (requestId: string, accept: boolean) => Promise<void>;
  onViewUserProfile: (userId: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentUser,
  allUsers,
  directMessages,
  incomingCpRequests = [],
  onFollowToggle,
  onSelectPeer,
  selectedPeerId,
  onSendDirectMessage,
  onRechargeUser,
  onRespondCp,
  onViewUserProfile,
}) => {
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const [search, setSearch] = useState('');
  const [dmText, setDmText] = useState('');
  const [sending, setSending] = useState(false);
  const [showRechargeBar, setShowRechargeBar] = useState(false);
  const [rechargeAmt, setRechargeAmt] = useState('500000');
  const [recharging, setRecharging] = useState(false);
  const [respondingCpId, setRespondingCpId] = useState<string | null>(null);

  const peers = allUsers.filter((u) => u.id !== currentUser.id);
  const q = search.trim().toLowerCase();
  const visiblePeers = (
    filter === 'following' ? peers.filter((u) => currentUser.followingIds.includes(u.id)) : peers
  ).filter(
    (u) =>
      !q ||
      u.name.toLowerCase().includes(q) ||
      (u.uid || '').toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
  );

  const activePeer = peers.find((p) => p.id === selectedPeerId) || null;

  useEffect(() => {
    if (!selectedPeerId && peers.length > 0 && window.innerWidth >= 1024) {
      onSelectPeer(peers[0].id);
    }
  }, [selectedPeerId, peers, onSelectPeer]);

  const threadMessages = activePeer
    ? directMessages.filter(
        (m) =>
          (m.fromUserId === currentUser.id && m.toUserId === activePeer.id) ||
          (m.fromUserId === activePeer.id && m.toUserId === currentUser.id)
      )
    : [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePeer || !dmText.trim()) return;
    setSending(true);
    try {
      await onSendDirectMessage(activePeer.id, dmText.trim());
      setDmText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Friends &amp; Messages</h1>
          <p className="text-sm text-slate-400 mt-1">
            Follow room hosts and send real-time private messages
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#161124] border border-white/10 self-start">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'all' ? 'bg-amber-500 text-[#0C0914]' : 'text-slate-300 hover:text-white'
            }`}
          >
            Community ({peers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('following')}
            className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'following'
                ? 'bg-amber-500 text-[#0C0914]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Following ({currentUser.followingIds.length})
          </button>
        </div>
      </div>

      {incomingCpRequests.length > 0 && onRespondCp && (
        <div className="rounded-2xl bg-gradient-to-r from-rose-500/15 via-pink-500/10 to-amber-500/15 border border-rose-400/35 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-200">
            <HeartHandshake className="w-4 h-4 text-rose-400" />
            <span>CP Partner Proposals ({incomingCpRequests.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {incomingCpRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-[#0C0914] border border-white/10 p-3"
              >
                <button
                  type="button"
                  onClick={() => onViewUserProfile(req.fromUserId)}
                  className="flex items-center gap-2.5 min-w-0 text-left"
                >
                  <img
                    src={resolveAsset(req.fromUserAvatar)}
                    alt={req.fromUserName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover border border-rose-400/50 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{req.fromUserName}</div>
                    <div className="text-[11px] font-mono-nums text-slate-400">
                      UID: {req.fromUserUid} · 10,000 Ring
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
                    className="min-h-[36px] px-3 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold"
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
                    className="min-h-[36px] px-3 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Friends Directory */}
        <div
          className={`lg:col-span-5 rounded-3xl bg-[#161124] border border-white/10 divide-y divide-white/10 overflow-hidden ${
            activePeer ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="p-3 bg-[#120D1E]">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user name or UID..."
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#0C0914] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {visiblePeers.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No matching users found.
            </div>
          ) : (
            visiblePeers.map((peer) => {
              const isFollowing = currentUser.followingIds.includes(peer.id);
              const isSelected = activePeer?.id === peer.id;
              return (
                <div
                  key={peer.id}
                  className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-white/8' : 'hover:bg-white/5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPeer(peer.id)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  >
                    <img
                      src={resolveAsset(peer.avatar)}
                      alt={peer.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border border-white/15 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold text-sm truncate ${getUserNameClass(
                            peer.name,
                            peer.email,
                            'text-white'
                          )}`}
                        >
                          {peer.name}
                        </span>
                        <span className="text-xs font-mono-nums text-amber-300">
                          Lv.{peer.level}
                        </span>
                        {currentUser.cpPartnerId === peer.id && (
                          <span className="text-[11px] font-semibold text-rose-300 whitespace-nowrap">
                            · 💑 CP
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono-nums text-amber-200/80 truncate">
                        UID: {peer.uid || peer.id}
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{peer.bio}</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onViewUserProfile(peer.id)}
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-200"
                      title={`View ${peer.name}'s ID profile`}
                      aria-label={`View ${peer.name} profile`}
                    >
                      <User className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onFollowToggle(peer.id)}
                      className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        isFollowing
                          ? 'bg-white/10 text-slate-200 hover:bg-white/15'
                          : 'bg-amber-500 text-[#0C0914] hover:bg-amber-400'
                      }`}
                    >
                      {isFollowing ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isFollowing ? 'Following' : 'Follow'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectPeer(peer.id)}
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-200 lg:hidden"
                      aria-label={`Message ${peer.name}`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Private Message Chat */}
        <div
          className={`lg:col-span-7 rounded-3xl bg-[#161124] border border-white/10 flex flex-col h-[500px] ${
            activePeer ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {activePeer ? (
            <>
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelectPeer('')}
                    className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center lg:hidden"
                    aria-label="Back to friends list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <img
                    src={resolveAsset(activePeer.avatar)}
                    alt={activePeer.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`font-display text-sm font-bold truncate ${getUserNameClass(
                          activePeer.name,
                          activePeer.email,
                          'text-white'
                        )}`}
                      >
                        {activePeer.name}
                      </span>
                      {currentUser.cpPartnerId === activePeer.id && (
                        <span className="text-xs font-semibold text-rose-300 whitespace-nowrap shrink-0">
                          · 💑 CP Partner
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      <span className="font-mono-nums text-amber-200/90 mr-1.5">
                        UID: {activePeer.uid || activePeer.id}
                      </span>
                      · Lv.{activePeer.level} · {activePeer.followerCount} followers ·{' '}
                      <span className="font-mono-nums text-amber-300">
                        {activePeer.coins.toLocaleString()} Coins
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onViewUserProfile(activePeer.id)}
                    className="min-h-[40px] px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Profile</span>
                  </button>

                  {isRechargeAllowedUser(currentUser) && (
                    <button
                      type="button"
                      onClick={() => setShowRechargeBar((s) => !s)}
                      className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                        showRechargeBar
                          ? 'bg-emerald-500 text-[#091320] border-emerald-400'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35 hover:bg-emerald-500/25'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Recharge</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onFollowToggle(activePeer.id)}
                    className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold ${
                      currentUser.followingIds.includes(activePeer.id)
                        ? 'bg-white/10 text-slate-200'
                        : 'bg-amber-500 text-[#0C0914]'
                    }`}
                  >
                    {currentUser.followingIds.includes(activePeer.id) ? 'Following' : 'Follow'}
                  </button>
                </div>
              </div>

              {isRechargeAllowedUser(currentUser) && showRechargeBar && (
                <div className="px-4 py-3 bg-[#0C0914] border-b border-white/10 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-300 mr-1">Recharge Coins:</span>
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
                      className="flex-1 h-9 px-3 rounded-lg bg-[#161124] border border-white/15 font-mono-nums text-xs text-white focus:outline-none focus:border-emerald-400"
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
                          const ok = await onRechargeUser(
                            activePeer.id,
                            Math.floor(Number(rechargeAmt))
                          );
                          if (ok) setShowRechargeBar(false);
                        } finally {
                          setRecharging(false);
                        }
                      }}
                      className="h-9 px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#091320] font-semibold text-xs whitespace-nowrap disabled:opacity-40"
                    >
                      {recharging ? 'Sending...' : 'Send Coins'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {threadMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400 text-center px-6">
                    Start a private conversation with {activePeer.name}.
                  </div>
                ) : (
                  threadMessages.map((m) => {
                    const isMe = m.fromUserId === currentUser.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm ${
                            isMe
                              ? 'bg-amber-500 text-[#0C0914] font-medium'
                              : 'bg-[#0C0914] border border-white/10 text-slate-100'
                          }`}
                        >
                          <p>{m.text}</p>
                          <div
                            className={`text-[10px] mt-1 font-mono-nums ${
                              isMe ? 'text-[#0C0914]/70' : 'text-slate-500'
                            }`}
                          >
                            {new Date(m.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={handleSend}
                className="p-3 border-t border-white/10 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={dmText}
                  onChange={(e) => setDmText(e.target.value)}
                  placeholder={`Message ${activePeer.name}...`}
                  className="flex-1 h-11 px-4 rounded-xl bg-[#0C0914] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="w-11 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0C0914] flex items-center justify-center shrink-0 transition-colors"
                  aria-label="Send private message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              Select a friend to open private messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
