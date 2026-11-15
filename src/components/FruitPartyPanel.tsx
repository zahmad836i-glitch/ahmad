import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Coins, RotateCcw, Clock, Trophy, Sparkles } from 'lucide-react';
import { FRUIT_SLOTS, FruitGameState, FruitId, GameWinAnnouncement, UserProfile } from '../types';
import { soundEngine } from '../lib/audio';
import { GAME_BACKDROPS, resolveAsset } from '../lib/assets';
import { getUserNameClass } from '../lib/userStyle';
import { GameCenterWinnerOverlay } from './GameCenterWinnerOverlay';

interface FruitPartyPanelProps {
  gameState: FruitGameState;
  currentUser: UserProfile;
  recentWins?: GameWinAnnouncement[];
  onPlaceBet: (fruit: FruitId, amount: number) => void;
  onBack: () => void;
}

const CHIP_AMOUNTS = [
  { amount: 100, label: '100', color: 'from-emerald-400 to-emerald-600 border-emerald-200' },
  { amount: 500, label: '500', color: 'from-sky-400 to-sky-600 border-sky-200' },
  { amount: 2500, label: '2.5K', color: 'from-violet-400 to-violet-600 border-violet-200' },
  { amount: 10000, label: '10K', color: 'from-amber-400 to-amber-600 border-amber-100' },
  { amount: 50000, label: '50K', color: 'from-rose-400 to-rose-600 border-rose-200' },
];

// Clockwise order around a 3x3 perimeter (indices 0..7)
const PERIMETER_ORDER = [0, 1, 2, 4, 7, 6, 5, 3];

