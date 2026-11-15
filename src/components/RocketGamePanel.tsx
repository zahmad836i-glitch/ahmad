import React, { useEffect, useState } from 'react';
import { ArrowLeft, Coins, HelpCircle, Volume2, VolumeX, Rocket, Trophy } from 'lucide-react';
import { GameWinAnnouncement, GameWinEntry, RocketGameState, UserProfile } from '../types';
import { soundEngine } from '../lib/audio';
import { GAME_BACKDROPS, resolveAsset } from '../lib/assets';
import { getUserNameClass } from '../lib/userStyle';
import { GameCenterWinnerOverlay } from './GameCenterWinnerOverlay';

interface RocketGamePanelProps {
  gameState: RocketGameState;
  currentUser: UserProfile;
  recentWins?: GameWinAnnouncement[];
  onPlaceBet: (amount: number, autoCashout: number | null) => void;
  onCashout: () => void;
  onBack: () => void;
}

const FUEL_PACKS = [
  { amount: 100, label: '100', color: 'from-sky-400 to-sky-600 border-sky-200/50' },
  { amount: 500, label: '500', color: 'from-violet-400 to-violet-600 border-violet-200/50' },
  { amount: 2500, label: '2.5K', color: 'from-rose-400 to-rose-600 border-rose-200/50' },
  { amount: 10000, label: '10K', color: 'from-fuchsia-500 to-purple-700 border-fuchsia-200/50' },
];

