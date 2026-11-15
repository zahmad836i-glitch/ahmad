/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Users, Rocket, User, Coins, Gem, Trophy } from 'lucide-react';
import {
  CpRequest,
  DirectMessage,
  FRUIT_SLOTS,
  FruitGameState,
  FruitId,
  GameRankEntry,
  GameWinAnnouncement,
  GiftItem,
  GiftLaunchEvent,
  PartyRoom,
  RocketGameState,
  RoomCategory,
  RoomChatMessage,
  UserProfile,
  WHEEL_SLOTS,
  WheelEmblem,
  WheelGameState,
} from './types';
import { resolveAsset } from './lib/assets';
import { soundEngine } from './lib/audio';
import { getUserNameClass } from './lib/userStyle';
import { AuthView } from './components/AuthView';
import { HomeRoomsView } from './components/HomeRoomsView';
import { VoiceRoomView } from './components/VoiceRoomView';
import { FriendsView } from './components/FriendsView';
import { ProfileWalletView } from './components/ProfileWalletView';
import { RocketGamePanel } from './components/RocketGamePanel';
import { LuckyWheelPanel } from './components/LuckyWheelPanel';
import { FruitPartyPanel } from './components/FruitPartyPanel';
import { UserProfileModal } from './components/UserProfileModal';
import { GameTopRanking } from './components/GameTopRanking';

type NavTab = 'rooms' | 'games' | 'friends' | 'profile';

const INITIAL_ROCKET: RocketGameState = {
  roundId: 1762692,
  phase: 'COUNTDOWN',
  countdownSeconds: 9,
  multiplier: 1.0,
  crashPoint: null,
  bets: [],
  history: [1.44, 47.04, 1.29, 1.89, 5.03, 1.5],
};

const INITIAL_WHEEL: WheelGameState = {
  roundId: 1114001546,
  phase: 'BETTING',
  secondsLeft: 15,
  winningEmblem: null,
  winningMultiplier: null,
  emblemTotals: WHEEL_SLOTS.reduce(
    (acc, s) => ({ ...acc, [s.emblem]: 0 }),
    {} as Record<WheelEmblem, number>
  ),
  myBets: {},
  history: ['lamborghini', 'mercedes', 'vw', 'bmw'],
  winners: [],
};