export const FruitPartyPanel: React.FC<FruitPartyPanelProps> = ({
  gameState,
  currentUser,
  recentWins = [],
  onPlaceBet,
  onBack,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(500);
  const [lastRoundBets, setLastRoundBets] = useState<Partial<Record<FruitId, number>>>({});
  const [chaseStep, setChaseStep] = useState<number>(0);
  const celebratedRoundRef = useRef<number | null>(null);

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

  // Spin highlight chase animation during SPINNING phase
  useEffect(() => {
    if (gameState.phase !== 'SPINNING') return;
    const timer = window.setInterval(() => {
      setChaseStep((prev) => (prev + 1) % FRUIT_SLOTS.length);
    }, 95);
    return () => window.clearInterval(timer);
  }, [gameState.phase]);

  const handleBetFruit = (fruitId: FruitId) => {
    if (gameState.phase !== 'BETTING' || currentUser.coins < selectedChip) return;
    onPlaceBet(fruitId, selectedChip);
    setLastRoundBets((prev) => ({
      ...prev,
      [fruitId]: (prev[fruitId] || 0) + selectedChip,
    }));
    soundEngine.playChime(600, 0.08);
  };

  const handleRepeat = () => {
    if (gameState.phase !== 'BETTING') return;
    for (const [fruitId, amt] of Object.entries(lastRoundBets)) {
      if (amt && amt > 0) {
        onPlaceBet(fruitId as FruitId, amt);
      }
    }
    soundEngine.playChime(700, 0.12);
  };

  const renderFruitTile = (slotIndex: number) => {
    const slot = FRUIT_SLOTS[slotIndex];
    const totalPot = gameState.fruitTotals[slot.id] || 0;
    const myStake = gameState.myBets[slot.id] || 0;
    const isChasing =
      gameState.phase === 'SPINNING' && PERIMETER_ORDER[chaseStep] === slotIndex;
    const isWinner =
      gameState.phase === 'RESULT' && gameState.winningFruit === slot.id;

    return (
      <button
        key={slot.id}
        type="button"
        onClick={() => handleBetFruit(slot.id)}
        disabled={gameState.phase !== 'BETTING' || currentUser.coins < selectedChip}
        style={{
          boxShadow: isWinner
            ? `0 0 26px ${slot.accent}88, inset 0 1px 0 rgba(255,255,255,0.35)`
            : isChasing
            ? '0 0 22px rgba(52,211,153,0.7), inset 0 1px 0 rgba(255,255,255,0.3)'
            : 'inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 14px rgba(0,0,0,0.45)',
        }}
        className={`relative p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between gap-1 min-h-[104px] transition-all overflow-hidden ${
          isWinner
            ? 'bg-gradient-to-b from-amber-400/35 to-amber-900/50 border-amber-300 scale-[1.04]'
            : isChasing
            ? 'bg-gradient-to-b from-emerald-400/30 to-emerald-950/60 border-emerald-300 scale-[1.02]'
            : myStake > 0
            ? 'bg-gradient-to-b from-[#2B174A] to-[#170C2B] border-emerald-400/70 hover:border-amber-300'
            : 'bg-gradient-to-b from-[#251340] to-[#140A24] border-amber-400/20 hover:border-amber-300/70'
        } disabled:opacity-85 active:scale-95`}
      >
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-12 rounded-full blur-xl opacity-35 pointer-events-none"
          style={{ backgroundColor: slot.accent }}
        />

        <div className="relative z-10 w-full flex items-center justify-between text-[11px] font-mono-nums">
          <span className="text-slate-300 font-semibold">
            {totalPot > 0 ? totalPot.toLocaleString() : ''}
          </span>
          <span
            className="px-1.5 py-0.5 rounded-md font-extrabold text-[#0C0914] shadow-sm"
            style={{ backgroundColor: slot.accent }}
          >
            ×{slot.multiplier}
          </span>
        </div>

        <span
          className={`relative z-10 text-4xl leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)] transition-transform ${
            isWinner || isChasing ? 'scale-110' : ''
          }`}
        >
          {slot.emoji}
        </span>

        <div className="relative z-10 w-full text-center">
          <div className="text-[11px] font-bold text-white truncate">{slot.name}</div>
          {myStake > 0 && (
            <div className="text-[10px] font-mono-nums font-bold text-emerald-300">
              Bet: {myStake.toLocaleString()}
            </div>
          )}
        </div>
      </button>
    );
  };

  const winningSlot = FRUIT_SLOTS.find((s) => s.id === gameState.winningFruit);

  return (
    <div className="rounded-3xl bg-[#130A22] border-2 border-amber-400/35 shadow-[0_18px_50px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#24113F] via-[#2F1650] to-[#1D0F34] border-b border-amber-400/20 flex items-center justify-between gap-2">
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
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-display font-bold text-sm text-white">Fruit Party</span>
            </div>
            <p className="text-[11px] font-mono-nums text-amber-200/75">
              Round #{gameState.roundId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-9 px-3 rounded-xl bg-[#0B0615] border border-amber-400/30 flex items-center gap-2">
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
                : `×${gameState.winningMultiplier}`}
            </span>
          </div>
        </div>
      </div>

      {/* 3x3 Arcade Fruit Board */}
      <div className="relative p-4 space-y-4">
        {/* Stylized Arcade Backdrop */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src={GAME_BACKDROPS.fruit}
            alt="Fruit Party arcade surface"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-20 blur-[1px] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#130A22]/80 via-[#130A22]/65 to-[#0B0615]/95" />
        </div>

        <div className="relative z-10 p-2.5 rounded-3xl bg-[#0B0615]/70 border-2 border-amber-400/35 shadow-[inset_0_0_24px_rgba(251,191,36,0.12)]">
          <div className="grid grid-cols-3 gap-2.5">
            {renderFruitTile(0)}
            {renderFruitTile(1)}
            {renderFruitTile(2)}

            {renderFruitTile(3)}

            {/* Center Round Hub */}
            <div className="rounded-2xl bg-gradient-to-b from-[#1E1036] to-[#0B0615] border-2 border-amber-400/50 p-2 flex flex-col items-center justify-center text-center min-h-[104px] shadow-[inset_0_0_20px_rgba(251,191,36,0.2)]">
              {gameState.phase === 'BETTING' && (
                <>
                  <span className="font-mono-nums text-3xl font-extrabold text-emerald-400 drop-shadow">
                    {String(gameState.secondsLeft).padStart(2, '0')}s
                  </span>
                  <span className="text-[11px] font-semibold text-amber-200 mt-0.5">
                    Pick Fruits
                  </span>
                </>
              )}
              {gameState.phase === 'SPINNING' && (
                <>
                  <span className="text-3xl leading-none animate-bounce">
                    {FRUIT_SLOTS[PERIMETER_ORDER[chaseStep]].emoji}
                  </span>
                  <span className="text-[11px] font-bold text-amber-300 mt-1">
                    Spinning...
                  </span>
                </>
              )}
              {gameState.phase === 'RESULT' && winningSlot && (
                <>
                  <span className="text-3xl leading-none">{winningSlot.emoji}</span>
                  <span className="text-xs font-bold text-amber-300 mt-1">
                    {winningSlot.name} ×{winningSlot.multiplier}
                  </span>
                </>
              )}
            </div>

            {renderFruitTile(4)}

            {renderFruitTile(5)}
            {renderFruitTile(6)}
            {renderFruitTile(7)}
          </div>

          {gameState.phase === 'RESULT' && gameState.winners && gameState.winners.length > 0 && (
            <GameCenterWinnerOverlay
              winners={gameState.winners}
              currentUserId={currentUser.id}
              align="center"
            />
          )}
        </div>

        {/* Round Result & Winners Banner */}
        {gameState.phase === 'RESULT' && winningSlot && (
          <div
            className={`relative z-10 rounded-2xl border p-3 space-y-2 ${
              myWin
                ? 'bg-emerald-500/15 border-emerald-400/50'
                : 'bg-[#1D1230]/90 border-amber-400/35'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>
                  Winner: {winningSlot.emoji} {winningSlot.name} (×{winningSlot.multiplier})
                </span>
              </div>
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
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0D0818] border border-white/10 text-xs"
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
              <p className="text-[11px] text-slate-400">No winning bets on this spin.</p>
            )}
          </div>
        )}

        {/* History Strip */}
        <div className="relative z-10 px-3 py-2 rounded-xl bg-[#0B0615]/85 border border-white/10 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] text-slate-400 shrink-0">Results:</span>
          {gameState.history.map((fid, idx) => {
            const slot = FRUIT_SLOTS.find((s) => s.id === fid);
            return (
              <span
                key={`${fid}-${idx}`}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0"
                title={`${slot?.name} ×${slot?.multiplier}`}
              >
                {slot?.emoji || '🍓'}
              </span>
            );
          })}
        </div>

        {/* Recent Bet Winners */}
        {(() => {
          const fruitWins = recentWins.filter((w) => w.game === 'fruit').slice(0, 6);
          if (fruitWins.length === 0) return null;
          return (
            <div className="relative z-10 px-3 py-2 rounded-xl bg-[#0B0615]/85 border border-emerald-400/20 flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1 shrink-0">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Winners:</span>
              </span>
              {fruitWins.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1D1230] border border-white/10 text-[11px] shrink-0"
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

        {/* Chip Selector & Repeat */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
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
