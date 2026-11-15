import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Megaphone,
  Share2,
  Power,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Gift,
  Rocket,
  Sparkles,
  Heart,
  Armchair,
  Send,
  UserPlus,
  Check,
  Disc,
  Coins,
  User,
} from 'lucide-react';
import {
  FruitGameState,
  FruitId,
  GameRankEntry,
  GameWinAnnouncement,
  GiftItem,
  GiftLaunchEvent,
  PartyRoom,
  RocketGameState,
  RoomSeat,
  UserProfile,
  WheelEmblem,
  WheelGameState,
} from '../types';
import { resolveAsset, STAGE_BACKDROP } from '../lib/assets';
import { soundEngine } from '../lib/audio';
import { getUserNameClass, isRechargeAllowedUser, isZeeshanUser } from '../lib/userStyle';
import { GiftDrawer } from './GiftDrawer';
import { RocketGamePanel } from './RocketGamePanel';
import { LuckyWheelPanel } from './LuckyWheelPanel';
import { FruitPartyPanel } from './FruitPartyPanel';
import { GameTopRanking } from './GameTopRanking';

interface VoiceRoomViewProps {
  room: PartyRoom;
  currentUser: UserProfile;
  rocketState: RocketGameState;
  wheelState: WheelGameState;
  fruitState: FruitGameState;
  recentWins: GameWinAnnouncement[];
  gameRankings: GameRankEntry[];
  activeGiftBanner: GiftLaunchEvent | null;
  onLeaveRoom: () => void;
  onTakeSeat: (seatIndex: number) => void;
  onLeaveSeat: () => void;
  onToggleMic: (micOn: boolean) => void;
  onSpeakingChange: (speaking: boolean) => void;
  onSendChat: (text: string) => void;
  onSendGift: (gift: GiftItem, targetSeatIndex: number, quantity: number) => void;
  onRocketBet: (amount: number, autoCashout: number | null) => void;
  onRocketCashout: () => void;
  onWheelBet: (emblem: WheelEmblem, amount: number) => void;
  onFruitBet: (fruit: FruitId, amount: number) => void;
  onFollowUser: (targetId: string) => void;
  onRechargeUser: (targetUserId: string, amount: number) => Promise<boolean>;
  onViewUserProfile: (userId: string) => void;
  onClaimDailyReward: () => Promise<void>;
  onToast: (msg: string) => void;
}

type StageMode = 'stage' | 'fruit' | 'rocket' | 'wheel';

