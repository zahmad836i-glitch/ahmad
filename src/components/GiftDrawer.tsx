import React, { useState } from 'react';
import { X, Gem, Coins, Send, Sparkles } from 'lucide-react';
import { GIFT_CATALOG, GiftItem, RoomSeat, UserProfile } from '../types';
import { resolveAsset } from '../lib/assets';
import { getUserNameClass } from '../lib/userStyle';

interface GiftDrawerProps {
  open: boolean;
  onClose: () => void;
  seats: RoomSeat[];
  currentUser: UserProfile;
  onSendGift: (gift: GiftItem, targetSeatIndex: number, quantity: number) => void;
}

export const GiftDrawer: React.FC<GiftDrawerProps> = ({
  open,
  onClose,
  seats,
  currentUser,
  onSendGift,
}) => {
  const occupiedSeats = seats.filter((s) => s.userId !== null);
  const [selectedGiftId, setSelectedGiftId] = useState<string>(GIFT_CATALOG[0].id);
  const [giftFilter, setGiftFilter] = useState<'all' | 'lucky' | 'luxury'>('all');
  const [targetSeatIndex, setTargetSeatIndex] = useState<number>(
    occupiedSeats[0]?.seatIndex ?? 0
  );
  const [quantity, setQuantity] = useState<number>(1);

  if (!open) return null;

  const visibleGifts = GIFT_CATALOG.filter((g) => {
    if (giftFilter === 'lucky') return g.tier === 'lucky';
    if (giftFilter === 'luxury') return g.tier !== 'lucky';
    return true;
  });

  const selectedGift = GIFT_CATALOG.find((g) => g.id === selectedGiftId) || GIFT_CATALOG[0];
  const totalCost = selectedGift.price * quantity;
  const canAfford =
    selectedGift.currency === 'coins'
      ? currentUser.coins >= totalCost
      : currentUser.diamonds >= totalCost;

  const handleSend = () => {
    if (!canAfford) return;
    onSendGift(selectedGift, targetSeatIndex, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div className="w-full max-w-lg rounded-t-3xl lg:rounded-3xl bg-[#161124] border border-white/15 p-5 sm:p-6 space-y-5 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Send Stage Gift</h2>
            <p className="text-xs text-slate-400">
              Send Lucky Gifts for up to ×200 Coin rebates &amp; boost CP hearts
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"
            aria-label="Close gift drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recipient Selector */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Recipient on Stage</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {occupiedSeats.map((seat) => {
              const active = targetSeatIndex === seat.seatIndex;
              const isCp = Boolean(currentUser.cpPartnerId && seat.userId === currentUser.cpPartnerId);
              return (
                <button
                  key={seat.seatIndex}
                  type="button"
                  onClick={() => setTargetSeatIndex(seat.seatIndex)}
                  className={`min-h-[44px] px-3 py-1.5 rounded-xl border flex items-center gap-2 shrink-0 transition-colors ${
                    active
                      ? 'bg-amber-500/20 border-amber-400 text-white'
                      : 'bg-[#0C0914] border-white/10 text-slate-300'
                  }`}
                >
                  <img
                    src={resolveAsset(seat.userAvatar)}
                    alt={seat.userName || 'Host'}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-xs font-medium whitespace-nowrap">
                    {seat.seatIndex === 0 ? 'Host · ' : ''}
                    <span className={getUserNameClass(seat.userName, undefined, 'text-inherit')}>
                      {seat.userName}
                    </span>
                    {isCp ? ' 💑' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gift Category Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0C0914] border border-white/10">
          <button
            type="button"
            onClick={() => setGiftFilter('all')}
            className={`flex-1 min-h-[36px] px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              giftFilter === 'all' ? 'bg-amber-500 text-[#0C0914]' : 'text-slate-300 hover:text-white'
            }`}
          >
            All Gifts
          </button>
          <button
            type="button"
            onClick={() => {
              setGiftFilter('lucky');
              const firstLucky = GIFT_CATALOG.find((g) => g.tier === 'lucky');
              if (firstLucky) setSelectedGiftId(firstLucky.id);
            }}
            className={`flex-1 min-h-[36px] px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
              giftFilter === 'lucky'
                ? 'bg-emerald-500 text-[#091320]'
                : 'text-emerald-300 hover:text-emerald-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Lucky Gifts</span>
          </button>
          <button
            type="button"
            onClick={() => setGiftFilter('luxury')}
            className={`flex-1 min-h-[36px] px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              giftFilter === 'luxury'
                ? 'bg-rose-500 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Classic &amp; VIP
          </button>
        </div>

        {/* Gift Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {visibleGifts.map((gift) => {
            const active = gift.id === selectedGiftId;
            const isLucky = gift.tier === 'lucky';
            return (
              <button
                key={gift.id}
                type="button"
                onClick={() => setSelectedGiftId(gift.id)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                  active
                    ? isLucky
                      ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.28)]'
                      : 'bg-amber-500/15 border-amber-400'
                    : isLucky
                    ? 'bg-emerald-950/30 border-emerald-400/30 hover:border-emerald-400/60'
                    : 'bg-[#0C0914] border-white/10 hover:border-white/25'
                }`}
              >
                <span className="text-3xl leading-none">{gift.emoji}</span>
                <span className="text-xs font-semibold text-white truncate w-full mt-0.5">
                  {gift.name}
                </span>
                <span className="text-xs font-mono-nums flex items-center gap-1 text-amber-300">
                  {gift.currency === 'coins' ? (
                    <Coins className="w-3 h-3 text-amber-400" />
                  ) : (
                    <Gem className="w-3 h-3 text-sky-400" />
                  )}
                  <span>{gift.price.toLocaleString()}</span>
                </span>
                {isLucky && gift.luckyMaxMultiplier && (
                  <span className="text-[10px] font-mono-nums font-bold text-emerald-300">
                    Win ×{gift.luckyMaxMultiplier}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Balance, Quantity & Send */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs font-mono-nums">
            <span className="flex items-center gap-1 text-amber-300">
              <Coins className="w-3.5 h-3.5" />
              {currentUser.coins.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-sky-300">
              <Gem className="w-3.5 h-3.5" />
              {currentUser.diamonds.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {[1, 5, 10].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => setQuantity(qty)}
                className={`min-h-[40px] px-3 rounded-xl text-xs font-mono-nums font-bold border ${
                  quantity === qty
                    ? 'bg-white/15 border-amber-400 text-white'
                    : 'bg-[#0C0914] border-white/10 text-slate-400'
                }`}
              >
                ×{qty}
              </button>
            ))}

            <button
              type="button"
              onClick={handleSend}
              disabled={!canAfford}
              className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0C0914] font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send ({totalCost.toLocaleString()})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
