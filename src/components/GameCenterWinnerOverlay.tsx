import React from 'react';
import { Trophy } from 'lucide-react';
import { GameWinEntry } from '../types';
import { resolveAsset } from '../lib/assets';
import { getUserNameClass } from '../lib/userStyle';

interface GameCenterWinnerOverlayProps {
  winners: GameWinEntry[];
  currentUserId: string;
  align?: 'center' | 'top';
}

export const GameCenterWinnerOverlay: React.FC<GameCenterWinnerOverlayProps> = ({
  winners,
  currentUserId,
  align = 'center',
}) => {
  if (!winners || winners.length === 0) return null;

  // Prioritize current user if they won, otherwise highest payout winner
  const sorted = [...winners].sort((a, b) => b.payout - a.payout);
  const featured = sorted.find((w) => w.userId === currentUserId) || sorted[0];
  const others = sorted.filter((w) => w.userId !== featured.userId).slice(0, 3);
  const isMe = featured.userId === currentUserId;

  return (
    <div
      className={`absolute inset-0 z-20 flex justify-center pointer-events-none px-3 ${
        align === 'top' ? 'items-start pt-3' : 'items-center'
      }`}
    >
      <div className="w-[min(92%,310px)] rounded-2xl bg-[#0C0914]/92 backdrop-blur-md border-2 border-emerald-400/75 shadow-[0_14px_40px_rgba(0,0,0,0.75)] p-3.5 text-center space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>{isMe ? 'You Won!' : 'Bet Winner'}</span>
          <span className="text-slate-400">·</span>
          <span className="text-emerald-300">{featured.targetLabel}</span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <img
            src={resolveAsset(featured.userAvatar)}
            alt={featured.userName}
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow-lg shrink-0"
          />
          <div className="text-left min-w-0">
            <div
              className={`text-sm font-bold truncate ${getUserNameClass(
                featured.userName,
                undefined,
                'text-white'
              )}`}
            >
              {featured.userName}
            </div>
            <div className="text-[11px] font-mono-nums text-slate-300">
              Bet: <span className="font-semibold text-amber-200">{featured.stake.toLocaleString()}</span>
            </div>
            <div className="text-sm font-mono-nums font-extrabold text-emerald-400">
              +{featured.payout.toLocaleString()} Coins
            </div>
          </div>
        </div>

        {others.length > 0 && (
          <div className="pt-1.5 border-t border-white/10 flex flex-wrap items-center justify-center gap-1.5">
            {others.map((w) => (
              <div
                key={w.userId}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px]"
              >
                <img
                  src={resolveAsset(w.userAvatar)}
                  alt={w.userName}
                  referrerPolicy="no-referrer"
                  className="w-3.5 h-3.5 rounded-full object-cover"
                />
                <span
                  className={`font-semibold max-w-[70px] truncate ${getUserNameClass(
                    w.userName,
                    undefined,
                    'text-white'
                  )}`}
                >
                  {w.userName}
                </span>
                <span className="font-mono-nums text-emerald-400 font-bold">
                  +{w.payout.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