export const VoiceRoomView: React.FC<VoiceRoomViewProps> = ({
  room,
  currentUser,
  rocketState,
  wheelState,
  fruitState,
  recentWins,
  gameRankings,
  activeGiftBanner,
  onLeaveRoom,
  onTakeSeat,
  onLeaveSeat,
  onToggleMic,
  onSpeakingChange,
  onSendChat,
  onSendGift,
  onRocketBet,
  onRocketCashout,
  onWheelBet,
  onFruitBet,
  onFollowUser,
  onRechargeUser,
  onViewUserProfile,
  onClaimDailyReward,
  onToast,
}) => {
  const [stageMode, setStageMode] = useState<StageMode>('stage');
  const [speakerOn, setSpeakerOn] = useState(true);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showGiftDrawer, setShowGiftDrawer] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [selectedSeatModal, setSelectedSeatModal] = useState<RoomSeat | null>(null);
  const [seatRechargeAmt, setSeatRechargeAmt] = useState('500000');
  const [seatRecharging, setSeatRecharging] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Real Microphone audio level monitoring
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSpeakingRef = useRef<boolean>(false);

  const mySeat = room.seats.find((s) => s.userId === currentUser.id);
  const isSeated = Boolean(mySeat);
  const micOn = Boolean(mySeat?.micOn);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room.messages.length]);

  useEffect(() => {
    soundEngine.speakerEnabled = speakerOn;
  }, [speakerOn]);

  // Manage real Web Audio microphone stream when user is seated and micOn is true
  useEffect(() => {
    let cancelled = false;

    const cleanupAudio = () => {
      if (analyserRafRef.current) {
        cancelAnimationFrame(analyserRafRef.current);
        analyserRafRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      if (lastSpeakingRef.current) {
        lastSpeakingRef.current = false;
        onSpeakingChange(false);
      }
    };

    if (!isSeated || !micOn) {
      cleanupAudio();
      return;
    }

    async function startMic() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          const isSpeakingNow = avg > 14;
          if (isSpeakingNow !== lastSpeakingRef.current) {
            lastSpeakingRef.current = isSpeakingNow;
            onSpeakingChange(isSpeakingNow);
          }
          analyserRafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Microphone access declined or unavailable in sandbox; keep mic toggle working silently
      }
    }

    startMic();

    return () => {
      cancelled = true;
      cleanupAudio();
    };
  }, [isSeated, micOn, onSpeakingChange]);

  const handleSeatClick = (seat: RoomSeat) => {
    if (!seat.userId) {
      onTakeSeat(seat.seatIndex);
      soundEngine.playChime(620, 0.1);
      return;
    }
    if (seat.userId === currentUser.id) {
      setSelectedSeatModal(seat);
      return;
    }
    setSelectedSeatModal(seat);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const handleShareRoom = () => {
    const shareText = `Join my Zariya party room "${room.title}" (ID: ${room.id})`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareText).catch(() => {});
    }
    onToast(`Room ID ${room.id} invite copied!`);
  };

  const hostSeat = room.seats[0];
  const guestSeats = room.seats.slice(1);
  const isFollowingHost = currentUser.followingIds.includes(room.hostId);

  return (
    <div className="space-y-4">
      {/* Room Top Bar */}
      <div className="rounded-2xl bg-[#161124] border border-white/10 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onLeaveRoom}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center shrink-0"
            aria-label="Back to rooms"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onViewUserProfile(room.hostId)}
            className="shrink-0 rounded-full hover:scale-105 transition-transform"
            title={`View ${room.hostName}'s profile`}
          >
            <img
              src={resolveAsset(room.hostAvatar)}
              alt={room.hostName}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border border-amber-400/60"
            />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-sm sm:text-base font-bold text-white truncate">
                {room.title}
              </h1>
              {room.hostId !== currentUser.id && (
                <button
                  type="button"
                  onClick={() => onFollowUser(room.hostId)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors ${
                    isFollowingHost
                      ? 'bg-white/10 text-slate-300'
                      : 'bg-amber-500 text-[#0C0914]'
                  }`}
                >
                  {isFollowingHost ? <Check className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                  <span>{isFollowingHost ? 'Following' : 'Follow'}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono-nums">ID: {room.id}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-nums text-amber-300">{room.onlineCount} online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAnnouncement((a) => !a)}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-200"
            title="Room announcement"
            aria-label="Room announcement"
          >
            <Megaphone className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleShareRoom}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-200"
            title="Share room"
            aria-label="Share room"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onLeaveRoom}
            className="w-10 h-10 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 flex items-center justify-center"
            title="Exit room"
            aria-label="Exit room"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showAnnouncement && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-400/25 px-4 py-3 text-xs text-amber-100">
          <span className="font-semibold text-amber-300">Room Notice: </span>
          {room.announcement}
        </div>
      )}

      {/* Celebratory Gift Launch Banner */}
      {activeGiftBanner && (
        <div
          className={`rounded-2xl border px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg ${
            activeGiftBanner.luckyRebate && activeGiftBanner.luckyRebate > 0
              ? 'bg-gradient-to-r from-emerald-600/95 via-amber-500/90 to-emerald-600/95 border-emerald-300/80'
              : 'bg-gradient-to-r from-rose-600/90 via-amber-500/90 to-rose-600/90 border-amber-300/60'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl leading-none shrink-0">{activeGiftBanner.giftEmoji}</span>
            <p className="text-xs sm:text-sm font-bold text-white truncate">
              <span
                className={
                  isZeeshanUser(activeGiftBanner.senderName)
                    ? 'px-1.5 py-0.5 rounded bg-[#0C0914]/90 text-red-500 font-bold'
                    : ''
                }
              >
                {activeGiftBanner.senderName}
              </span>{' '}
              · Lv.{activeGiftBanner.senderLevel} launched {activeGiftBanner.giftName} ×
              {activeGiftBanner.quantity} to{' '}
              <span
                className={
                  isZeeshanUser(activeGiftBanner.targetName)
                    ? 'px-1.5 py-0.5 rounded bg-[#0C0914]/90 text-red-500 font-bold'
                    : ''
                }
              >
                {activeGiftBanner.targetName}
              </span>
              {activeGiftBanner.luckyRebate && activeGiftBanner.luckyRebate > 0 && (
                <span className="ml-1.5 font-mono-nums text-emerald-100">
                  · 🍀 LUCKY ×{activeGiftBanner.luckyMultiplier} (+
                  {activeGiftBanner.luckyRebate.toLocaleString()} Coins!)
                </span>
              )}
            </p>
          </div>
          <Sparkles className="w-4 h-4 text-amber-200 shrink-0" />
        </div>
      )}

      {/* Main 2-Column Room Workspace (Desktop: Stage Left 7 cols, Chat Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: 9-Seat Stage OR Embedded Rocket / Wheel Game */}
        <div className="lg:col-span-7 space-y-4">
          {/* Stage Mode Switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#161124] border border-white/10">
            <button
              type="button"
              onClick={() => setStageMode('stage')}
              className={`min-h-[40px] px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                stageMode === 'stage'
                  ? 'bg-amber-500 text-[#0C0914]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Stage</span>
            </button>
            <button
              type="button"
              onClick={() => setStageMode('fruit')}
              className={`min-h-[40px] px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                stageMode === 'fruit'
                  ? 'bg-emerald-500 text-[#091320]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🍓</span>
              <span>Fruit Party</span>
            </button>
            <button
              type="button"
              onClick={() => setStageMode('rocket')}
              className={`min-h-[40px] px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                stageMode === 'rocket'
                  ? 'bg-sky-500 text-[#091320]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Rocket</span>
            </button>
            <button
              type="button"
              onClick={() => setStageMode('wheel')}
              className={`min-h-[40px] px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                stageMode === 'wheel'
                  ? 'bg-rose-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Wheel</span>
            </button>
          </div>

          {stageMode === 'stage' && (
            <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#161124] p-5 sm:p-6">
              <img
                src={STAGE_BACKDROP}
                alt="Stage backdrop"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#161124]/60 via-[#161124]/80 to-[#0C0914]/95" />

              <div className="relative z-10 space-y-6">
                {/* Seat 0: Center Host Throne with Compact Daily Reward on Left */}
                <div className="relative flex items-center justify-center min-h-[118px]">
                  {(() => {
                    const today = new Date().toISOString().slice(0, 10);
                    const claimedToday = currentUser.lastDailyRewardDate === today;
                    return (
                      <button
                        type="button"
                        onClick={onClaimDailyReward}
                        className={`absolute left-0 top-1/2 -translate-y-1/2 px-2.5 py-2 rounded-2xl border flex flex-col items-center gap-1 transition-all max-w-[92px] ${
                          claimedToday
                            ? 'bg-white/5 border-white/10 text-slate-400'
                            : 'bg-gradient-to-b from-amber-500/25 to-rose-500/20 border-amber-400/50 text-amber-200 hover:scale-105 shadow-lg'
                        }`}
                        title="Claim Daily Reward up to 100,000 Coins"
                      >
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                          <Gift className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold leading-tight text-center">
                          Daily Reward
                        </span>
                        <span className="text-[9px] font-mono-nums text-amber-300 leading-none">
                          {claimedToday
                            ? `+${((currentUser.dailyRewardClaimedAmount || 0) / 1000).toFixed(0)}K ✓`
                            : 'Up to 100K'}
                        </span>
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => handleSeatClick(hostSeat)}
                    className="group relative flex flex-col items-center gap-1.5"
                  >
                    <div className="relative">
                      {hostSeat.speaking && (
                        <span className="absolute inset-0 rounded-full border-2 border-amber-400 animate-voice-ring" />
                      )}
                      <div
                        className={`w-20 h-20 rounded-full p-0.5 ${
                          hostSeat.userId
                            ? 'bg-gradient-to-tr from-amber-400 via-rose-400 to-amber-300'
                            : 'bg-white/15 border border-dashed border-amber-400/50'
                        }`}
                      >
                        {hostSeat.userId ? (
                          <img
                            src={resolveAsset(hostSeat.userAvatar)}
                            alt={hostSeat.userName || 'Host'}
                            referrerPolicy="no-referrer"
                            className="w-full h-full rounded-full object-cover border-2 border-[#161124]"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-[#1C142D] flex items-center justify-center text-amber-300">
                            <Armchair className="w-7 h-7" />
                          </div>
                        )}
                      </div>

                      {hostSeat.userId && (
                        <span
                          className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#161124] ${
                            hostSeat.micOn
                              ? 'bg-emerald-500 text-[#0C0914]'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {hostSeat.micOn ? (
                            <Mic className="w-3 h-3" />
                          ) : (
                            <MicOff className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </div>

                    <div className="text-center">
                      <div
                        className={`text-xs font-bold ${getUserNameClass(
                          hostSeat.userName,
                          undefined,
                          'text-white'
                        )}`}
                      >
                        {hostSeat.userName ? hostSeat.userName : 'Host Throne'}
                        {currentUser.cpPartnerId && hostSeat.userId === currentUser.cpPartnerId
                          ? ' 💑'
                          : ''}
                      </div>
                      <div className="text-[11px] font-mono-nums text-rose-300 flex items-center justify-center gap-1">
                        <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
                        <span>{hostSeat.hearts}</span>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Seats 1-8: 4x2 Guest Grid */}
                <div className="grid grid-cols-4 gap-3 sm:gap-4">
                  {guestSeats.map((seat) => {
                    const isMine = seat.userId === currentUser.id;
                    return (
                      <button
                        key={seat.seatIndex}
                        type="button"
                        onClick={() => handleSeatClick(seat)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 transition-colors"
                      >
                        <div className="relative">
                          {seat.speaking && (
                            <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-voice-ring" />
                          )}

                          {seat.userId ? (
                            <div
                              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 ${
                                isMine
                                  ? 'bg-amber-400'
                                  : 'bg-white/25'
                              }`}
                            >
                              <img
                                src={resolveAsset(seat.userAvatar)}
                                alt={seat.userName || `Seat ${seat.seatIndex}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full rounded-full object-cover border-2 border-[#161124]"
                              />
                            </div>
                          ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/8 border border-white/15 flex items-center justify-center text-slate-400 hover:text-amber-300 hover:border-amber-400/50 transition-colors">
                              <Armchair className="w-5 h-5" />
                            </div>
                          )}

                          {seat.userId && (
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#161124] ${
                                seat.micOn
                                  ? 'bg-emerald-500 text-[#0C0914]'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {seat.micOn ? (
                                <Mic className="w-2.5 h-2.5" />
                              ) : (
                                <MicOff className="w-2.5 h-2.5" />
                              )}
                            </span>
                          )}
                        </div>

                        <div className="text-center w-full">
                          <div
                            className={`text-xs font-medium truncate ${getUserNameClass(
                              seat.userName,
                              undefined,
                              'text-slate-100'
                            )}`}
                          >
                            {seat.userName || `Seat ${seat.seatIndex}`}
                            {currentUser.cpPartnerId && seat.userId === currentUser.cpPartnerId
                              ? ' 💑'
                              : ''}
                          </div>
                          {seat.userId ? (
                            <div className="text-[10px] font-mono-nums text-rose-300 flex items-center justify-center gap-0.5">
                              <Heart className="w-2.5 h-2.5 fill-rose-400 text-rose-400" />
                              <span>{seat.hearts}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500">Tap to sit</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {stageMode !== 'stage' && (
            <GameTopRanking
              rankings={gameRankings}
              currentUserId={currentUser.id}
              onViewUserProfile={onViewUserProfile}
              compact
            />
          )}

          {stageMode === 'fruit' && (
            <FruitPartyPanel
              gameState={fruitState}
              currentUser={currentUser}
              recentWins={recentWins}
              onPlaceBet={onFruitBet}
              onBack={() => setStageMode('stage')}
            />
          )}

          {stageMode === 'rocket' && (
            <RocketGamePanel
              gameState={rocketState}
              currentUser={currentUser}
              recentWins={recentWins}
              onPlaceBet={onRocketBet}
              onCashout={onRocketCashout}
              onBack={() => setStageMode('stage')}
            />
          )}

          {stageMode === 'wheel' && (
            <LuckyWheelPanel
              gameState={wheelState}
              currentUser={currentUser}
              recentWins={recentWins}
              onPlaceBet={onWheelBet}
              onBack={() => setStageMode('stage')}
            />
          )}

          {/* Room Audio & Gift Controls Dock (Fruit Party stacked directly above Send Gift) */}
          <div className="rounded-2xl bg-[#161124] border border-white/10 p-3 flex items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {isSeated ? (
                <button
                  type="button"
                  onClick={() => onToggleMic(!micOn)}
                  className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                    micOn
                      ? 'bg-emerald-500 text-[#0C0914]'
                      : 'bg-white/10 text-slate-200 hover:bg-white/15'
                  }`}
                >
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  <span>{micOn ? 'Mic On' : 'Mic Off'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const firstEmpty = room.seats.find((s) => !s.userId && s.seatIndex > 0);
                    if (firstEmpty) {
                      onTakeSeat(firstEmpty.seatIndex);
                      soundEngine.playChime(620, 0.1);
                    } else {
                      onToast('All guest seats are currently occupied.');
                    }
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0C0914] text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Armchair className="w-4 h-4" />
                  <span>Take Seat</span>
                </button>
              )}

              {isSeated && (
                <button
                  type="button"
                  onClick={onLeaveSeat}
                  className="min-h-[44px] px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                >
                  Step Down
                </button>
              )}

              <button
                type="button"
                onClick={() => setSpeakerOn((s) => !s)}
                className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  speakerOn
                    ? 'bg-white/10 text-white'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}
              >
                {speakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{speakerOn ? 'Speaker On' : 'Muted'}</span>
              </button>
            </div>

            <div className="flex flex-col items-stretch gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setStageMode(stageMode === 'fruit' ? 'stage' : 'fruit')}
                className={`min-h-[44px] px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border transition-colors whitespace-nowrap ${
                  stageMode === 'fruit'
                    ? 'bg-emerald-500 text-[#091320] border-emerald-400'
                    : 'bg-[#25183C] hover:bg-[#31204F] text-emerald-300 border-emerald-400/35'
                }`}
              >
                <span>🍓</span>
                <span>Fruit Party</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGiftDrawer(true)}
                className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-95 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg whitespace-nowrap"
              >
                <Gift className="w-4 h-4" />
                <span>Send Gift</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Compact Inside-Room Live Text Chat */}
        <div className="lg:col-span-5 rounded-2xl bg-[#161124] border border-white/10 flex flex-col h-[210px] lg:h-[290px]">
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-display text-xs font-bold text-white">Room Chat</h2>
            <span className="text-[11px] text-slate-400 font-mono-nums">
              {room.messages.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {room.messages.map((msg) => {
              if (msg.type === 'system') {
                return (
                  <div
                    key={msg.id}
                    className="text-[11px] text-slate-400 bg-white/5 rounded-lg px-2.5 py-1"
                  >
                    {msg.text}
                  </div>
                );
              }
              if (msg.type === 'gift') {
                return (
                  <div
                    key={msg.id}
                    className="text-[11px] bg-amber-500/10 border border-amber-400/20 rounded-lg px-2.5 py-1 text-amber-200"
                  >
                    <span
                      className={`font-semibold ${getUserNameClass(
                        msg.userName,
                        undefined,
                        'text-amber-300'
                      )}`}
                    >
                      {msg.userName}
                    </span>{' '}
                    <span>{msg.text}</span> <span>{msg.giftEmoji}</span>
                  </div>
                );
              }
              return (
                <div key={msg.id} className="text-xs leading-snug">
                  <span className="text-[10px] font-mono-nums text-amber-400 mr-1">
                    Lv.{msg.userLevel}
                  </span>
                  <span
                    className={`font-semibold mr-1 ${getUserNameClass(
                      msg.userName,
                      undefined,
                      'text-slate-200'
                    )}`}
                  >
                    {msg.userName}:
                  </span>
                  <span className="text-slate-300">{msg.text}</span>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Compact Quick Chat Reactions & Input */}
          <div className="p-2 border-t border-white/10 space-y-1.5">
            <div className="flex items-center gap-1 overflow-x-auto">
              {['Hello!', 'Nice voice!', 'Rocket 🚀', 'GG!'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSendChat(preset)}
                  className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 whitespace-nowrap shrink-0"
                >
                  {preset}
                </button>
              ))}
            </div>

            <form onSubmit={handleChatSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Chat in room..."
                className="flex-1 h-9 px-3 rounded-lg bg-[#0C0914] border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="w-9 h-9 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0C0914] flex items-center justify-center shrink-0 transition-colors"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Seat Action Popover Modal */}
      {selectedSeatModal && selectedSeatModal.userId && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-3xl bg-[#161124] border border-white/15 p-5 text-center space-y-4">
            <img
              src={resolveAsset(selectedSeatModal.userAvatar)}
              alt={selectedSeatModal.userName || 'Speaker'}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-amber-400"
            />
            <div>
              <h3
                className={`font-display text-base font-bold ${getUserNameClass(
                  selectedSeatModal.userName,
                  undefined,
                  'text-white'
                )}`}
              >
                {selectedSeatModal.userName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedSeatModal.userUid ? `UID: ${selectedSeatModal.userUid} · ` : ''}
                Seat {selectedSeatModal.seatIndex === 0 ? 'Host' : selectedSeatModal.seatIndex} ·
                Lv.{selectedSeatModal.userLevel} · {selectedSeatModal.hearts} hearts
              </p>
              {currentUser.cpPartnerId === selectedSeatModal.userId && (
                <p className="text-[11px] font-semibold text-rose-300 mt-1">
                  💑 Your CP Partner · CP Lv.{currentUser.cpLevel || 1}
                </p>
              )}
            </div>

            <div className="space-y-2">
              {selectedSeatModal.userId === currentUser.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMic(!micOn);
                      setSelectedSeatModal(null);
                    }}
                    className="w-full h-11 rounded-xl bg-amber-500 text-[#0C0914] font-semibold text-xs"
                  >
                    {micOn ? 'Mute My Mic' : 'Turn On My Mic'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onLeaveSeat();
                      setSelectedSeatModal(null);
                    }}
                    className="w-full h-11 rounded-xl bg-white/10 text-white font-semibold text-xs"
                  >
                    Leave Seat
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = selectedSeatModal.userId;
                      setSelectedSeatModal(null);
                      if (targetId) onViewUserProfile(targetId);
                    }}
                    className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>View Profile &amp; ID</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSeatModal(null);
                      setShowGiftDrawer(true);
                    }}
                    className="w-full h-11 rounded-xl bg-amber-500 text-[#0C0914] font-semibold text-xs"
                  >
                    Send Gift to {selectedSeatModal.userName}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSeatModal.userId) {
                        onFollowUser(selectedSeatModal.userId);
                      }
                      setSelectedSeatModal(null);
                    }}
                    className="w-full h-11 rounded-xl bg-white/10 text-white font-semibold text-xs"
                  >
                    {currentUser.followingIds.includes(selectedSeatModal.userId)
                      ? 'Unfollow'
                      : 'Follow User'}
                  </button>

                  {/* Recharge Coins to Seated User */}
                  {isRechargeAllowedUser(currentUser) && (
                    <div className="pt-2 border-t border-white/10 space-y-2 text-left">
                      <div className="flex items-center justify-between text-[11px] text-emerald-300 font-semibold">
                        <span className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" />
                          <span>Recharge Coins</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {[
                            { label: '50K', val: '50000' },
                            { label: '500K', val: '500000' },
                            { label: '5M', val: '5000000' },
                          ].map((p) => (
                            <button
                              key={p.label}
                              type="button"
                              onClick={() => setSeatRechargeAmt(p.val)}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono-nums font-bold ${
                                seatRechargeAmt === p.val
                                  ? 'bg-emerald-500 text-[#091320]'
                                  : 'bg-white/10 text-slate-300'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="100"
                          step="100"
                          value={seatRechargeAmt}
                          onChange={(e) => setSeatRechargeAmt(e.target.value)}
                          className="flex-1 h-9 px-2.5 rounded-lg bg-[#0C0914] border border-white/15 font-mono-nums text-xs text-white focus:outline-none focus:border-emerald-400"
                        />
                        <button
                          type="button"
                          disabled={
                            seatRecharging ||
                            Number(seatRechargeAmt) < 100 ||
                            currentUser.coins < Number(seatRechargeAmt)
                          }
                          onClick={async () => {
                            if (!selectedSeatModal.userId) return;
                            setSeatRecharging(true);
                            try {
                              const ok = await onRechargeUser(
                                selectedSeatModal.userId,
                                Math.floor(Number(seatRechargeAmt))
                              );
                              if (ok) setSelectedSeatModal(null);
                            } finally {
                              setSeatRecharging(false);
                            }
                          }}
                          className="h-9 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#091320] font-semibold text-xs whitespace-nowrap disabled:opacity-40"
                        >
                          {seatRecharging ? '...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => setSelectedSeatModal(null)}
                className="w-full h-10 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <GiftDrawer
        open={showGiftDrawer}
        onClose={() => setShowGiftDrawer(false)}
        seats={room.seats}
        currentUser={currentUser}
        onSendGift={onSendGift}
      />
    </div>
  );
};