export const RocketGamePanel: React.FC<RocketGamePanelProps> = ({
  gameState,
  currentUser,
  recentWins = [],
  onPlaceBet,
  onCashout,
  onBack,
}) => {
  const [selectedFuel, setSelectedFuel] = useState<number>(500);
  const [autoSpend, setAutoSpend] = useState<boolean>(false);
  const [autoEscEnabled, setAutoEscEnabled] = useState<boolean>(true);
  const [autoEscTarget, setAutoEscTarget] = useState<string>('2.10');
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);

  const myBet = gameState.bets.find((b) => b.userId === currentUser.id);
  const hasActiveUnescapedBet = Boolean(myBet && !myBet.cashedOutAt);

  // Auto-spend when a new countdown starts
  useEffect(() => {
    if (
      autoSpend &&
      gameState.phase === 'COUNTDOWN' &&
      gameState.countdownSeconds === 8 &&
      !myBet &&
      currentUser.coins >= selectedFuel
    ) {
      const target = autoEscEnabled ? Math.max(1.1, parseFloat(autoEscTarget) || 2.1) : null;
      onPlaceBet(selectedFuel, target);
    }
  }, [
    autoSpend,
    gameState.phase,
    gameState.countdownSeconds,
    myBet,
    currentUser.coins,
    selectedFuel,
    autoEscEnabled,
    autoEscTarget,
    onPlaceBet,
  ]);

  useEffect(() => {
    if (muted) return;
    if (gameState.phase === 'CRASHED') {
      soundEngine.playCrash();
    }
  }, [gameState.phase, muted]);

  const handleFuelTap = (amount: number) => {
    setSelectedFuel(amount);
    if (gameState.phase === 'COUNTDOWN') {
      const target = autoEscEnabled ? Math.max(1.1, parseFloat(autoEscTarget) || 2.1) : null;
      onPlaceBet(amount, target);
      if (!muted) soundEngine.playChime(660, 0.1);
    }
  };

  const handleCashoutClick = () => {
    onCashout();
    if (!muted) soundEngine.playCashout();
  };

  // Compute normalized flight progress (0..1)
  const progress =
    gameState.phase === 'COUNTDOWN'
      ? 0
      : Math.min(1, Math.log(Math.max(1, gameState.multiplier)) / Math.log(12));

  // Rocket arc coordinates in SVG viewBox 0..320 x 0..180
  const rocketX = 52 + progress * 200;
  const rocketY = 148 - Math.pow(progress, 0.85) * 116;

  return (
    <div className="rounded-3xl bg-[#091423] border-2 border-sky-400/30 shadow-[0_18px_50px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col">
      {/* Top Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#0E1E33] via-[#132946] to-[#0E1E33] border-b border-sky-400/20 flex items-center justify-between gap-2">
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
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-sky-400" />
              <span className="font-display font-bold text-sm tracking-wide text-white">
                ROCKET
              </span>
              <span className="text-[11px] font-mono-nums text-sky-200/75">
                Round #{gameState.roundId}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-9 px-3 rounded-xl bg-[#060E18] border border-sky-400/25 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono-nums text-xs font-bold text-amber-300">
              {currentUser.coins.toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-slate-300"
            aria-label="Toggle game audio"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setShowHelp((h) => !h)}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-slate-300"
            aria-label="Rocket game rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="px-4 py-2.5 bg-sky-950/70 border-b border-sky-400/20 text-xs text-sky-100">
          Tap a fuel canister during the 9s countdown to board the Rocket. Cash out manually or set Auto Esc before the rocket crashes to multiply your Coins!
        </div>
      )}

      {/* Main Cosmic Flight Arena */}
      <div className="relative h-76 sm:h-84 bg-[#07111E] overflow-hidden grid grid-cols-12">
        {/* Generated Space Nebula + Moon Backdrop */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={GAME_BACKDROPS.rocket}
            alt="Rocket space cosmos"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07111E]/85 via-[#07111E]/35 to-[#07111E]/75" />
        </div>

        {/* Left Live Bets Feed */}
        <div className="col-span-5 sm:col-span-4 p-3 z-10 flex flex-col gap-1.5 overflow-y-auto bg-gradient-to-r from-[#060E18]/90 via-[#060E18]/75 to-transparent">
          <div className="text-[11px] font-semibold text-sky-200/80 pb-1">
            Live Fuel ({gameState.bets.length})
          </div>
          {gameState.bets.length === 0 ? (
            <p className="text-xs text-slate-400">Tap a fuel canister below to join round</p>
          ) : (
            gameState.bets.slice(0, 7).map((bet) => (
              <div
                key={bet.userId}
                className="flex items-center justify-between gap-2 text-xs py-1 border-b border-white/10"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {bet.userAvatar && (
                    <img
                      src={resolveAsset(bet.userAvatar)}
                      alt={bet.userName}
                      referrerPolicy="no-referrer"
                      className="w-4 h-4 rounded-full object-cover shrink-0"
                    />
                  )}
                  <span
                    className={`truncate font-medium ${getUserNameClass(
                      bet.userName,
                      undefined,
                      'text-slate-100'
                    )}`}
                  >
                    {bet.userName}
                  </span>
                </div>
                {bet.cashedOutAt ? (
                  <span className="font-mono-nums text-emerald-400 font-bold shrink-0">
                    +{bet.payout.toLocaleString()} ({bet.cashedOutAt.toFixed(2)}x)
                  </span>
                ) : (
                  <span className="font-mono-nums text-amber-300 shrink-0">
                    {bet.amount.toLocaleString()}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Center/Right Flight Stage */}
        <div className="col-span-7 sm:col-span-8 relative flex flex-col items-center justify-end pb-5">
          {/* Multiplier Axis */}
          <div className="absolute right-3 top-4 bottom-8 flex flex-col justify-between text-[11px] font-mono-nums text-sky-200/75 pointer-events-none">
            <span>5.0x</span>
            <span>3.0x</span>
            <span>2.0x</span>
            <span>1.5x</span>
            <span>1.0x</span>
          </div>

          {/* SVG Curved Flight Trajectory + Starship */}
          <svg
            viewBox="0 0 320 180"
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="rocketTrailGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.15" />
                <stop offset="100%" stopColor={gameState.phase === 'CRASHED' ? '#F43F5E' : '#FBBF24'} stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="rocketAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={gameState.phase === 'CRASHED' ? '#F43F5E' : '#38BDF8'} stopOpacity="0.32" />
                <stop offset="100%" stopColor="#07111E" stopOpacity="0" />
              </linearGradient>
            </defs>

            {gameState.phase !== 'COUNTDOWN' && (
              <>
                <path
                  d={`M 45 154 Q ${(45 + rocketX) / 2} 152 ${rocketX} ${rocketY} L ${rocketX} 165 L 45 165 Z`}
                  fill="url(#rocketAreaGrad)"
                />
                <path
                  d={`M 45 154 Q ${(45 + rocketX) / 2} 152 ${rocketX} ${rocketY}`}
                  fill="none"
                  stroke="url(#rocketTrailGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </>
            )}
          </svg>

          {/* Animated Custom Starship Rocket */}
          <div
            className="absolute z-10 flex flex-col items-center transition-all duration-100 ease-linear pointer-events-none"
            style={{
              left: `${(rocketX / 320) * 100}%`,
              top: `${(rocketY / 180) * 100}%`,
              transform: 'translate(-50%, -65%)',
            }}
          >
            {gameState.phase === 'FLYING' && myBet && !myBet.cashedOutAt && (
              <div className="mb-1 px-2 py-0.5 rounded-md bg-sky-500/95 text-[11px] font-mono-nums font-bold text-white shadow">
                {myBet.amount.toLocaleString()}
              </div>
            )}

            <div
              className={`relative flex items-center justify-center transition-transform ${
                gameState.phase === 'CRASHED' ? 'scale-110' : 'rotate-[22deg]'
              }`}
            >
              <svg width="46" height="46" viewBox="0 0 48 48" className="drop-shadow-[0_4px_14px_rgba(56,189,248,0.6)]">
                {/* Rocket fins */}
                <path d="M16 28 L9 37 L18 34 Z" fill={gameState.phase === 'CRASHED' ? '#F43F5E' : '#F59E0B'} />
                <path d="M32 28 L39 37 L30 34 Z" fill={gameState.phase === 'CRASHED' ? '#F43F5E' : '#F59E0B'} />
                {/* Body */}
                <path
                  d="M24 5 C17 13 16 24 18 34 L30 34 C32 24 31 13 24 5 Z"
                  fill={gameState.phase === 'CRASHED' ? '#FDA4AF' : '#F8FAFC'}
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                />
                {/* Nose cone */}
                <path d="M24 5 C20 10 19 13 19 15 L29 15 C29 13 28 10 24 5 Z" fill="#F43F5E" />
                {/* Window */}
                <circle cx="24" cy="22" r="4" fill="#0EA5E9" stroke="#BAE6FD" strokeWidth="1.5" />
                {/* Exhaust flame */}
                {gameState.phase === 'FLYING' && (
                  <path d="M20 34 L24 45 L28 34 Z" fill="#FBBF24" />
                )}
              </svg>
            </div>
          </div>

          {/* Center Phase Readout */}
          <div className="relative z-20 text-center mt-2 px-4 py-1.5 rounded-2xl bg-[#060E18]/75 backdrop-blur-sm border border-white/10">
            {gameState.phase === 'COUNTDOWN' && (
              <div>
                <div className="font-mono-nums text-3xl font-extrabold text-amber-400 tracking-wider">
                  {String(gameState.countdownSeconds).padStart(2, '0')}s
                </div>
                <div className="text-xs font-semibold text-amber-200/90 tracking-wide">
                  Launch Countdown
                </div>
              </div>
            )}
            {gameState.phase === 'FLYING' && (
              <div>
                <div className="font-mono-nums text-3xl sm:text-4xl font-extrabold text-emerald-300 drop-shadow">
                  {gameState.multiplier.toFixed(2)}x
                </div>
                <div className="text-[11px] text-sky-200/90">Ascending</div>
              </div>
            )}
            {gameState.phase === 'CRASHED' && (
              <div>
                <div className="font-mono-nums text-3xl font-extrabold text-rose-400">
                  {gameState.multiplier.toFixed(2)}x
                </div>
                <div className="text-xs font-semibold text-rose-300">
                  Crashed · Next round in {gameState.countdownSeconds}s
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Winner Overlay inside Rocket Arena */}
        {(() => {
          const rocketWinners: GameWinEntry[] = gameState.bets
            .filter((b) => Boolean(b.cashedOutAt))
            .map((b) => ({
              userId: b.userId,
              userUid: b.userUid,
              userName: b.userName,
              userAvatar: b.userAvatar,
              stake: b.amount,
              payout: b.payout,
              multiplier: b.cashedOutAt || 1,
              targetLabel: `${(b.cashedOutAt || 1).toFixed(2)}x`,
            }));
          if (rocketWinners.length === 0) return null;
          const keepMultiplierClear =
            gameState.phase === 'FLYING' && Boolean(myBet && !myBet.cashedOutAt);
          return (
            <GameCenterWinnerOverlay
              winners={rocketWinners}
              currentUserId={currentUser.id}
              align={keepMultiplierClear ? 'top' : 'center'}
            />
          );
        })()}
      </div>

      {/* History Strip */}
      <div className="px-4 py-2 bg-[#081220] border-y border-white/10 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs text-slate-400 shrink-0">his:</span>
        {gameState.history.map((val, idx) => (
          <span
            key={`${val}-${idx}`}
            className={`font-mono-nums text-xs font-bold px-2 py-0.5 rounded-lg border shrink-0 ${
              val >= 10
                ? 'border-amber-400/60 text-amber-300 bg-amber-500/10'
                : val >= 2
                ? 'border-violet-400/50 text-violet-300 bg-violet-500/10'
                : 'border-sky-400/40 text-sky-300 bg-sky-500/10'
            }`}
          >
            {val.toFixed(2)}
          </span>
        ))}
      </div>

      {/* Round / Recent Winners Strip */}
      {(() => {
        const roundWinners = gameState.bets.filter((b) => Boolean(b.cashedOutAt));
        const rocketHistoryWins = recentWins.filter((w) => w.game === 'rocket').slice(0, 6);
        if (!myBet?.cashedOutAt && roundWinners.length === 0 && rocketHistoryWins.length === 0) {
          return null;
        }
        return (
          <div className="px-4 py-2 bg-[#07101C] border-b border-white/10 space-y-1.5">
            {myBet?.cashedOutAt && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-emerald-200">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>YOU WON +{myBet.payout.toLocaleString()} Coins!</span>
                </span>
                <span className="font-mono-nums text-emerald-300 font-semibold">
                  Escaped at {myBet.cashedOutAt.toFixed(2)}x
                </span>
              </div>
            )}

            {rocketHistoryWins.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1 shrink-0">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Winners:</span>
                </span>
                {rocketHistoryWins.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#102136] border border-white/10 text-[11px] shrink-0"
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
                    <span className="text-slate-400 font-mono-nums">{w.targetLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Fuel Canisters & Escape Controls */}
      <div className="p-4 bg-[#0E1E33] space-y-3">
        <div className="flex items-center justify-between gap-2 bg-[#07111E] px-3 py-2 rounded-xl border border-white/10">
          <span className="text-xs text-slate-300">
            {myBet
              ? myBet.cashedOutAt
                ? `Escaped at ${myBet.cashedOutAt.toFixed(2)}x · Won ${myBet.payout.toLocaleString()} Coins`
                : `Active Fuel: ${myBet.amount.toLocaleString()} Coins`
              : `Selected Fuel: ${selectedFuel.toLocaleString()} Coins`}
          </span>

          {gameState.phase === 'FLYING' && hasActiveUnescapedBet ? (
            <button
              type="button"
              onClick={handleCashoutClick}
              className="min-h-[44px] px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#091320] font-bold text-xs whitespace-nowrap transition-colors shadow-lg"
            >
              Escape ({Math.floor((myBet?.amount || 0) * gameState.multiplier).toLocaleString()})
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleFuelTap(selectedFuel)}
              disabled={gameState.phase !== 'COUNTDOWN' || currentUser.coins < selectedFuel}
              className="min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#091320] font-bold text-xs whitespace-nowrap transition-colors disabled:opacity-40 shadow-md"
            >
              {gameState.phase === 'COUNTDOWN' ? 'Add Fuel' : 'In Flight'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2">
          {FUEL_PACKS.map((pack) => (
            <button
              key={pack.amount}
              type="button"
              onClick={() => handleFuelTap(pack.amount)}
              disabled={currentUser.coins < pack.amount}
              className={`min-h-[48px] rounded-xl border bg-gradient-to-b font-mono-nums font-bold text-xs text-white flex flex-col items-center justify-center transition-transform active:scale-95 disabled:opacity-40 shadow-md ${
                pack.color
              } ${selectedFuel === pack.amount ? 'ring-2 ring-amber-300' : ''}`}
            >
              <span>{pack.label}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setAutoSpend((a) => !a)}
            className={`min-h-[48px] rounded-xl font-bold text-[11px] leading-tight px-2 transition-colors ${
              autoSpend
                ? 'bg-amber-400 text-[#091320]'
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
            }`}
          >
            AUTO
            <br />
            SPEND
          </button>
        </div>

        {/* Auto Esc Row */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setAutoEscEnabled((e) => !e)}
            className="min-h-[40px] flex items-center gap-2 text-xs text-slate-300"
          >
            <span>auto esc</span>
            <span
              className={`w-10 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                autoEscEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow" />
            </span>
          </button>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.1"
              min="1.1"
              max="50"
              value={autoEscTarget}
              onChange={(e) => setAutoEscTarget(e.target.value)}
              className="w-20 h-9 px-2.5 rounded-xl bg-[#07111E] border border-white/15 font-mono-nums text-xs text-white text-right focus:outline-none focus:border-amber-400"
            />
            <span className="text-xs font-mono-nums text-slate-400">x</span>
          </div>
        </div>
      </div>
    </div>
  );
};
