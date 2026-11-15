import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Coins, RotateCcw, Clock, Trophy, Disc } from 'lucide-react';
import { GameWinAnnouncement, WHEEL_SLOTS, WheelEmblem, WheelGameState, UserProfile } from '../types';
import { soundEngine } from '../lib/audio';
import { GAME_BACKDROPS, resolveAsset } from '../lib/assets';
import { getUserNameClass } from '../lib/userStyle';
import { GameCenterWinnerOverlay } from './GameCenterWinnerOverlay';

interface LuckyWheelPanelProps {
  gameState: WheelGameState;
  currentUser: UserProfile;
  recentWins?: GameWinAnnouncement[];
  onPlaceBet: (emblem: WheelEmblem, amount: number) => void;
  onBack: () => void;
}

const CHIP_AMOUNTS = [
  { amount: 100, label: '100', color: 'from-emerald-400 to-emerald-600 border-emerald-200' },
  { amount: 500, label: '500', color: 'from-sky-400 to-sky-600 border-sky-200' },
  { amount: 2500, label: '2.5K', color: 'from-violet-400 to-violet-600 border-violet-200' },
  { amount: 10000, label: '10K', color: 'from-amber-400 to-amber-600 border-amber-100' },
  { amount: 50000, label: '50K', color: 'from-rose-400 to-rose-600 border-rose-200' },
];

const MAX_WHEEL_BETS = 4;

