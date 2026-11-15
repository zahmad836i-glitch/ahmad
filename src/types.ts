export type AuthMethod = 'phone' | 'google' | 'guest';

export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  avatar: string;
  bio: string;
  authMethod: AuthMethod;
  phone?: string;
  email?: string;
  level: number;
  xp: number;
  coins: number;
  diamonds: number;
  giftsSent: number;
  giftsReceived: number;
  followingIds: string[];
  followerCount: number;
  isOnline: boolean;
  lastDailyRewardDate?: string;
  dailyRewardClaimedAmount?: number;
  zeeshanWalletGranted?: boolean;
  cpPartnerId?: string | null;
  cpPartnerName?: string | null;
  cpPartnerUid?: string | null;
  cpPartnerAvatar?: string | null;
  cpLevel?: number;
  cpHearts?: number;
  cpSince?: number | null;
  referredByUid?: string | null;
  shareWinsCount?: number;
  shareCoinsEarned?: number;
  firstShareClaimed?: boolean;
}

export interface CpRequest {
  id: string;
  fromUserId: string;
  fromUserUid: string;
  fromUserName: string;
  fromUserAvatar: string;
  toUserId: string;
  toUserUid: string;
  toUserName: string;
  toUserAvatar: string;
  ringCost: number;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: number;
}

export type RoomCategory = 'Popular' | 'New' | 'Friendship Party';

export interface RoomSeat {
  seatIndex: number;
  userId: string | null;
  userUid?: string | null;
  userName: string | null;
  userAvatar: string | null;
  userLevel: number;
  micOn: boolean;
  speaking: boolean;
  locked: boolean;
  hearts: number;
}

export interface RoomChatMessage {
  id: string;
  roomId: string;
  type: 'text' | 'system' | 'gift';
  userId: string;
  userName: string;
  userLevel: number;
  text: string;
  giftName?: string;
  giftEmoji?: string;
  targetUserName?: string;
  timestamp: number;
}

export interface GiftLaunchEvent {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderLevel: number;
  targetName: string;
  giftId: string;
  giftName: string;
  giftEmoji: string;
  quantity: number;
  currency: 'coins' | 'diamonds';
  totalCost: number;
  luckyMultiplier?: number;
  luckyRebate?: number;
  timestamp: number;
}

export interface PartyRoom {
  id: string;
  title: string;
  topic: string;
  category: RoomCategory;
  coverImage: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  adminIds?: string[];
  onlineCount: number;
  announcement: string;
  seats: RoomSeat[];
  messages: RoomChatMessage[];
}

export interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  currency: 'coins' | 'diamonds';
  price: number;
  tier: 'standard' | 'luxury' | 'launch' | 'lucky';
  luckyMaxMultiplier?: number;
}

export interface DirectMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  timestamp: number;
}

export type RocketPhase = 'COUNTDOWN' | 'FLYING' | 'CRASHED';

export interface RocketBet {
  userId: string;
  userUid?: string;
  userName: string;
  userAvatar?: string;
  amount: number;
  autoCashout: number | null;
  cashedOutAt: number | null;
  payout: number;
}

export interface RocketGameState {
  roundId: number;
  phase: RocketPhase;
  countdownSeconds: number;
  multiplier: number;
  crashPoint: number | null;
  bets: RocketBet[];
  history: number[];
}

export type WheelEmblem =
  | 'vw'
  | 'bmw'
  | 'mercedes'
  | 'jaguar'
  | 'ferrari'
  | 'lamborghini'
  | 'bugatti'
  | 'bentley'
  | 'porsche'
  | 'landrover';

export interface WheelSlotConfig {
  emblem: WheelEmblem;
  label: string;
  shortLabel: string;
  multiplier: number;
  color: string;
}

export interface GameWinEntry {
  userId: string;
  userUid?: string;
  userName: string;
  userAvatar?: string;
  stake: number;
  payout: number;
  multiplier: number;
  targetLabel: string;
}

export interface GameWinAnnouncement extends GameWinEntry {
  id: string;
  game: 'fruit' | 'wheel' | 'rocket';
  roundId: number;
  timestamp: number;
}

export interface GameRankEntry {
  rank: number;
  userId: string;
  userUid: string;
  userName: string;
  userAvatar: string;
  userLevel: number;
  totalWon: number;
  winCount: number;
  biggestWin: number;
}

export interface WheelGameState {
  roundId: number;
  phase: 'BETTING' | 'SPINNING' | 'RESULT';
  secondsLeft: number;
  winningEmblem: WheelEmblem | null;
  winningMultiplier: number | null;
  emblemTotals: Record<WheelEmblem, number>;
  myBets: Partial<Record<WheelEmblem, number>>;
  history: WheelEmblem[];
  winners: GameWinEntry[];
}

