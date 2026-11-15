import React from 'react';
import { Crown, Trophy, Medal } from 'lucide-react';
import { GameRankEntry } from '../types';
import { resolveAsset } from '../lib/assets';
import { getUserNameClass } from '../lib/userStyle';

interface GameTopRankingProps {
  rankings: GameRankEntry[];
  currentUserId: string;
  onViewUserProfile?: (userId: string) => void;
  compact?: boolean;
}

const RANK_STYLE: Record<number, { ring: string; badge: string; bg: string }> = {
  1: {
    ring: 'border-amber-400',
    badge: 'bg-amber-400 text-[#0C0914]',
    bg: 'bg-gradient-to-b from-amber-500/20 to-[#120D1E] border-amber-400/50',
  },
  2: {
    ring: 'border-slate-300',
    badge: 'bg-slate-200 text-[#0C0914]',
    bg: 'bg-gradient-to-b from-slate-400/15 to-[#120D1E] border-slate-300/35',
  },
  3: {
    ring: 'border-orange-400',
    badge: 'bg-orange-400 text-[#0C0914]',
    bg: 'bg-gradient-to-b from-orange-500/15 to-[#120D1E] border-orange-400/35',
  },
};

export const GameTopRanking: React.FC<GameTopRankingProps> = ({
  rankings,
  currentUserId,
  onViewUserProfile,
  compact = false,
}) => {
  const myEntry = rankings.find((r) => r.userId === currentUserId);
  const topThree = rankings.slice(0, 3);
  const rest = rankings.slice(3, compact ? 6 : 10);

  return (
    <section className="rounded-2xl bg-[#161124] border border-amber-400/25 p-3.5 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="font-display text-sm sm:text-base font-bold text-white leading-tight">
              Games Top Ranking
            </h2>
            <p className="text-[11px] text-slate-400">
              Top bet winners across Fruit Party, Rocket &amp; Luxury Wheel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {myEntry && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-[11px] font-mono-nums font-bold text-emerald-300">
              Your Rank: #{myEntry.rank}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-[#0C0914] border border-white/10 text-[11px] font-mono-nums text-amber-300 font-semibold">
            Top {rankings.length || 10}
          </span>
        </div>
      </div>

      {rankings.length === 0 ? (
        <div className="px-4 py-3 rounded-xl bg-[#0C0914] border border-white/10 text-xs text-slate-400 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Win a bet in Fruit Party, Rocket, or Luxury Wheel to take #1 on Top Ranking!</span>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {topThree.map((entry) => {
              const style = RANK_STYLE[entry.rank] || RANK_STYLE[3];
              const isMe = entry.userId === currentUserId;
              return (
                <button
                  key={entry.userId}
                  type="button"
                  onClick={() => onViewUserProfile?.(entry.userId)}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors hover:border-amber-300 ${style.bg} ${
                    isMe ? 'ring-1 ring-emerald-400/60' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={resolveAsset(entry.userAvatar)}
                      alt={entry.userName}
                      referrerPolicy="no-referrer"
                      className={`w-11 h-11 rounded-full object-cover border-2 ${style.ring}`}
                    />
                    <span
                      className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full text-[10px] font-mono-nums font-extrabold flex items-center justify-center shadow ${style.badge}`}
                    >
                      {entry.rank}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold truncate ${getUserNameClass(
                          entry.userName,
                          undefined,
                          'text-white'
                        )}`}
                      >
                        {entry.userName}
                      </span>
                      {entry.rank === 1 && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                    <div className="text-[10px] font-mono-nums text-slate-400">
                      UID: {entry.userUid} · {entry.winCount} {entry.winCount === 1 ? 'win' : 'wins'}
                    </div>
                    <div className="text-xs font-mono-nums font-extrabold text-emerald-400 mt-0.5">
                      +{entry.totalWon.toLocaleString()} Coins
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ranks 4+ */}
          {rest.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-1">
              {rest.map((entry) => (
                <button
                  key={entry.userId}
                  type="button"
                  onClick={() => onViewUserProfile?.(entry.userId)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0C0914] border border-white/10 hover:border-amber-400/40 text-xs shrink-0 transition-colors"
                >
                  <span className="font-mono-nums font-bold text-slate-400 flex items-center gap-0.5">
                    <Medal className="w-3 h-3 text-slate-500" />#{entry.rank}
                  </span>
                  <img
                    src={resolveAsset(entry.userAvatar)}
                    alt={entry.userName}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span
                    className={`font-semibold max-w-[90px] truncate ${getUserNameClass(
                      entry.userName,
                      undefined,
                      'text-white'
                    )}`}
                  >
                    {entry.userName}
                  </span>
                  <span className="font-mono-nums font-bold text-emerald-400">
                    +{entry.totalWon.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};