export const LuckyWheelPanel: React.FC<LuckyWheelPanelProps> = ({
  gameState,
  currentUser,
  recentWins = [],
  onPlaceBet,
  onBack,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(500);
  const [lastRoundBets, setLastRoundBets] = useState<Partial<Record<WheelEmblem, number>>>({});
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const celebratedRoundRef = useRef<number | null>(null);
  const spunRoundRef = useRef<number | null>(null);

  const myWin =
    gameState.phase === 'RESULT'
      ? gameState.winners?.find((w) => w.userId === currentUser.id)
      : undefined;

  useEffect(() => {
    if (
      gameState.phase === 'RESULT' &&
      myWin &&
      celebratedRoundRef.current !== gameState.roundId
    ) {
      celebratedRoundRef.current = gameState.roundId;
      soundEngine.playCashout();
    }
  }, [gameState.phase, gameState.roundId, myWin]);

  // Spin SVG prize wheel smoothly toward winning slice
  useEffect(() => {
    if (
      (gameState.phase === 'SPINNING' || gameState.phase === 'RESULT') &&
      gameState.winningEmblem &&
      spunRoundRef.current !== gameState.roundId
    ) {
      spunRoundRef.current = gameState.roundId;
      const idx = WHEEL_SLOTS.findIndex((s) => s.emblem === gameState.winningEmblem);
      const sliceDeg = 360 / WHEEL_SLOTS.length; // 36deg
      const targetCenter = idx >= 0 ? idx * sliceDeg + sliceDeg / 2 : 0;
      setWheelRotation((prev) => {
        const base = Math.ceil(prev / 360) * 360;
        return base + 360 * 4 + (360 - targetCenter);
      });
    }
  }, [gameState.phase, gameState.winningEmblem, gameState.roundId]);

  const activeEmblems = Object.entries(gameState.myBets)
    .filter(([, amt]) => (amt || 0) > 0)
    .map(([k]) => k as WheelEmblem);
  const activeBetCount = activeEmblems.length;
  const maxReached = activeBetCount >= MAX_WHEEL_BETS;

  const handleBetSlot = (emblem: WheelEmblem) => {
    const existingStake = gameState.myBets[emblem] || 0;
    if (gameState.phase !== 'BETTING' || currentUser.coins < selectedChip) return;
    if (existingStake === 0 && maxReached) return;
    onPlaceBet(emblem, selectedChip);
    setLastRoundBets((prev) => {
      const next = { ...prev, [emblem]: (prev[emblem] || 0) + selectedChip };
      const keys = Object.keys(next) as WheelEmblem[];
      if (keys.length > MAX_WHEEL_BETS) {
        const trimmed: Partial<Record<WheelEmblem, number>> = {};
        for (const k of keys.slice(-MAX_WHEEL_BETS)) {
          trimmed[k] = next[k];
        }
        return trimmed;
      }
      return next;
    });
    soundEngine.playChime(540, 0.08);
  };

  const handleRepeat = () => {
    if (gameState.phase !== 'BETTING') return;
    const currentKeys = new Set<WheelEmblem>(activeEmblems);
    let placedAny = false;
    for (const [emblem, amt] of Object.entries(lastRoundBets)) {
      const key = emblem as WheelEmblem;
      if (!amt || amt <= 0) continue;
      if (!currentKeys.has(key) && currentKeys.size >= MAX_WHEEL_BETS) continue;
      currentKeys.add(key);
      onPlaceBet(key, amt);
      placedAny = true;
    }
    if (placedAny) {
      soundEngine.playChime(660, 0.12);
    }
  };

  const winningSlot = WHEEL_SLOTS.find((s) => s.emblem === gameState.winningEmblem);

  return (
    <div className="rounded-3xl bg-[#150B24] border-2 border-amber-400/35 shadow-[0_18px_50px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#24123D] via-[#34184E] to-[#1D0F32] border-b border-amber-400/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center"
            aria-label="Back to room stage"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <Disc className="w-4 h-4 text-amber-400" />
              <span className="font-display font-bold text-sm text-white">Luxury Wheel</span>
            </div>
            <p className="text-[11px] font-mono-nums text-amber-200/75">NO.{gameState.roundId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`h-9 px-2.5 rounded-xl font-mono-nums text-xs font-bold flex items-center border ${
              maxReached
                ? 'bg-rose-500/20 text-rose-200 border-rose-400/50'
                : 'bg-[#0F071B] text-amber-200 border-amber-400/30'
            }`}
            title="Maximum 4 bets per round"
          >
            Bets: {activeBetCount}/{MAX_WHEEL_BETS}
          </div>

          <div className="h-9 px-3 rounded-xl bg-[#0F071B] border border-amber-400/30 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono-nums text-xs font-bold text-amber-300">
              {currentUser.coins.toLocaleString()}
            </span>
          </div>

          <div
            className={`h-9 px-3 rounded-xl font-mono-nums text-xs font-bold flex items-center gap-1.5 ${
              gameState.phase === 'BETTING'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {gameState.phase === 'BETTING'
                ? `${gameState.secondsLeft}s`
                : gameState.phase === 'SPINNING'
                ? 'Spinning'
                : `Won ${gameState.winningMultiplier}x`}
            </span>
          </div>
        </div>
      </div>

      {/* Arena Backdrop + Spinning Wheel + Board */}
      <div className="relative p-4 space-y-4">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src={GAME_BACKDROPS.wheel}
            alt="Luxury Wheel motorsport arena"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#150B24]/75 via-[#150B24]/70 to-[#0C0914]/95" />
        </div>

        {/* Spinning Luxury SVG Prize Wheel */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 py-2 px-3 rounded-2xl bg-[#0B0615]/75 border border-amber-400/30">
          <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
            {/* Top Golden Pointer */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[9px] border-r-[9px] border-t-[16px] border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_2px_6px_rgba(251,191,36,0.9)]" />

            <svg
              viewBox="0 0 200 200"
              className="w-full h-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)]"
              style={{
                transform: `rotate(${wheelRotation}deg)`,
                transition: 'transform 2600ms cubic-bezier(0.16, 1, 0.25, 1)',
              }}
            >
              {/* Outer metallic bezel */}
              <circle cx="100" cy="100" r="97" fill="#1C102E" stroke="#FBBF24" strokeWidth="4" />
              {WHEEL_SLOTS.map((slot, i) => {
                const sliceAngle = 36;
                const startDeg = i * sliceAngle - 90;
                const endDeg = startDeg + sliceAngle;
                const startRad = (startDeg * Math.PI) / 180;
                const endRad = (endDeg * Math.PI) / 180;
                const r = 91;
                const x1 = 100 + r * Math.cos(startRad);
                const y1 = 100 + r * Math.sin(startRad);
                const x2 = 100 + r * Math.cos(endRad);
                const y2 = 100 + r * Math.sin(endRad);
                const midDeg = startDeg + sliceAngle / 2;
                const midRad = (midDeg * Math.PI) / 180;
                const lx = 100 + 62 * Math.cos(midRad);
                const ly = 100 + 62 * Math.sin(midRad);

                return (
                  <g key={slot.emblem}>
                    <path
                      d={`M100,100 L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
                      fill={i % 2 === 0 ? '#271344' : '#1B0D31'}
                      stroke="#FBBF24"
                      strokeOpacity="0.35"
                      strokeWidth="1"
                    />
                    <circle cx={lx} cy={ly} r="13" fill={slot.color} />
                    <text
                      x={lx}
                      y={ly + 3.5}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="800"
                      fill="#0C0914"
                      fontFamily="monospace"
                    >
                      {slot.shortLabel}
                    </text>
                  </g>
                );
              })}
              {/* Inner gold hub */}
              <circle cx="100" cy="100" r="24" fill="#0C0914" stroke="#FBBF24" strokeWidth="3" />
            </svg>

            {/* Center hub readout */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-center">
                {gameState.phase === 'BETTING' ? (
                  <span className="font-mono-nums text-xs font-extrabold text-emerald-400">
                    {gameState.secondsLeft}s
                  </span>
                ) : gameState.phase === 'SPINNING' ? (
                  <span className="text-[10px] font-bold text-amber-300">SPIN</span>
                ) : (
                  <span className="font-mono-nums text-xs font-extrabold text-amber-300">
                    {gameState.winningMultiplier}x
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              {gameState.phase === 'BETTING'
                ? 'Place Your Luxury Car Bets'
                : gameState.phase === 'SPINNING'
                ? 'Wheel Spinning...'
                : winningSlot
                ? `Landed on ${winningSlot.label} (X${winningSlot.multiplier})`
                : 'Round Settled'}
            </div>
            <p className="text-xs text-slate-300">
              Tap up to 4 luxury cars per round. High-tier supercars pay up to X200 Coins!
            </p>
            {maxReached && (
              <p className="text-xs text-amber-300 font-semibold">
                4/4 slots selected — tap active cars to stack more chips
              </p>
            )}
          </div>
        </div>

        {gameState.phase === 'RESULT' && gameState.winningEmblem && (
          <div
            className={`relative z-10 px-4 py-3 rounded-xl border space-y-2 ${
              myWin
                ? 'bg-emerald-500/15 border-emerald-400/50'
                : 'bg-amber-500/20 border-amber-400/50'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-amber-200">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>
                  Winning Emblem: {winningSlot?.label} ·{' '}
                  <span className="font-mono-nums text-amber-300">
                    X{gameState.winningMultiplier}
                  </span>
                </span>
              </span>
              {myWin && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-[#091320] font-mono-nums text-xs font-extrabold">
                  YOU WON +{myWin.payout.toLocaleString()} Coins!
                </span>
              )}
            </div>

            {gameState.winners && gameState.winners.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {gameState.winners.map((w) => (
                  <div
                    key={w.userId}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#120820] border border-white/10 text-xs"
                  >
                    <img
                      src={resolveAsset(w.userAvatar)}
                      alt={w.userName}
                      referrerPolicy="no-referrer"
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span
                      className={`font-semibold ${getUserNameClass(
                        w.userName,
                        undefined,
                        'text-white'
                      )}`}
                    >
                      {w.userName}
                    </span>
                    <span className="font-mono-nums font-bold text-emerald-400">
                      +{w.payout.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-300">No winning bets on this spin.</p>
            )}
          </div>
        )}

        <div className="relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {WHEEL_SLOTS.map((slot) => {
              const totalPot = gameState.emblemTotals[slot.emblem] || 0;
              const myStake = gameState.myBets[slot.emblem] || 0;
              const isWinner =
                gameState.phase === 'RESULT' && gameState.winningEmblem === slot.emblem;
              const isLockedByLimit = myStake === 0 && maxReached;

              return (
                <button
                  key={slot.emblem}
                  type="button"
                  onClick={() => handleBetSlot(slot.emblem)}
                  disabled={
                    gameState.phase !== 'BETTING' ||
                    currentUser.coins < selectedChip ||
                    isLockedByLimit
                  }
                  style={{
                    boxShadow: isWinner
                      ? `0 0 24px ${slot.color}88, inset 0 1px 0 rgba(255,255,255,0.35)`
                      : 'inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 14px rgba(0,0,0,0.45)',
                  }}
                  className={`relative p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 min-h-[96px] overflow-hidden ${
                    isWinner
                      ? 'bg-gradient-to-b from-amber-400/35 to-amber-900/50 border-amber-300 scale-[1.03]'
                      : myStake > 0
                      ? 'bg-gradient-to-b from-[#3A1E61] to-[#210F3A] border-emerald-400/75'
                      : 'bg-gradient-to-b from-[#2A1545] to-[#170B2A] border-amber-400/20 hover:border-amber-300/70'
                  } disabled:opacity-50 active:scale-95`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-mono-nums font-extrabold text-[#0C0914] shadow-md border border-white/40"
                      style={{ backgroundColor: slot.color }}
                    >
                      {slot.shortLabel}
                    </span>
                    <span className="font-mono-nums text-sm font-extrabold text-amber-300">
                      X{slot.multiplier}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white truncate">{slot.label}</div>
                    <div className="flex items-center justify-between text-[11px] font-mono-nums mt-0.5">
                      <span className="text-slate-300">{totalPot.toLocaleString()}</span>
                      {myStake > 0 && (
                        <span className="text-emerald-300 font-bold">
                          Bet: {myStake.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {gameState.phase === 'RESULT' && gameState.winners && gameState.winners.length > 0 && (
            <GameCenterWinnerOverlay
              winners={gameState.winners}
              currentUserId={currentUser.id}
              align="center"
            />
          )}
        </div>

        {/* History Bar */}
        <div className="relative z-10 px-3 py-2 rounded-xl bg-[#0B0615]/85 border border-white/10 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] text-slate-400 shrink-0">Recent:</span>
          {gameState.history.map((emb, idx) => {
            const slot = WHEEL_SLOTS.find((s) => s.emblem === emb);
            return (
              <span
                key={`${emb}-${idx}`}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono-nums font-bold text-[#0C0914] shrink-0"
                style={{ backgroundColor: slot?.color || '#94A3B8' }}
                title={slot?.label}
              >
                {slot?.shortLabel || emb}
              </span>
            );
          })}
        </div>

        {/* Recent Bet Winners */}
        {(() => {
          const wheelWins = recentWins.filter((w) => w.game === 'wheel').slice(0, 6);
          if (wheelWins.length === 0) return null;
          return (
            <div className="relative z-10 px-3 py-2 rounded-xl bg-[#0B0615]/85 border border-emerald-400/20 flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1 shrink-0">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Winners:</span>
              </span>
              {wheelWins.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#24123D] border border-white/10 text-[11px] shrink-0"
                >
                  <span
                    className={`font-semibold ${getUserNameClass(
                      w.userName,
                      undefined,
                      'text-white'
                    )}`}
                  >
                    {w.userName}
                  </span>
                  <span className="font-mono-nums font-bold text-emerald-400">
                    +{w.payout.toLocaleString()}
                  </span>
                  <span className="text-slate-400">{w.targetLabel}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Chips & Repeat */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {CHIP_AMOUNTS.map((chip) => (
              <button
                key={chip.amount}
                type="button"
                onClick={() => setSelectedChip(chip.amount)}
                className={`relative w-12 h-12 rounded-full bg-gradient-to-b ${chip.color} border-2 font-mono-nums text-xs font-extrabold text-[#0C0914] flex items-center justify-center shrink-0 transition-transform shadow-lg ${
                  selectedChip === chip.amount ? 'scale-110 ring-2 ring-amber-300' : 'opacity-85 hover:opacity-100'
                }`}
              >
                <span className="absolute inset-1 rounded-full border border-dashed border-[#0C0914]/40 pointer-events-none" />
                <span className="relative">{chip.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRepeat}
            disabled={gameState.phase !== 'BETTING' || Object.keys(lastRoundBets).length === 0}
            className="min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-[#0C0914] flex items-center gap-1.5 disabled:opacity-40 shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>REPEAT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