const INITIAL_FRUIT: FruitGameState = {
  roundId: 804210,
  phase: 'BETTING',
  secondsLeft: 12,
  winningFruit: null,
  winningMultiplier: null,
  fruitTotals: FRUIT_SLOTS.reduce(
    (acc, s) => ({ ...acc, [s.id]: 0 }),
    {} as Record<FruitId, number>
  ),
  myBets: {},
  history: ['strawberry', 'watermelon', 'orange', 'mango', 'lemon', 'apple'],
  winners: [],
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [booting, setBooting] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('rooms');
  const [activeGameTab, setActiveGameTab] = useState<'fruit' | 'rocket' | 'wheel'>('fruit');

  const [rooms, setRooms] = useState<PartyRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<PartyRoom | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);

  const [rocketState, setRocketState] = useState<RocketGameState>(INITIAL_ROCKET);
  const [wheelState, setWheelState] = useState<WheelGameState>(INITIAL_WHEEL);
  const [fruitState, setFruitState] = useState<FruitGameState>(INITIAL_FRUIT);
  const [recentWins, setRecentWins] = useState<GameWinAnnouncement[]>([]);
  const [gameRankings, setGameRankings] = useState<GameRankEntry[]>([]);
  const [incomingCpRequests, setIncomingCpRequests] = useState<CpRequest[]>([]);
  const [outgoingCpRequests, setOutgoingCpRequests] = useState<CpRequest[]>([]);
  const [activeWinBanner, setActiveWinBanner] = useState<GameWinAnnouncement | null>(null);
  const [activeGiftBanner, setActiveGiftBanner] = useState<GiftLaunchEvent | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const giftTimerRef = useRef<number | null>(null);
  const winTimerRef = useRef<number | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeRoomIdRef.current = activeRoom?.id || null;
  }, [activeRoom?.id]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 3000);
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch {
      // Ignore network fetch errors
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Restore saved session on boot
  useEffect(() => {
    const savedId = localStorage.getItem('vv_user_id');
    if (!savedId) {
      setBooting(false);
      return;
    }
    fetch(`/api/users/${savedId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        } else {
          localStorage.removeItem('vv_user_id');
        }
      })
      .catch(() => {})
      .finally(() => setBooting(false));
  }, []);

  const fetchGameRankings = useCallback(async () => {
    try {
      const res = await fetch('/api/games/rankings');
      if (res.ok) {
        const data = await res.json();
        setGameRankings(data.rankings || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  const fetchCpRequests = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/cp/requests/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setIncomingCpRequests(data.incoming || []);
        setOutgoingCpRequests(data.outgoing || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Load rooms & users once authenticated
  useEffect(() => {
    if (!currentUser) return;
    fetchRooms();
    fetchUsers();
    fetchGameRankings();
    fetchCpRequests(currentUser.id);
  }, [currentUser?.id, fetchRooms, fetchUsers, fetchGameRankings, fetchCpRequests]);

  // Refresh user directory when opening Friends, Profile Wallet, or Games
  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'friends' || activeTab === 'profile') {
      fetchUsers();
    } else if (activeTab === 'games') {
      fetchGameRankings();
    }
  }, [activeTab, currentUser, fetchUsers, fetchGameRankings]);

  // Load DM thread when peer changes
  useEffect(() => {
    if (!currentUser || !selectedPeerId) return;
    fetch(`/api/messages/${currentUser.id}/${selectedPeerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.messages) {
          setDirectMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            for (const m of data.messages as DirectMessage[]) {
              if (!ids.has(m.id)) merged.push(m);
            }
            return merged.sort((a, b) => a.timestamp - b.timestamp);
          });
        }
      })
      .catch(() => {});
  }, [currentUser?.id, selectedPeerId]);

  // WebSocket Connection & Auto-Reconnect
  useEffect(() => {
    if (!currentUser) return;
    let closed = false;
    let reconnectTimer: number | null = null;

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ event: 'auth', payload: { userId: currentUser.id } }));
        if (activeRoomIdRef.current) {
          ws.send(
            JSON.stringify({ event: 'room:join', payload: { roomId: activeRoomIdRef.current } })
          );
        }
      };

      ws.onmessage = (evt) => {
        try {
          const { event, payload } = JSON.parse(evt.data);
          if (event === 'user:updated') {
            const updatedUser = payload as UserProfile;
            setCurrentUser((prev) =>
              prev && prev.id === updatedUser.id ? updatedUser : prev
            );
            setAllUsers((prev) =>
              prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
            );
          } else if (event === 'cp:request:new' || event === 'cp:updated') {
            fetchCpRequests(currentUser.id);
            fetchUsers();
          } else if (event === 'room:state') {
            const updated = payload as PartyRoom;
            setActiveRoom((prev) => (prev && prev.id === updated.id ? updated : prev));
            setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          } else if (event === 'room:chat:new') {
            const msg = payload as RoomChatMessage;
            setActiveRoom((prev) => {
              if (!prev || prev.id !== msg.roomId) return prev;
              if (prev.messages.some((m) => m.id === msg.id)) return prev;
              return { ...prev, messages: [...prev.messages, msg] };
            });
          } else if (event === 'room:gift:launch') {
            const launch = payload as GiftLaunchEvent;
            setActiveGiftBanner(launch);
            soundEngine.playGiftLaunch();
            if (giftTimerRef.current) window.clearTimeout(giftTimerRef.current);
            giftTimerRef.current = window.setTimeout(() => {
              setActiveGiftBanner(null);
            }, 4500);
          } else if (event === 'rocket:state') {
            setRocketState(payload as RocketGameState);
          } else if (event === 'wheel:state') {
            setWheelState(payload as WheelGameState);
          } else if (event === 'fruit:state') {
            setFruitState(payload as FruitGameState);
          } else if (event === 'game:wins:history') {
            setRecentWins((payload as GameWinAnnouncement[]) || []);
          } else if (event === 'game:ranking:updated') {
            setGameRankings((payload as GameRankEntry[]) || []);
          } else if (event === 'game:win') {
            const win = payload as GameWinAnnouncement;
            setRecentWins((prev) => {
              if (prev.some((w) => w.id === win.id)) return prev;
              return [win, ...prev].slice(0, 20);
            });
            setActiveWinBanner(win);
            if (win.userId === currentUser.id) {
              soundEngine.playCashout();
            }
            if (winTimerRef.current) window.clearTimeout(winTimerRef.current);
            winTimerRef.current = window.setTimeout(() => {
              setActiveWinBanner(null);
            }, 4500);
          } else if (event === 'dm:new') {
            const dm = payload as DirectMessage;
            setDirectMessages((prev) => {
              if (prev.some((m) => m.id === dm.id)) return prev;
              return [...prev, dm];
            });
          } else if (event === 'rooms:list:updated') {
            fetchRooms();
          } else if (event === 'error:toast') {
            showToast(payload?.message || 'Action could not be completed.');
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onclose = () => {
        if (!closed) {
          reconnectTimer = window.setTimeout(connect, 1800);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (winTimerRef.current) window.clearTimeout(winTimerRef.current);
      wsRef.current?.close();
    };
  }, [currentUser?.id, fetchRooms, fetchCpRequests, fetchUsers, showToast]);

  const sendWs = useCallback((event: string, payload?: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, payload }));
    }
  }, []);

  const handleAuthenticated = (user: UserProfile, isNewUser?: boolean) => {
    localStorage.setItem('vv_user_id', user.id);
    setCurrentUser(user);
    setActiveTab('rooms');
    if (isNewUser) {
      showToast('Welcome Reward! +500,000 Coins added to your Profile Wallet.');
      soundEngine.playGiftLaunch();
    }
  };

  const handleLogout = () => {
    if (activeRoom) {
      sendWs('room:leave', { roomId: activeRoom.id });
    }
    localStorage.removeItem('vv_user_id');
    setActiveRoom(null);
    setCurrentUser(null);
  };

  const handleJoinRoom = (room: PartyRoom) => {
    setActiveRoom(room);
    sendWs('room:join', { roomId: room.id });
  };

  const handleLeaveRoom = () => {
    if (activeRoom) {
      sendWs('room:leave', { roomId: activeRoom.id });
    }
    setActiveRoom(null);
    fetchRooms();
  };

  const handleCreateRoom = async (payload: {
    title: string;
    topic: string;
    category: RoomCategory;
  }) => {
    if (!currentUser) return;
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: currentUser.id, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not create room.');
      return;
    }
    await fetchRooms();
    handleJoinRoom(data.room);
  };

  const handleFollowToggle = async (targetId: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/users/${currentUser.id}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId }),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      setCurrentUser(data.user);
      setAllUsers((prev) =>
        prev.map((u) => {
          if (u.id === data.user.id) return data.user;
          if (u.id === data.target.id) return data.target;
          return u;
        })
      );
      showToast(data.following ? `Following ${data.target.name}` : `Unfollowed ${data.target.name}`);
    }
  };

  const handleSendDirectMessage = async (toUserId: string, text: string) => {
    if (!currentUser) return;
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUserId: currentUser.id, toUserId, text }),
    });
    const data = await res.json();
    if (res.ok && data.message) {
      setDirectMessages((prev) =>
        prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]
      );
    }
  };

  const handleUpdateProfile = async (updates: { name: string; bio: string; avatar: string }) => {
    if (!currentUser) return;
    const res = await fetch(`/api/users/${currentUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      setCurrentUser(data.user);
      showToast('Profile updated!');
    }
  };

  const handleWalletAction = async (
    action: 'daily_room_reward' | 'diamonds_to_coins' | 'coins_to_diamonds',
    amount?: number
  ) => {
    if (!currentUser) return;
    const body: Record<string, unknown> = { userId: currentUser.id, action };
    if (action === 'diamonds_to_coins') body.diamonds = amount;
    if (action === 'coins_to_diamonds') body.coins = amount;

    const res = await fetch('/api/wallet/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Wallet action failed.');
      return;
    }
    setCurrentUser(data.user);
    showToast(data.message);
    soundEngine.playCashout();
  };

  const handleViewUserProfile = useCallback(async (userId: string) => {
    setInspectedUserId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          setAllUsers((prev) => {
            const exists = prev.some((u) => u.id === data.user.id);
            return exists
              ? prev.map((u) => (u.id === data.user.id ? data.user : u))
              : [...prev, data.user];
          });
        }
      }
    } catch {
      // Ignore network fetch errors
    }
  }, []);

  const handleRechargeUser = async (targetUserId: string, amount: number): Promise<boolean> => {
    if (!currentUser) return false;
    const res = await fetch('/api/wallet/recharge-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromUserId: currentUser.id,
        targetUserId,
        amount,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Recharge failed.');
      return false;
    }
    if (data.sender) {
      setCurrentUser(data.sender);
    }
    setAllUsers((prev) =>
      prev.map((u) => {
        if (data.sender && u.id === data.sender.id) return data.sender;
        if (data.target && u.id === data.target.id) return data.target;
        return u;
      })
    );
    showToast(data.message || 'Coins recharged!');
    soundEngine.playCashout();
    return true;
  };

  const handleProposeCp = async (toUserId: string): Promise<boolean> => {
    if (!currentUser) return false;
    const res = await fetch('/api/cp/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUserId: currentUser.id, toUserId }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not send CP proposal.');
      return false;
    }
    if (data.user) setCurrentUser(data.user);
    if (data.request) {
      setOutgoingCpRequests((prev) => [data.request, ...prev]);
    }
    showToast('💑 CP Partner proposal sent! (10,000 Coins Ring)');
    soundEngine.playGiftLaunch();
    return true;
  };

  const handleRespondCp = async (requestId: string, accept: boolean): Promise<void> => {
    if (!currentUser) return;
    const res = await fetch('/api/cp/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, userId: currentUser.id, accept }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not respond to CP proposal.');
      return;
    }
    if (data.user) setCurrentUser(data.user);
    await Promise.all([fetchCpRequests(currentUser.id), fetchUsers()]);
    if (accept) {
      showToast(`💑 You and ${data.partner?.name || 'Partner'} are now CP Partners!`);
      soundEngine.playGiftLaunch();
    } else {
      showToast('CP proposal declined.');
    }
  };

  const handleBreakCp = async (): Promise<void> => {
    if (!currentUser) return;
    const res = await fetch('/api/cp/break', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not break CP partnership.');
      return;
    }
    if (data.user) setCurrentUser(data.user);
    await fetchUsers();
    showToast('CP partnership ended.');
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-[#0C0914] flex items-center justify-center text-sm text-slate-400">
        Loading Zariya...
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-[#0C0914] text-[#F5F2FA] pb-20 lg:pb-8">
      {/* Desktop & Mobile Top Navigation Header (3-Zone Contract) */}
      <header className="sticky top-0 z-40 bg-[#0C0914]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title */}
          <button
            type="button"
            onClick={() => {
              if (activeRoom) handleLeaveRoom();
              setActiveTab('rooms');
            }}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2.5"
          >
            <span className="w-8 h-8 rounded-lg bg-amber-500 text-[#0C0914] flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </span>
            <span>Zariya</span>
          </button>

          {/* Zone 2: Primary Nav Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                if (activeRoom) handleLeaveRoom();
                setActiveTab('rooms');
              }}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
                activeTab === 'rooms' && !activeRoom
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Party Rooms
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeRoom) handleLeaveRoom();
                setActiveTab('games');
              }}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
                activeTab === 'games' && !activeRoom
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Rocket &amp; Wheel
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeRoom) handleLeaveRoom();
                setActiveTab('friends');
              }}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
                activeTab === 'friends' && !activeRoom
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Friends
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeRoom) handleLeaveRoom();
                setActiveTab('profile');
              }}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
                activeTab === 'profile' && !activeRoom
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Profile
            </button>
          </nav>

          {/* Zone 3: Wallet & User Action */}
          <button
            type="button"
            onClick={() => {
              if (activeRoom) handleLeaveRoom();
              setActiveTab('profile');
            }}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#161124] border border-white/10 hover:border-amber-400/50 transition-colors shrink-0"
          >
            <span className="flex items-center gap-1 text-xs font-mono-nums font-bold text-amber-300">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              {currentUser.coins.toLocaleString()}
            </span>
            <span className="hidden sm:flex items-center gap-1 text-xs font-mono-nums font-bold text-sky-300">
              <Gem className="w-3.5 h-3.5 text-sky-400" />
              {currentUser.diamonds.toLocaleString()}
            </span>
            <img
              src={resolveAsset(currentUser.avatar)}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover border border-amber-400/60"
            />
          </button>
        </div>
      </header>

      {/* Live Game Win Celebration Banner */}
      {activeWinBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,460px)] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#112A24] via-[#17362C] to-[#1D1230] border border-emerald-400/50 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <img
              src={resolveAsset(activeWinBanner.userAvatar)}
              alt={activeWinBanner.userName}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover border border-emerald-400/50 shrink-0"
            />
            <div className="min-w-0 text-xs">
              <div className="truncate">
                <span
                  className={`font-bold ${getUserNameClass(
                    activeWinBanner.userName,
                    undefined,
                    'text-white'
                  )}`}
                >
                  {activeWinBanner.userName}
                </span>{' '}
                <span className="text-slate-300">won in</span>{' '}
                <span className="font-semibold text-amber-300">
                  {activeWinBanner.game === 'fruit'
                    ? 'Fruit Party'
                    : activeWinBanner.game === 'wheel'
                    ? 'Luxury Wheel'
                    : 'Rocket'}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                {activeWinBanner.targetLabel}
              </div>
            </div>
          </div>
          <div className="font-mono-nums text-xs font-extrabold text-emerald-300 shrink-0">
            +{activeWinBanner.payout.toLocaleString()} Coins
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-amber-500 text-[#0C0914] font-semibold text-xs shadow-xl">
          {toast}
        </div>
      )}

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
        {activeRoom ? (
          <VoiceRoomView
            room={activeRoom}
            currentUser={currentUser}
            rocketState={rocketState}
            wheelState={wheelState}
            fruitState={fruitState}
            recentWins={recentWins}
            gameRankings={gameRankings}
            activeGiftBanner={activeGiftBanner}
            onLeaveRoom={handleLeaveRoom}
            onTakeSeat={(seatIndex) =>
              sendWs('room:seat:take', { roomId: activeRoom.id, seatIndex, micOn: true })
            }
            onLeaveSeat={() => sendWs('room:seat:leave', { roomId: activeRoom.id })}
            onToggleMic={(micOn) => sendWs('room:seat:mic', { roomId: activeRoom.id, micOn })}
            onSpeakingChange={(speaking) =>
              sendWs('room:seat:speaking', { roomId: activeRoom.id, speaking })
            }
            onSendChat={(text) => sendWs('room:chat', { roomId: activeRoom.id, text })}
            onSendGift={(gift: GiftItem, targetSeatIndex: number, quantity: number) =>
              sendWs('room:gift', {
                roomId: activeRoom.id,
                giftId: gift.id,
                targetSeatIndex,
                quantity,
              })
            }
            onRocketBet={(amount, autoCashout) =>
              sendWs('rocket:bet', { amount, autoCashout })
            }
            onRocketCashout={() => sendWs('rocket:cashout', {})}
            onWheelBet={(emblem, amount) => sendWs('wheel:bet', { emblem, amount })}
            onFruitBet={(fruit, amount) => sendWs('fruit:bet', { fruit, amount })}
            onFollowUser={handleFollowToggle}
            onRechargeUser={handleRechargeUser}
            onViewUserProfile={handleViewUserProfile}
            onClaimDailyReward={() => handleWalletAction('daily_room_reward')}
            onToast={showToast}
          />
        ) : (
          <>
            {activeTab === 'rooms' && (
              <HomeRoomsView
                rooms={rooms}
                currentUser={currentUser}
                onJoinRoom={handleJoinRoom}
                onCreateRoom={handleCreateRoom}
              />
            )}

            {activeTab === 'games' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold">
                      Live Arcade Games
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                      Play live server-synced Fruit Party, Rocket Crash &amp; Luxury Wheel rounds with Coins
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#161124] border border-white/10 self-start">
                    <button
                      type="button"
                      onClick={() => setActiveGameTab('fruit')}
                      className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        activeGameTab === 'fruit'
                          ? 'bg-emerald-500 text-[#091320]'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      🍓 Fruit Party
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGameTab('rocket')}
                      className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        activeGameTab === 'rocket'
                          ? 'bg-sky-500 text-[#091320]'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Rocket Crash
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGameTab('wheel')}
                      className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        activeGameTab === 'wheel'
                          ? 'bg-rose-500 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Luxury Wheel
                    </button>
                  </div>
                </div>

                {/* Top Ranking Above Games */}
                <GameTopRanking
                  rankings={gameRankings}
                  currentUserId={currentUser.id}
                  onViewUserProfile={handleViewUserProfile}
                />

                <div className="max-w-3xl">
                  {activeGameTab === 'fruit' && (
                    <FruitPartyPanel
                      gameState={fruitState}
                      currentUser={currentUser}
                      recentWins={recentWins}
                      onPlaceBet={(fruit, amount) => sendWs('fruit:bet', { fruit, amount })}
                      onBack={() => setActiveTab('rooms')}
                    />
                  )}
                  {activeGameTab === 'rocket' && (
                    <RocketGamePanel
                      gameState={rocketState}
                      currentUser={currentUser}
                      recentWins={recentWins}
                      onPlaceBet={(amount, autoCashout) =>
                        sendWs('rocket:bet', { amount, autoCashout })
                      }
                      onCashout={() => sendWs('rocket:cashout', {})}
                      onBack={() => setActiveTab('rooms')}
                    />
                  )}
                  {activeGameTab === 'wheel' && (
                    <LuckyWheelPanel
                      gameState={wheelState}
                      currentUser={currentUser}
                      recentWins={recentWins}
                      onPlaceBet={(emblem, amount) =>
                        sendWs('wheel:bet', { emblem, amount })
                      }
                      onBack={() => setActiveTab('rooms')}
                    />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'friends' && (
              <FriendsView
                currentUser={currentUser}
                allUsers={allUsers}
                directMessages={directMessages}
                incomingCpRequests={incomingCpRequests}
                onFollowToggle={handleFollowToggle}
                selectedPeerId={selectedPeerId}
                onSelectPeer={(peerId) => setSelectedPeerId(peerId || null)}
                onSendDirectMessage={handleSendDirectMessage}
                onRechargeUser={handleRechargeUser}
                onRespondCp={handleRespondCp}
                onViewUserProfile={handleViewUserProfile}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileWalletView
                currentUser={currentUser}
                allUsers={allUsers}
                incomingCpRequests={incomingCpRequests}
                onUpdateProfile={handleUpdateProfile}
                onWalletAction={handleWalletAction}
                onRechargeUser={handleRechargeUser}
                onRespondCp={handleRespondCp}
                onBreakCp={handleBreakCp}
                onViewUserProfile={handleViewUserProfile}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </main>

      {/* Other User ID Profile Modal */}
      <UserProfileModal
        user={
          inspectedUserId
            ? allUsers.find((u) => u.id === inspectedUserId) ||
              (currentUser.id === inspectedUserId ? currentUser : null)
            : null
        }
        currentUser={currentUser}
        outgoingCpIds={outgoingCpRequests.map((r) => r.toUserId)}
        incomingCpRequest={
          inspectedUserId
            ? incomingCpRequests.find((r) => r.fromUserId === inspectedUserId) || null
            : null
        }
        onClose={() => setInspectedUserId(null)}
        onFollowToggle={handleFollowToggle}
        onOpenChat={(targetId) => {
          if (activeRoom) handleLeaveRoom();
          setSelectedPeerId(targetId);
          setActiveTab('friends');
        }}
        onRechargeUser={handleRechargeUser}
        onProposeCp={handleProposeCp}
        onRespondCp={handleRespondCp}
        onViewUserProfile={handleViewUserProfile}
        onToast={showToast}
      />

      {/* Mobile Bottom Thumb-Zone Navigation Bar (Hidden inside active Voice Room or Desktop) */}
      {!activeRoom && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#120D1E]/95 backdrop-blur-md border-t border-white/10 grid grid-cols-4 h-16">
          <button
            type="button"
            onClick={() => setActiveTab('rooms')}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              activeTab === 'rooms' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <Mic className="w-5 h-5" />
            <span>Rooms</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('games')}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              activeTab === 'games' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <Rocket className="w-5 h-5" />
            <span>Games</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              activeTab === 'friends' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Friends</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              activeTab === 'profile' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </button>
        </nav>
      )}
    </div>
  );
}