export type FruitId =
  | 'strawberry'
  | 'watermelon'
  | 'lemon'
  | 'grapes'
  | 'orange'
  | 'apple'
  | 'mango'
  | 'pineapple';

export interface FruitSlotConfig {
  id: FruitId;
  name: string;
  emoji: string;
  multiplier: number;
  accent: string;
}

export interface FruitGameState {
  roundId: number;
  phase: 'BETTING' | 'SPINNING' | 'RESULT';
  secondsLeft: number;
  winningFruit: FruitId | null;
  winningMultiplier: number | null;
  fruitTotals: Record<FruitId, number>;
  myBets: Partial<Record<FruitId, number>>;
  history: FruitId[];
  winners: GameWinEntry[];
}

export const FRUIT_SLOTS: FruitSlotConfig[] = [
  { id: 'strawberry', name: 'Strawberry', emoji: '🍓', multiplier: 5, accent: '#FB7185' },
  { id: 'watermelon', name: 'Watermelon', emoji: '🍉', multiplier: 5, accent: '#34D399' },
  { id: 'lemon', name: 'Lemon', emoji: '🍋', multiplier: 5, accent: '#FACC15' },
  { id: 'grapes', name: 'Grapes', emoji: '🍇', multiplier: 5, accent: '#C084FC' },
  { id: 'orange', name: 'Orange', emoji: '🍊', multiplier: 10, accent: '#FB923C' },
  { id: 'apple', name: 'Red Apple', emoji: '🍎', multiplier: 15, accent: '#F87171' },
  { id: 'mango', name: 'Mango', emoji: '🥭', multiplier: 25, accent: '#FBBF24' },
  { id: 'pineapple', name: 'King Pine', emoji: '🍍', multiplier: 45, accent: '#FDE047' },
];

export const GIFT_CATALOG: GiftItem[] = [
  { id: 'lucky_clover', name: 'Lucky Clover', emoji: '🍀', currency: 'coins', price: 500, tier: 'lucky', luckyMaxMultiplier: 50 },
  { id: 'lucky_box', name: 'Mystery Box', emoji: '🎁', currency: 'coins', price: 2000, tier: 'lucky', luckyMaxMultiplier: 100 },
  { id: 'lucky_crown', name: 'Jackpot Gem', emoji: '💠', currency: 'coins', price: 10000, tier: 'lucky', luckyMaxMultiplier: 200 },
  { id: 'rose', name: 'Velvet Rose', emoji: '🌹', currency: 'coins', price: 25, tier: 'standard' },
  { id: 'heart', name: 'Heart Glow', emoji: '💖', currency: 'coins', price: 100, tier: 'standard' },
  { id: 'mic', name: 'Golden Mic', emoji: '🎙️', currency: 'coins', price: 300, tier: 'standard' },
  { id: 'crown', name: 'Royal Crown', emoji: '👑', currency: 'coins', price: 800, tier: 'luxury' },
  { id: 'car', name: 'GT Roadster', emoji: '🏎️', currency: 'coins', price: 2500, tier: 'luxury' },
  { id: 'rocket', name: 'Star Rocket', emoji: '🚀', currency: 'coins', price: 5000, tier: 'launch' },
  { id: 'diamond_ring', name: 'Diamond Ring', emoji: '💍', currency: 'diamonds', price: 20, tier: 'luxury' },
  { id: 'yacht', name: 'Crystal Yacht', emoji: '🛥️', currency: 'diamonds', price: 80, tier: 'launch' },
];

export const WHEEL_SLOTS: WheelSlotConfig[] = [
  { emblem: 'vw', label: 'VW Classic', shortLabel: 'VW', multiplier: 5, color: '#38BDF8' },
  { emblem: 'bmw', label: 'BMW M', shortLabel: 'BM', multiplier: 5, color: '#60A5FA' },
  { emblem: 'mercedes', label: 'Mercedes', shortLabel: 'MB', multiplier: 10, color: '#94A3B8' },
  { emblem: 'jaguar', label: 'Jaguar', shortLabel: 'JG', multiplier: 18, color: '#34D399' },
  { emblem: 'lamborghini', label: 'Lamborghini', shortLabel: 'LB', multiplier: 50, color: '#FBBF24' },
  { emblem: 'ferrari', label: 'Ferrari', shortLabel: 'FR', multiplier: 66, color: '#F87171' },
  { emblem: 'bentley', label: 'Bentley', shortLabel: 'BN', multiplier: 88, color: '#C084FC' },
  { emblem: 'bugatti', label: 'Bugatti', shortLabel: 'BG', multiplier: 100, color: '#FB7185' },
  { emblem: 'porsche', label: 'Porsche', shortLabel: 'PR', multiplier: 150, color: '#FB923C' },
  { emblem: 'landrover', label: 'Defender', shortLabel: 'LR', multiplier: 200, color: '#FACC15' },
];
