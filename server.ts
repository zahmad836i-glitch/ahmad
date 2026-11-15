import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  AuthMethod,
  CpRequest,
  DirectMessage,
  FRUIT_SLOTS,
  FruitGameState,
  FruitId,
  GIFT_CATALOG,
  GameRankEntry,
  GameWinAnnouncement,
  GameWinEntry,
  GiftLaunchEvent,
  PartyRoom,
  RocketBet,
  RocketGameState,
  RoomCategory,
  RoomChatMessage,
  RoomSeat,
  UserProfile,
  WHEEL_SLOTS,
  WheelEmblem,
  WheelGameState,
} from './src/types.ts';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'velvetvoice.json');

interface GameLeaderboardStats {
  totalWon: number;
  winCount: number;
  biggestWin: number;
}

interface PersistedState {
  users: Record<string, UserProfile>;
  rooms: Record<string, PartyRoom>;
  directMessages: DirectMessage[];
  rocketHistory: number[];
  wheelHistory: WheelEmblem[];
  fruitHistory: FruitId[];
  gameLeaderboard?: Record<string, GameLeaderboardStats>;
  cpRequests?: CpRequest[];
}

function generateNextUid(users: Record<string, UserProfile>): string {
  let maxUid = 10000000;
  for (const u of Object.values(users)) {
    const parsed = Number(u.uid);
    if (Number.isInteger(parsed) && parsed > maxUid) {
      maxUid = parsed;
    }
  }
  return String(maxUid + 1);
}

function createEmptySeats(host?: UserProfile): RoomSeat[] {
  return Array.from({ length: 9 }, (_, i) => {
    if (i === 0 && host) {
      return {
        seatIndex: 0,
        userId: host.id,
        userUid: host.uid,
        userName: host.name,
        userAvatar: host.avatar,
        userLevel: host.level,
        micOn: true,
        speaking: false,
        locked: false,
        hearts: 124,
      };
    }
    return {
      seatIndex: i,
      userId: null,
      userUid: null,
      userName: null,
      userAvatar: null,
      userLevel: 1,
      micOn: false,
      speaking: false,
      locked: false,
      hearts: 0,
    };
  });
}

function createSeedState(): PersistedState {
  const luna: UserProfile = {
    id: 'user_luna',
    uid: '10000001',
    name: 'Luna ✨',
    avatar: 'preset:luna',
    bio: 'Late night acoustic host & friendship party creator.',
    authMethod: 'google',
    email: 'luna@velvetvoice.club',
    level: 8,
    xp: 640,
    coins: 128500,
    diamonds: 1450,
    giftsSent: 42,
    giftsReceived: 318,
    followingIds: ['user_kai', 'user_zara'],
    followerCount: 1284,
    isOnline: true,
  };

  const kai: UserProfile = {
    id: 'user_kai',
    uid: '10000002',
    name: 'Kai Beats',
    avatar: 'preset:kai',
    bio: 'Producer & midnight lo-fi sets. Pull up a seat!',
    authMethod: 'google',
    email: 'kai@velvetvoice.club',
    level: 6,
    xp: 310,
    coins: 84200,
    diamonds: 820,
    giftsSent: 29,
    giftsReceived: 190,
    followingIds: ['user_luna'],
    followerCount: 845,
    isOnline: true,
  };

  const zara: UserProfile = {
    id: 'user_zara',
    uid: '10000003',
    name: 'Zara Velvet',
    avatar: 'preset:zara',
    bio: 'Storytelling, trivia nights & rocket squad.',
    authMethod: 'phone',
    phone: '+1 555 014 8821',
    level: 5,
    xp: 220,
    coins: 64000,
    diamonds: 540,
    giftsSent: 64,
    giftsReceived: 142,
    followingIds: ['user_luna', 'user_kai'],
    followerCount: 612,
    isOnline: true,
  };

  const now = Date.now();
  const rooms: Record<string, PartyRoom> = {};

  return {
    users: {
      [luna.id]: luna,
      [kai.id]: kai,
      [zara.id]: zara,
    },
    rooms,
    directMessages: [
      {
        id: 'dm_seed_1',
        fromUserId: luna.id,
        toUserId: kai.id,
        text: 'Hey Kai, ready for the late-night session?',
        timestamp: now - 3600000,
      },
    ],
    rocketHistory: [1.44, 47.04, 1.29, 1.89, 5.03, 1.5],
    wheelHistory: ['lamborghini', 'mercedes', 'vw', 'bmw', 'bmw', 'vw', 'mercedes', 'bmw', 'mercedes'],
    fruitHistory: ['strawberry', 'watermelon', 'orange', 'mango', 'lemon', 'apple'],
    gameLeaderboard: {},
    cpRequests: [],
  };
}

const LEGACY_SEEDED_ROOM_IDS = [
  '10609039',
  '20481120',
  '30884512',
  '40912005',
  '50119384',
  '60773210',
];

function isZeeshanAccount(user: { name?: string; email?: string }): boolean {
  const cleanName = (user.name || '').trim().toLowerCase();
  const cleanEmail = (user.email || '').trim().toLowerCase();
  return cleanName === 'zeeshan' || cleanEmail === 'zahmad836i@gmail.com';
}

function ensureZeeshanWallet(user: UserProfile): boolean {
  if (isZeeshanAccount(user) && !user.zeeshanWalletGranted) {
    user.coins = Math.max(user.coins, 10_000_000_000);
    user.zeeshanWalletGranted = true;
    return true;
  }
  return false;
}

function isZeeshanRoom(room: PartyRoom, users: Record<string, UserProfile>): boolean {
  const host = users[room.hostId];
  return (
    (host ? isZeeshanAccount(host) : false) ||
    isZeeshanAccount({ name: room.hostName })
  );
}

function ensureZeeshanOfficialRoom(state: PersistedState): boolean {
  const zeeshan = Object.values(state.users).find((u) => isZeeshanAccount(u));
  if (!zeeshan) return false;

  const existing = Object.values(state.rooms).find((r) => isZeeshanRoom(r, state.users));
  if (existing) {
    let changed = false;
    if (existing.title !== 'Official Zariya') {
      existing.title = 'Official Zariya';
      existing.announcement = 'Welcome to Official Zariya! Grab a seat and turn on your mic.';
      changed = true;
    }
    return changed;
  }

  const id = '88880001';
  state.rooms[id] = {
    id,
    title: 'Official Zariya',
    topic: 'Official Zariya Party Stage & Live Games',
    category: 'Popular',
    coverImage: 'preset:stage',
    hostId: zeeshan.id,
    hostName: zeeshan.name,
    hostAvatar: zeeshan.avatar,
    onlineCount: 1,
    announcement: 'Welcome to Official Zariya! Grab a seat and turn on your mic.',
    seats: createEmptySeats(zeeshan),
    messages: [
      {
        id: `msg_${Date.now()}`,
        roomId: id,
        type: 'system',
        userId: 'system',
        userName: 'Zariya',
        userLevel: 0,
        text: `${zeeshan.name} opened Official Zariya.`,
        timestamp: Date.now(),
      },
    ],
  };
  return true;
}

function loadState(): PersistedState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed.users && parsed.rooms) {
        let mutated = false;
        for (const oldId of LEGACY_SEEDED_ROOM_IDS) {
          if (parsed.rooms[oldId]) {
            delete parsed.rooms[oldId];
            mutated = true;
          }
        }
        if (!Array.isArray(parsed.fruitHistory)) {
          parsed.fruitHistory = ['strawberry', 'watermelon', 'orange', 'mango', 'lemon', 'apple'];
          mutated = true;
        }
        if (!parsed.gameLeaderboard || typeof parsed.gameLeaderboard !== 'object') {
          parsed.gameLeaderboard = {};
          mutated = true;
        }
        if (!Array.isArray(parsed.cpRequests)) {
          parsed.cpRequests = [];
          mutated = true;
        }
        for (const u of Object.values(parsed.users)) {
          if (!u.uid) {
            u.uid = generateNextUid(parsed.users);
            mutated = true;
          }
          if (ensureZeeshanWallet(u)) {
            mutated = true;
          }
        }
        for (const room of Object.values(parsed.rooms)) {
          for (const seat of room.seats) {
            if (seat.userId && !seat.userUid && parsed.users[seat.userId]?.uid) {
              seat.userUid = parsed.users[seat.userId].uid;
              mutated = true;
            }
          }
        }
        if (ensureZeeshanOfficialRoom(parsed)) {
          mutated = true;
        }
        if (mutated) {
          saveStateImmediate(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read persisted state, seeding fresh DB:', err);
  }
  const seeded = createSeedState();
  saveStateImmediate(seeded);
  return seeded;
}

function saveStateImmediate(state: PersistedState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Failed to persist state:', err);
  }
}

const db: PersistedState = loadState();
let saveTimeout: NodeJS.Timeout | null = null;
function scheduleSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    saveStateImmediate(db);
  }, 500);
}

// Pending OTP map: phone -> { code, expiresAt }
const pendingOtps = new Map<string, { code: string; expiresAt: number }>();

function calculateLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 40)) + 1);
}

// Socket tracking
interface ClientSession {
  ws: WebSocket;
  userId: string | null;
  roomId: string | null;
}

const clients = new Set<ClientSession>();

function sendJson(ws: WebSocket, event: string, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, payload }));
  }
}

function broadcastAll(event: string, payload: unknown) {
  for (const c of clients) {
    sendJson(c.ws, event, payload);
  }
}

function broadcastRoom(roomId: string, event: string, payload: unknown) {
  for (const c of clients) {
    if (c.roomId === roomId) {
      sendJson(c.ws, event, payload);
    }
  }
}

function notifyUser(userId: string, event: string, payload: unknown) {
  for (const c of clients) {
    if (c.userId === userId) {
      sendJson(c.ws, event, payload);
    }
  }
}

const recentGameWins: GameWinAnnouncement[] = [];

function getTopGameRankings(): GameRankEntry[] {
  const board = db.gameLeaderboard || {};
  const entries: Omit<GameRankEntry, 'rank'>[] = [];
  for (const [userId, stats] of Object.entries(board)) {
    const user = db.users[userId];
    if (!user || !stats || stats.totalWon <= 0) continue;
    entries.push({
      userId: user.id,
      userUid: user.uid,
      userName: user.name,
      userAvatar: user.avatar,
      userLevel: user.level,
      totalWon: stats.totalWon,
      winCount: stats.winCount,
      biggestWin: stats.biggestWin,
    });
  }
  entries.sort((a, b) => {
    if (b.totalWon !== a.totalWon) return b.totalWon - a.totalWon;
    if (b.biggestWin !== a.biggestWin) return b.biggestWin - a.biggestWin;
    return b.winCount - a.winCount;
  });
  return entries.slice(0, 10).map((item, idx) => ({
    rank: idx + 1,
    ...item,
  }));
}

function emitGameWin(params: {
  game: 'fruit' | 'wheel' | 'rocket';
  roundId: number;
  user: UserProfile;
  stake: number;
  payout: number;
  multiplier: number;
  targetLabel: string;
}) {
  const announcement: GameWinAnnouncement = {
    id: `win_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    game: params.game,
    roundId: params.roundId,
    userId: params.user.id,
    userUid: params.user.uid,
    userName: params.user.name,
    userAvatar: params.user.avatar,
    stake: params.stake,
    payout: params.payout,
    multiplier: params.multiplier,
    targetLabel: params.targetLabel,
    timestamp: Date.now(),
  };

  recentGameWins.unshift(announcement);
  if (recentGameWins.length > 20) recentGameWins.pop();

  if (!db.gameLeaderboard) db.gameLeaderboard = {};
  const prevStats = db.gameLeaderboard[params.user.id] || {
    totalWon: 0,
    winCount: 0,
    biggestWin: 0,
  };
  db.gameLeaderboard[params.user.id] = {
    totalWon: prevStats.totalWon + params.payout,
    winCount: prevStats.winCount + 1,
    biggestWin: Math.max(prevStats.biggestWin, params.payout),
  };
  scheduleSave();

  broadcastAll('game:win', announcement);
  broadcastAll('game:ranking:updated', getTopGameRankings());

  const gameLabel =
    params.game === 'fruit'
      ? 'Fruit Party'
      : params.game === 'wheel'
      ? 'Luxury Wheel'
      : 'Rocket';

  const postedRooms = new Set<string>();
  for (const c of clients) {
    if (c.userId === params.user.id && c.roomId && db.rooms[c.roomId] && !postedRooms.has(c.roomId)) {
      postedRooms.add(c.roomId);
      const room = db.rooms[c.roomId];
      const winMsg: RoomChatMessage = {
        id: `winmsg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        roomId: room.id,
        type: 'system',
        userId: params.user.id,
        userName: params.user.name,
        userLevel: params.user.level,
        text: `🏆 ${params.user.name} won +${params.payout.toLocaleString()} Coins in ${gameLabel} (${params.targetLabel})!`,
        timestamp: Date.now(),
      };
      room.messages.push(winMsg);
      if (room.messages.length > 80) room.messages.shift();
      broadcastRoom(room.id, 'room:chat:new', winMsg);
    }
  }
}

// ==========================================
// SERVER-AUTHORITATIVE ROCKET CRASH ENGINE
// ==========================================
let rocketRoundId = 1762692;
let rocketPhase: 'COUNTDOWN' | 'FLYING' | 'CRASHED' = 'COUNTDOWN';
let rocketCountdown = 9;
let rocketMultiplier = 1.0;
let rocketTargetCrash = 2.4;
let rocketBets: RocketBet[] = [];
let rocketFlightTicks = 0;

function sampleCrashPoint(): number {
  const r = Math.random();
  if (r < 0.08) return 1.05;
  const raw = 0.96 / (1 - r);
  return Math.min(50, Math.max(1.08, Number(raw.toFixed(2))));
}

function getPublicRocketState(): RocketGameState {
  return {
    roundId: rocketRoundId,
    phase: rocketPhase,
    countdownSeconds: rocketCountdown,
    multiplier: Number(rocketMultiplier.toFixed(2)),
    crashPoint: rocketPhase === 'CRASHED' ? rocketTargetCrash : null,
    bets: rocketBets,
    history: db.rocketHistory.slice(0, 12),
  };
}

setInterval(() => {
  if (rocketPhase === 'COUNTDOWN') {
    rocketCountdown -= 1;
    if (rocketCountdown <= 0) {
      rocketPhase = 'FLYING';
      rocketMultiplier = 1.0;
      rocketFlightTicks = 0;
      rocketTargetCrash = sampleCrashPoint();
    }
    broadcastAll('rocket:state', getPublicRocketState());
  } else if (rocketPhase === 'CRASHED') {
    rocketCountdown -= 1;
    if (rocketCountdown <= 0) {
      rocketRoundId += 1;
      rocketPhase = 'COUNTDOWN';
      rocketCountdown = 9;
      rocketMultiplier = 1.0;
      rocketBets = [];
    }
    broadcastAll('rocket:state', getPublicRocketState());
  }
}, 1000);

setInterval(() => {
  if (rocketPhase !== 'FLYING') return;
  rocketFlightTicks += 1;
  // Exponential growth curve ~1.00 -> 2.00 in ~5s
  rocketMultiplier = Number(Math.pow(Math.E, rocketFlightTicks * 0.015).toFixed(2));

  // Process auto-cashouts
  for (const bet of rocketBets) {
    if (!bet.cashedOutAt && bet.autoCashout && rocketMultiplier >= bet.autoCashout) {
      bet.cashedOutAt = bet.autoCashout;
      bet.payout = Math.floor(bet.amount * bet.autoCashout);
      const user = db.users[bet.userId];
      if (user) {
        user.coins += bet.payout;
        user.xp += 15;
        user.level = calculateLevel(user.xp);
        notifyUser(user.id, 'user:updated', user);
        emitGameWin({
          game: 'rocket',
          roundId: rocketRoundId,
          user,
          stake: bet.amount,
          payout: bet.payout,
          multiplier: bet.autoCashout,
          targetLabel: `${bet.autoCashout.toFixed(2)}x`,
        });
        scheduleSave();
      }
    }
  }

  if (rocketMultiplier >= rocketTargetCrash) {
    rocketMultiplier = rocketTargetCrash;
    rocketPhase = 'CRASHED';
    rocketCountdown = 3;
    db.rocketHistory.unshift(rocketTargetCrash);
    if (db.rocketHistory.length > 20) db.rocketHistory.pop();
    scheduleSave();
  }

  broadcastAll('rocket:state', getPublicRocketState());
}, 100);

// ==========================================
// SERVER-AUTHORITATIVE LUCKY WHEEL ENGINE
// ==========================================
let wheelRoundId = 1114001546;
let wheelPhase: 'BETTING' | 'SPINNING' | 'RESULT' = 'BETTING';
let wheelSecondsLeft = 15;
let wheelWinningEmblem: WheelEmblem | null = null;
let wheelWinningMultiplier: number | null = null;
let wheelRoundWinners: GameWinEntry[] = [];
const wheelBetsByUser = new Map<string, Partial<Record<WheelEmblem, number>>>();

function emptyEmblemTotals(): Record<WheelEmblem, number> {
  return {
    vw: 0,
    bmw: 0,
    mercedes: 0,
    jaguar: 0,
    ferrari: 0,
    lamborghini: 0,
    bugatti: 0,
    bentley: 0,
    porsche: 0,
    landrover: 0,
  };
}

function getEmblemTotals(): Record<WheelEmblem, number> {
  const totals = emptyEmblemTotals();
  for (const userBets of wheelBetsByUser.values()) {
    for (const [emblem, amt] of Object.entries(userBets)) {
      if (amt) totals[emblem as WheelEmblem] += amt;
    }
  }
  return totals;
}

function sampleWheelSlot() {
  const weights = WHEEL_SLOTS.map((s) => 1 / s.multiplier);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < WHEEL_SLOTS.length; i++) {
    r -= weights[i];
    if (r <= 0) return WHEEL_SLOTS[i];
  }
  return WHEEL_SLOTS[0];
}

function getPublicWheelState(userId?: string | null): WheelGameState {
  return {
    roundId: wheelRoundId,
    phase: wheelPhase,
    secondsLeft: wheelSecondsLeft,
    winningEmblem: wheelWinningEmblem,
    winningMultiplier: wheelWinningMultiplier,
    emblemTotals: getEmblemTotals(),
    myBets: userId ? wheelBetsByUser.get(userId) || {} : {},
    history: db.wheelHistory.slice(0, 12),
    winners: wheelRoundWinners,
  };
}

function broadcastWheelState() {
  for (const c of clients) {
    sendJson(c.ws, 'wheel:state', getPublicWheelState(c.userId));
  }
}

setInterval(() => {
  wheelSecondsLeft -= 1;
  if (wheelPhase === 'BETTING' && wheelSecondsLeft <= 0) {
    wheelPhase = 'SPINNING';
    wheelSecondsLeft = 3;
    const winner = sampleWheelSlot();
    wheelWinningEmblem = winner.emblem;
    wheelWinningMultiplier = winner.multiplier;
    broadcastWheelState();
  } else if (wheelPhase === 'SPINNING' && wheelSecondsLeft <= 0) {
    wheelPhase = 'RESULT';
    wheelSecondsLeft = 4;
    wheelRoundWinners = [];
    if (wheelWinningEmblem && wheelWinningMultiplier) {
      db.wheelHistory.unshift(wheelWinningEmblem);
      if (db.wheelHistory.length > 20) db.wheelHistory.pop();

      const slotMeta = WHEEL_SLOTS.find((s) => s.emblem === wheelWinningEmblem);
      const targetLabel = `${slotMeta?.label || wheelWinningEmblem} ×${wheelWinningMultiplier}`;

      for (const [uid, userBets] of wheelBetsByUser.entries()) {
        const stake = userBets[wheelWinningEmblem] || 0;
        if (stake > 0) {
          const user = db.users[uid];
          if (user) {
            const payout = stake * wheelWinningMultiplier;
            user.coins += payout;
            user.xp += 20;
            user.level = calculateLevel(user.xp);
            notifyUser(uid, 'user:updated', user);
            const entry: GameWinEntry = {
              userId: user.id,
              userUid: user.uid,
              userName: user.name,
              userAvatar: user.avatar,
              stake,
              payout,
              multiplier: wheelWinningMultiplier,
              targetLabel,
            };
            wheelRoundWinners.push(entry);
            emitGameWin({
              game: 'wheel',
              roundId: wheelRoundId,
              user,
              stake,
              payout,
              multiplier: wheelWinningMultiplier,
              targetLabel,
            });
          }
        }
      }
      wheelRoundWinners.sort((a, b) => b.payout - a.payout);
      scheduleSave();
    }
    broadcastWheelState();
  } else if (wheelPhase === 'RESULT' && wheelSecondsLeft <= 0) {
    wheelRoundId += 1;
    wheelPhase = 'BETTING';
    wheelSecondsLeft = 15;
    wheelWinningEmblem = null;
    wheelWinningMultiplier = null;
    wheelRoundWinners = [];
    wheelBetsByUser.clear();
    broadcastWheelState();
  } else {
    broadcastWheelState();
  }
}, 1000);

// ==========================================
// SERVER-AUTHORITATIVE FRUIT PARTY ENGINE
// ==========================================
let fruitRoundId = 804210;
let fruitPhase: 'BETTING' | 'SPINNING' | 'RESULT' = 'BETTING';
let fruitSecondsLeft = 12;
let fruitWinning: FruitId | null = null;
let fruitWinningMultiplier: number | null = null;
let fruitRoundWinners: GameWinEntry[] = [];
const fruitBetsByUser = new Map<string, Partial<Record<FruitId, number>>>();

function emptyFruitTotals(): Record<FruitId, number> {
  return {
    strawberry: 0,
    watermelon: 0,
    lemon: 0,
    grapes: 0,
    orange: 0,
    apple: 0,
    mango: 0,
    pineapple: 0,
  };
}

function getFruitTotals(): Record<FruitId, number> {
  const totals = emptyFruitTotals();
  for (const userBets of fruitBetsByUser.values()) {
    for (const [fid, amt] of Object.entries(userBets)) {
      if (amt) totals[fid as FruitId] += amt;
    }
  }
  return totals;
}

function sampleFruitSlot() {
  const weights = FRUIT_SLOTS.map((s) => 1 / s.multiplier);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < FRUIT_SLOTS.length; i++) {
    r -= weights[i];
    if (r <= 0) return FRUIT_SLOTS[i];
  }
  return FRUIT_SLOTS[0];
}

function getPublicFruitState(userId?: string | null): FruitGameState {
  return {
    roundId: fruitRoundId,
    phase: fruitPhase,
    secondsLeft: fruitSecondsLeft,
    winningFruit: fruitWinning,
    winningMultiplier: fruitWinningMultiplier,
    fruitTotals: getFruitTotals(),
    myBets: userId ? fruitBetsByUser.get(userId) || {} : {},
    history: db.fruitHistory.slice(0, 12),
    winners: fruitRoundWinners,
  };
}

function broadcastFruitState() {
  for (const c of clients) {
    sendJson(c.ws, 'fruit:state', getPublicFruitState(c.userId));
  }
}

setInterval(() => {
  fruitSecondsLeft -= 1;
  if (fruitPhase === 'BETTING' && fruitSecondsLeft <= 0) {
    fruitPhase = 'SPINNING';
    fruitSecondsLeft = 3;
    const winner = sampleFruitSlot();
    fruitWinning = winner.id;
    fruitWinningMultiplier = winner.multiplier;
    broadcastFruitState();
  } else if (fruitPhase === 'SPINNING' && fruitSecondsLeft <= 0) {
    fruitPhase = 'RESULT';
    fruitSecondsLeft = 4;
    fruitRoundWinners = [];
    if (fruitWinning && fruitWinningMultiplier) {
      db.fruitHistory.unshift(fruitWinning);
      if (db.fruitHistory.length > 20) db.fruitHistory.pop();

      const slotMeta = FRUIT_SLOTS.find((s) => s.id === fruitWinning);
      const targetLabel = `${slotMeta?.emoji || ''} ${slotMeta?.name || fruitWinning} ×${fruitWinningMultiplier}`.trim();

      for (const [uid, userBets] of fruitBetsByUser.entries()) {
        const stake = userBets[fruitWinning] || 0;
        if (stake > 0) {
          const user = db.users[uid];
          if (user) {
            const payout = stake * fruitWinningMultiplier;
            user.coins += payout;
            user.xp += 20;
            user.level = calculateLevel(user.xp);
            notifyUser(uid, 'user:updated', user);
            const entry: GameWinEntry = {
              userId: user.id,
              userUid: user.uid,
              userName: user.name,
              userAvatar: user.avatar,
              stake,
              payout,
              multiplier: fruitWinningMultiplier,
              targetLabel,
            };
            fruitRoundWinners.push(entry);
            emitGameWin({
              game: 'fruit',
              roundId: fruitRoundId,
              user,
              stake,
              payout,
              multiplier: fruitWinningMultiplier,
              targetLabel,
            });
          }
        }
      }
      fruitRoundWinners.sort((a, b) => b.payout - a.payout);
      scheduleSave();
    }
    broadcastFruitState();
  } else if (fruitPhase === 'RESULT' && fruitSecondsLeft <= 0) {
    fruitRoundId += 1;
    fruitPhase = 'BETTING';
    fruitSecondsLeft = 12;
    fruitWinning = null;
    fruitWinningMultiplier = null;
    fruitRoundWinners = [];
    fruitBetsByUser.clear();
    broadcastFruitState();
  } else {
    broadcastFruitState();
  }
}, 1000);

// ==========================================
// EXPRESS + VITE SERVER
// ==========================================
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Auth: Phone OTP Request
  app.post('/api/auth/phone/request-otp', (req, res) => {
    const phone = String(req.body?.phone || '').trim();
    if (!phone || phone.length < 6) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    pendingOtps.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
    return res.json({ ok: true, demoCode: code });
  });

  // Auth: Phone OTP Verify
  app.post('/api/auth/phone/verify', (req, res) => {
    const phone = String(req.body?.phone || '').trim();
    const code = String(req.body?.code || '').trim();
    const name = String(req.body?.name || '').trim();

    const record = pendingOtps.get(phone);
    if (!record || record.code !== code || record.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }
    pendingOtps.delete(phone);

    let user = Object.values(db.users).find((u) => u.phone === phone);
    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      user = {
        id,
        uid: generateNextUid(db.users),
        name: name || `Member ${phone.slice(-4)}`,
        avatar: 'preset:zara',
        bio: 'Joined via Phone Verification.',
        authMethod: 'phone',
        phone,
        level: 1,
        xp: 20,
        coins: 500000,
        diamonds: 500,
        giftsSent: 0,
        giftsReceived: 0,
        followingIds: ['user_luna'],
        followerCount: 1,
        isOnline: true,
      };
      db.users[id] = user;
      ensureZeeshanWallet(user);
      ensureZeeshanOfficialRoom(db);
      scheduleSave();
    } else {
      let updated = false;
      if (!user.uid) {
        user.uid = generateNextUid(db.users);
        updated = true;
      }
      if (ensureZeeshanWallet(user)) updated = true;
      if (ensureZeeshanOfficialRoom(db)) updated = true;
      if (updated) scheduleSave();
    }
    return res.json({ user, isNewUser });
  });

  // Auth: Google Login
  app.post('/api/auth/google', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid Google email is required.' });
    }
    let user = Object.values(db.users).find((u) => u.email?.toLowerCase() === email);
    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      user = {
        id,
        uid: generateNextUid(db.users),
        name: name || email.split('@')[0],
        avatar: 'preset:kai',
        bio: 'Signed in with Google · Ready for party rooms.',
        authMethod: 'google',
        email,
        level: 2,
        xp: 60,
        coins: 500000,
        diamonds: 500,
        giftsSent: 0,
        giftsReceived: 0,
        followingIds: ['user_luna', 'user_kai'],
        followerCount: 2,
        isOnline: true,
      };
      db.users[id] = user;
      ensureZeeshanWallet(user);
      ensureZeeshanOfficialRoom(db);
      scheduleSave();
    } else {
      let updated = false;
      if (!user.uid) {
        user.uid = generateNextUid(db.users);
        updated = true;
      }
      if (ensureZeeshanWallet(user)) updated = true;
      if (ensureZeeshanOfficialRoom(db)) updated = true;
      if (updated) scheduleSave();
    }
    return res.json({ user, isNewUser });
  });

  // Auth: Guest Login
  app.post('/api/auth/guest', (req, res) => {
    const existingId = String(req.body?.existingId || '').trim();
    if (existingId && db.users[existingId]) {
      db.users[existingId].isOnline = true;
      if (!db.users[existingId].uid) {
        db.users[existingId].uid = generateNextUid(db.users);
        scheduleSave();
      }
      return res.json({ user: db.users[existingId], isNewUser: false });
    }
    const num = Math.floor(1000 + Math.random() * 9000);
    const id = `guest_${Date.now()}_${num}`;
    const presets = ['preset:luna', 'preset:kai', 'preset:zara'];
    const user: UserProfile = {
      id,
      uid: generateNextUid(db.users),
      name: `Guest ${num}`,
      avatar: presets[num % presets.length],
      bio: 'Exploring live voice lounges & mini-games.',
      authMethod: 'guest' as AuthMethod,
      level: 1,
      xp: 0,
      coins: 500000,
      diamonds: 500,
      giftsSent: 0,
      giftsReceived: 0,
      followingIds: ['user_luna'],
      followerCount: 0,
      isOnline: true,
    };
    db.users[id] = user;
    scheduleSave();
    return res.json({ user, isNewUser: true });
  });

  // Users Directory & Profile
  app.get('/api/users', (_req, res) => {
    res.json({ users: Object.values(db.users) });
  });

  app.get('/api/users/:id', (req, res) => {
    const query = req.params.id.trim();
    const user =
      db.users[query] || Object.values(db.users).find((u) => u.uid === query);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  });

  app.patch('/api/users/:id', (req, res) => {
    const user = db.users[req.params.id];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (typeof req.body?.name === 'string' && req.body.name.trim()) {
      user.name = req.body.name.trim().slice(0, 32);
    }
    if (typeof req.body?.bio === 'string') {
      user.bio = req.body.bio.trim().slice(0, 140);
    }
    if (typeof req.body?.avatar === 'string' && req.body.avatar.trim()) {
      user.avatar = req.body.avatar.trim();
    }
    // Sync updated user info across any occupied room seats
    for (const room of Object.values(db.rooms)) {
      let changed = false;
      for (const seat of room.seats) {
        if (seat.userId === user.id) {
          seat.userName = user.name;
          seat.userAvatar = user.avatar;
          seat.userLevel = user.level;
          changed = true;
        }
      }
      if (changed) {
        broadcastRoom(room.id, 'room:state', room);
      }
    }
    scheduleSave();
    notifyUser(user.id, 'user:updated', user);
    return res.json({ user });
  });

  app.post('/api/users/:id/follow', (req, res) => {
    const user = db.users[req.params.id];
    const targetId = String(req.body?.targetId || '');
    const target = db.users[targetId];
    if (!user || !target || user.id === target.id) {
      return res.status(400).json({ error: 'Invalid follow action.' });
    }
    const idx = user.followingIds.indexOf(targetId);
    let following = false;
    if (idx >= 0) {
      user.followingIds.splice(idx, 1);
      target.followerCount = Math.max(0, target.followerCount - 1);
      following = false;
    } else {
      user.followingIds.push(targetId);
      target.followerCount += 1;
      following = true;
    }
    scheduleSave();
    notifyUser(user.id, 'user:updated', user);
    return res.json({ user, target, following });
  });

  // Wallet: Daily Room Reward & Diamonds <-> Coins Exchange
  app.post('/api/wallet/exchange', (req, res) => {
    const userId = String(req.body?.userId || '');
    const action = String(req.body?.action || '');
    const user = db.users[userId];
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (action === 'daily_room_reward') {
      const today = new Date().toISOString().slice(0, 10);
      if (user.lastDailyRewardDate === today) {
        return res.status(400).json({
          error: `Today's Daily Reward (+${(user.dailyRewardClaimedAmount || 0).toLocaleString()} Coins) already claimed!`,
        });
      }
      const tiers = [25000, 40000, 50000, 75000, 100000];
      const reward = tiers[Math.floor(Math.random() * tiers.length)];
      user.coins += reward;
      user.lastDailyRewardDate = today;
      user.dailyRewardClaimedAmount = reward;
      scheduleSave();
      notifyUser(user.id, 'user:updated', user);
      return res.json({
        user,
        reward,
        message: `Daily Reward Claimed! +${reward.toLocaleString()} Coins added to Wallet!`,
      });
    }

    if (action === 'diamonds_to_coins') {
      const diamondsToSpend = Math.floor(Number(req.body?.diamonds || 0));
      if (diamondsToSpend <= 0 || user.diamonds < diamondsToSpend) {
        return res.status(400).json({ error: 'Insufficient diamonds.' });
      }
      user.diamonds -= diamondsToSpend;
      user.coins += diamondsToSpend * 25;
      scheduleSave();
      notifyUser(user.id, 'user:updated', user);
      return res.json({
        user,
        message: `Converted ${diamondsToSpend} Diamonds into ${(diamondsToSpend * 25).toLocaleString()} Coins.`,
      });
    }

    if (action === 'coins_to_diamonds') {
      const coinsToSpend = Math.floor(Number(req.body?.coins || 0));
      if (coinsToSpend < 30 || user.coins < coinsToSpend) {
        return res.status(400).json({ error: 'Minimum 30 Coins required.' });
      }
      const gainedDiamonds = Math.floor(coinsToSpend / 30);
      const actualCost = gainedDiamonds * 30;
      user.coins -= actualCost;
      user.diamonds += gainedDiamonds;
      scheduleSave();
      notifyUser(user.id, 'user:updated', user);
      return res.json({
        user,
        message: `Converted ${actualCost.toLocaleString()} Coins into ${gainedDiamonds} Diamonds.`,
      });
    }

    return res.status(400).json({ error: 'Unknown wallet action.' });
  });

  // Wallet: Recharge Coins to Another User
  app.post('/api/wallet/recharge-user', (req, res) => {
    const fromUserId = String(req.body?.fromUserId || '').trim();
    const targetUserId = String(req.body?.targetUserId || '').trim();
    const amount = Math.floor(Number(req.body?.amount || 0));

    const sender = db.users[fromUserId];
    const target =
      db.users[targetUserId] ||
      Object.values(db.users).find((u) => u.uid === targetUserId);
    if (!sender || !target) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    if (sender.uid !== '10000006') {
      return res.status(403).json({ error: 'Coin recharge is only enabled for UID 10000006.' });
    }
    if (sender.id === target.id) {
      return res.status(400).json({ error: 'Cannot recharge your own account via transfer.' });
    }
    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ error: 'Minimum recharge amount is 100 Coins.' });
    }
    if (sender.coins < amount) {
      return res.status(400).json({ error: 'Insufficient Coins in your wallet.' });
    }

    sender.coins -= amount;
    target.coins += amount;
    scheduleSave();

    notifyUser(sender.id, 'user:updated', sender);
    notifyUser(target.id, 'user:updated', target);
    notifyUser(target.id, 'error:toast', {
      message: `${sender.name} recharged +${amount.toLocaleString()} Coins to your Wallet!`,
    });

    return res.json({
      sender,
      target,
      message: `Recharged +${amount.toLocaleString()} Coins to ${target.name}!`,
    });
  });

  // Party Rooms List & Create
  app.get('/api/rooms', (req, res) => {
    const category = String(req.query.category || '');
    const q = String(req.query.q || '').trim().toLowerCase();
    let list = Object.values(db.rooms);
    if (category && category !== 'All') {
      list = list.filter((r) => r.category === category);
    }
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.topic.toLowerCase().includes(q) ||
          r.id.includes(q) ||
          r.hostName.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const aZeeshan = isZeeshanRoom(a, db.users) ? 1 : 0;
      const bZeeshan = isZeeshanRoom(b, db.users) ? 1 : 0;
      if (aZeeshan !== bZeeshan) return bZeeshan - aZeeshan;
      const aSent = db.users[a.hostId]?.giftsSent || 0;
      const bSent = db.users[b.hostId]?.giftsSent || 0;
      if (aSent !== bSent) return bSent - aSent;
      return b.onlineCount - a.onlineCount;
    });
    res.json({ rooms: list });
  });

  app.post('/api/rooms', (req, res) => {
    const hostId = String(req.body?.hostId || '');
    const title = String(req.body?.title || '').trim();
    const topic = String(req.body?.topic || 'Open Voice Lounge').trim();
    const category = (req.body?.category as RoomCategory) || 'New';
    const host = db.users[hostId];
    if (!host) return res.status(404).json({ error: 'Host user not found.' });
    if (!title) return res.status(400).json({ error: 'Room title is required.' });

    const id = String(Math.floor(10000000 + Math.random() * 89999999));
    const room: PartyRoom = {
      id,
      title: title.slice(0, 48),
      topic: topic.slice(0, 64),
      category,
      coverImage: category === 'Friendship Party' ? 'preset:chill' : 'preset:stage',
      hostId: host.id,
      hostName: host.name,
      hostAvatar: host.avatar,
      onlineCount: 1,
      announcement: `Welcome to ${title}! Grab a seat and turn on your mic.`,
      seats: createEmptySeats(host),
      messages: [
        {
          id: `msg_${Date.now()}`,
          roomId: id,
          type: 'system',
          userId: 'system',
          userName: 'Zariya',
          userLevel: 0,
          text: `${host.name} created this ${category} room.`,
          timestamp: Date.now(),
        },
      ],
    };
    db.rooms[id] = room;
    scheduleSave();
    broadcastAll('rooms:list:updated', { roomId: id });
    return res.json({ room });
  });

  // Direct Messages
  app.get('/api/messages/:userId/:peerId', (req, res) => {
    const { userId, peerId } = req.params;
    const thread = db.directMessages.filter(
      (m) =>
        (m.fromUserId === userId && m.toUserId === peerId) ||
        (m.fromUserId === peerId && m.toUserId === userId)
    );
    res.json({ messages: thread });
  });

  app.post('/api/messages', (req, res) => {
    const fromUserId = String(req.body?.fromUserId || '');
    const toUserId = String(req.body?.toUserId || '');
    const text = String(req.body?.text || '').trim();
    if (!fromUserId || !toUserId || !text) {
      return res.status(400).json({ error: 'Missing message fields.' });
    }
    const msg: DirectMessage = {
      id: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fromUserId,
      toUserId,
      text: text.slice(0, 500),
      timestamp: Date.now(),
    };
    db.directMessages.push(msg);
    scheduleSave();
    notifyUser(toUserId, 'dm:new', msg);
    notifyUser(fromUserId, 'dm:new', msg);
    return res.json({ message: msg });
  });

  // Games Top Ranking API
  app.get('/api/games/rankings', (_req, res) => {
    res.json({ rankings: getTopGameRankings() });
  });

  // CP (Couple Partner) APIs
  const CP_RING_COST = 10000;

  app.get('/api/cp/requests/:userId', (req, res) => {
    const userId = String(req.params.userId || '');
    const list = (db.cpRequests || []).filter((r) => r.status === 'pending');
    res.json({
      incoming: list.filter((r) => r.toUserId === userId),
      outgoing: list.filter((r) => r.fromUserId === userId),
    });
  });

  app.post('/api/cp/propose', (req, res) => {
    const fromUserId = String(req.body?.fromUserId || '');
    const toUserId = String(req.body?.toUserId || '');
    const fromUser = db.users[fromUserId];
    const toUser = db.users[toUserId];
    if (!fromUser || !toUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    if (fromUser.id === toUser.id) {
      return res.status(400).json({ error: 'Cannot propose CP to yourself.' });
    }
    if (fromUser.cpPartnerId) {
      return res.status(400).json({ error: 'You already have a CP Partner.' });
    }
    if (toUser.cpPartnerId) {
      return res.status(400).json({ error: `${toUser.name} already has a CP Partner.` });
    }
    if (!db.cpRequests) db.cpRequests = [];
    const existingPending = db.cpRequests.find(
      (r) =>
        r.status === 'pending' &&
        ((r.fromUserId === fromUser.id && r.toUserId === toUser.id) ||
          (r.fromUserId === toUser.id && r.toUserId === fromUser.id))
    );
    if (existingPending) {
      return res.status(400).json({ error: 'A pending CP proposal already exists between you.' });
    }
    if (fromUser.coins < CP_RING_COST) {
      return res.status(400).json({
        error: `Need ${CP_RING_COST.toLocaleString()} Coins for a CP Ring proposal.`,
      });
    }

    fromUser.coins -= CP_RING_COST;
    const reqObj: CpRequest = {
      id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fromUserId: fromUser.id,
      fromUserUid: fromUser.uid,
      fromUserName: fromUser.name,
      fromUserAvatar: fromUser.avatar,
      toUserId: toUser.id,
      toUserUid: toUser.uid,
      toUserName: toUser.name,
      toUserAvatar: toUser.avatar,
      ringCost: CP_RING_COST,
      status: 'pending',
      timestamp: Date.now(),
    };
    db.cpRequests.unshift(reqObj);
    scheduleSave();

    notifyUser(fromUser.id, 'user:updated', fromUser);
    notifyUser(toUser.id, 'cp:request:new', reqObj);
    notifyUser(toUser.id, 'error:toast', {
      message: `💑 ${fromUser.name} sent you a CP Partner proposal!`,
    });
    return res.json({ request: reqObj, user: fromUser });
  });

  app.post('/api/cp/respond', (req, res) => {
    const requestId = String(req.body?.requestId || '');
    const userId = String(req.body?.userId || '');
    const accept = Boolean(req.body?.accept);
    if (!db.cpRequests) db.cpRequests = [];
    const reqObj = db.cpRequests.find((r) => r.id === requestId && r.status === 'pending');
    if (!reqObj || reqObj.toUserId !== userId) {
      return res.status(404).json({ error: 'CP proposal not found or already handled.' });
    }

    const fromUser = db.users[reqObj.fromUserId];
    const toUser = db.users[reqObj.toUserId];
    if (!fromUser || !toUser) {
      reqObj.status = 'declined';
      scheduleSave();
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!accept) {
      reqObj.status = 'declined';
      fromUser.coins += reqObj.ringCost;
      scheduleSave();
      notifyUser(fromUser.id, 'user:updated', fromUser);
      notifyUser(fromUser.id, 'cp:updated', { userId: fromUser.id });
      notifyUser(toUser.id, 'cp:updated', { userId: toUser.id });
      notifyUser(fromUser.id, 'error:toast', {
        message: `${toUser.name} declined your CP proposal. ${reqObj.ringCost.toLocaleString()} Coins refunded.`,
      });
      return res.json({ accepted: false, user: toUser });
    }

    if (fromUser.cpPartnerId || toUser.cpPartnerId) {
      reqObj.status = 'declined';
      fromUser.coins += reqObj.ringCost;
      scheduleSave();
      notifyUser(fromUser.id, 'user:updated', fromUser);
      return res.status(400).json({ error: 'One of the users is already in a CP partnership.' });
    }

    const now = Date.now();
    reqObj.status = 'accepted';
    fromUser.cpPartnerId = toUser.id;
    fromUser.cpPartnerName = toUser.name;
    fromUser.cpPartnerUid = toUser.uid;
    fromUser.cpPartnerAvatar = toUser.avatar;
    fromUser.cpLevel = 1;
    fromUser.cpHearts = 100;
    fromUser.cpSince = now;

    toUser.cpPartnerId = fromUser.id;
    toUser.cpPartnerName = fromUser.name;
    toUser.cpPartnerUid = fromUser.uid;
    toUser.cpPartnerAvatar = fromUser.avatar;
    toUser.cpLevel = 1;
    toUser.cpHearts = 100;
    toUser.cpSince = now;

    // Decline any other pending requests involving either partner and refund
    for (const other of db.cpRequests) {
      if (
        other.status === 'pending' &&
        (other.fromUserId === fromUser.id ||
          other.toUserId === fromUser.id ||
          other.fromUserId === toUser.id ||
          other.toUserId === toUser.id)
      ) {
        other.status = 'declined';
        const sender = db.users[other.fromUserId];
        if (sender) {
          sender.coins += other.ringCost;
          notifyUser(sender.id, 'user:updated', sender);
        }
      }
    }

    scheduleSave();
    notifyUser(fromUser.id, 'user:updated', fromUser);
    notifyUser(toUser.id, 'user:updated', toUser);
    notifyUser(fromUser.id, 'cp:updated', { userId: fromUser.id });
    notifyUser(toUser.id, 'cp:updated', { userId: toUser.id });
    broadcastAll('error:toast', {
      message: `💑 ${fromUser.name} & ${toUser.name} are now CP Partners!`,
    });
    return res.json({ accepted: true, user: toUser, partner: fromUser });
  });

  app.post('/api/cp/break', (req, res) => {
    const userId = String(req.body?.userId || '');
    const user = db.users[userId];
    if (!user || !user.cpPartnerId) {
      return res.status(400).json({ error: 'No active CP partnership.' });
    }
    const partner = db.users[user.cpPartnerId];
    const clearCp = (u: UserProfile) => {
      u.cpPartnerId = null;
      u.cpPartnerName = null;
      u.cpPartnerUid = null;
      u.cpPartnerAvatar = null;
      u.cpLevel = 0;
      u.cpHearts = 0;
      u.cpSince = null;
    };
    clearCp(user);
    if (partner) clearCp(partner);
    scheduleSave();
    notifyUser(user.id, 'user:updated', user);
    notifyUser(user.id, 'cp:updated', { userId: user.id });
    if (partner) {
      notifyUser(partner.id, 'user:updated', partner);
      notifyUser(partner.id, 'cp:updated', { userId: partner.id });
      notifyUser(partner.id, 'error:toast', {
        message: `${user.name} ended the CP partnership.`,
      });
    }
    return res.json({ user });
  });

  // HTTP + WebSocket Server
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const session: ClientSession = { ws, userId: null, roomId: null };
    clients.add(session);

    // Send immediate game snapshots
    sendJson(ws, 'rocket:state', getPublicRocketState());
    sendJson(ws, 'wheel:state', getPublicWheelState(null));
    sendJson(ws, 'fruit:state', getPublicFruitState(null));
    sendJson(ws, 'game:wins:history', recentGameWins);
    sendJson(ws, 'game:ranking:updated', getTopGameRankings());

    ws.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as { event: string; payload?: any };
        const { event, payload } = parsed;

        if (event === 'auth') {
          const userId = String(payload?.userId || '');
          if (db.users[userId]) {
            session.userId = userId;
            db.users[userId].isOnline = true;
            sendJson(ws, 'user:updated', db.users[userId]);
            sendJson(ws, 'wheel:state', getPublicWheelState(userId));
            sendJson(ws, 'fruit:state', getPublicFruitState(userId));
          }
          return;
        }

        if (event === 'room:join') {
          const roomId = String(payload?.roomId || '');
          const room = db.rooms[roomId];
          if (!room) return;
          if (session.roomId && session.roomId !== roomId && db.rooms[session.roomId]) {
            const prevRoom = db.rooms[session.roomId];
            prevRoom.onlineCount = Math.max(1, prevRoom.onlineCount - 1);
            broadcastRoom(prevRoom.id, 'room:state', prevRoom);
          }
          session.roomId = roomId;
          room.onlineCount += 1;
          const user = session.userId ? db.users[session.userId] : null;
          if (user) {
            const joinMsg: RoomChatMessage = {
              id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              roomId,
              type: 'system',
              userId: user.id,
              userName: user.name,
              userLevel: user.level,
              text: `${user.name} entered the room`,
              timestamp: Date.now(),
            };
            room.messages.push(joinMsg);
            if (room.messages.length > 80) room.messages.shift();
          }
          broadcastRoom(roomId, 'room:state', room);
          return;
        }

        if (event === 'room:leave') {
          const roomId = session.roomId;
          if (!roomId || !db.rooms[roomId]) return;
          const room = db.rooms[roomId];
          room.onlineCount = Math.max(1, room.onlineCount - 1);
          if (session.userId) {
            for (const seat of room.seats) {
              if (seat.userId === session.userId && seat.seatIndex !== 0) {
                seat.userId = null;
                seat.userUid = null;
                seat.userName = null;
                seat.userAvatar = null;
                seat.micOn = false;
                seat.speaking = false;
              }
            }
          }
          session.roomId = null;
          broadcastRoom(roomId, 'room:state', room);
          return;
        }

        if (event === 'room:seat:take') {
          const roomId = String(payload?.roomId || session.roomId || '');
          const seatIndex = Number(payload?.seatIndex);
          const room = db.rooms[roomId];
          const user = session.userId ? db.users[session.userId] : null;
          if (!room || !user || seatIndex < 0 || seatIndex >= 9) return;
          const targetSeat = room.seats[seatIndex];
          if (targetSeat.userId && targetSeat.userId !== user.id) return;

          // Clear user from any previous seat in this room
          for (const seat of room.seats) {
            if (seat.userId === user.id && seat.seatIndex !== seatIndex) {
              seat.userId = null;
              seat.userUid = null;
              seat.userName = null;
              seat.userAvatar = null;
              seat.micOn = false;
              seat.speaking = false;
            }
          }

          targetSeat.userId = user.id;
          targetSeat.userUid = user.uid;
          targetSeat.userName = user.name;
          targetSeat.userAvatar = user.avatar;
          targetSeat.userLevel = user.level;
          targetSeat.micOn = Boolean(payload?.micOn ?? true);
          targetSeat.speaking = false;
          scheduleSave();
          broadcastRoom(roomId, 'room:state', room);
          return;
        }

        if (event === 'room:seat:leave') {
          const roomId = String(payload?.roomId || session.roomId || '');
          const room = db.rooms[roomId];
          if (!room || !session.userId) return;
          for (const seat of room.seats) {
            if (seat.userId === session.userId) {
              seat.userId = null;
              seat.userUid = null;
              seat.userName = null;
              seat.userAvatar = null;
              seat.micOn = false;
              seat.speaking = false;
            }
          }
          scheduleSave();
          broadcastRoom(roomId, 'room:state', room);
          return;
        }

        if (event === 'room:seat:mic') {
          const roomId = String(payload?.roomId || session.roomId || '');
          const micOn = Boolean(payload?.micOn);
          const room = db.rooms[roomId];
          if (!room || !session.userId) return;
          for (const seat of room.seats) {
            if (seat.userId === session.userId) {
              seat.micOn = micOn;
              if (!micOn) seat.speaking = false;
            }
          }
          broadcastRoom(roomId, 'room:state', room);
          return;
        }

        if (event === 'room:seat:speaking') {
          const roomId = String(payload?.roomId || session.roomId || '');
          const speaking = Boolean(payload?.speaking);
          const room = db.rooms[roomId];
          if (!room || !session.userId) return;
          for (const seat of room.seats) {
            if (seat.userId === session.userId) {
              seat.speaking = seat.micOn ? speaking : false;
            }
          }
          broadcastRoom(roomId, 'room:state', room);
          return;
        }

        if (event === 'room:chat') {
          const roomId = String(payload?.roomId || session.roomId || '');
          const text = String(payload?.text || '').trim();
          const room = db.rooms[roomId];
          const user = session.userId ? db.users[session.userId] : null;
          if (!room || !user || !text) return;

          const msg: RoomChatMessage = {
            id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            roomId,
            type: 'text',
            userId: user.id,
            userName: user.name,
            userLevel: user.level,
            text: text.slice(0, 280),
            timestamp: Date.now(),
          };
          room.messages.push(msg);
          if (room.messages.length > 80) room.messages.shift();
          scheduleSave();
          broadcastRoom(roomId, 'room:chat:new', msg);
          return;
        }

        if (event === 'room:gift') {
          const roomId = String(payload?.roomId || session.roomId || '');
          const giftId = String(payload?.giftId || '');
          const targetSeatIndex = Number(payload?.targetSeatIndex ?? 0);
          const quantity = Math.max(1, Math.min(99, Number(payload?.quantity || 1)));
          const room = db.rooms[roomId];
          const sender = session.userId ? db.users[session.userId] : null;
          const gift = GIFT_CATALOG.find((g) => g.id === giftId);
          if (!room || !sender || !gift) return;

          const totalCost = gift.price * quantity;
          if (gift.currency === 'coins') {
            if (sender.coins < totalCost) {
              sendJson(ws, 'error:toast', { message: 'Not enough Coins for this gift.' });
              return;
            }
            sender.coins -= totalCost;
          } else {
            if (sender.diamonds < totalCost) {
              sendJson(ws, 'error:toast', { message: 'Not enough Diamonds for this gift.' });
              return;
            }
            sender.diamonds -= totalCost;
          }

          sender.giftsSent += quantity;
          sender.xp += Math.max(10, Math.floor(totalCost / 20));
          sender.level = calculateLevel(sender.xp);

          const targetSeat = room.seats[targetSeatIndex] || room.seats[0];
          const targetName = targetSeat?.userName || room.hostName;
          if (targetSeat && targetSeat.userId) {
            targetSeat.hearts += gift.currency === 'diamonds' ? totalCost * 10 : Math.max(1, Math.floor(totalCost / 10));
            const recipient = db.users[targetSeat.userId];
            if (recipient) {
              recipient.giftsReceived += quantity;
              recipient.coins += gift.currency === 'coins' ? Math.floor(totalCost * 0.4) : totalCost * 8;

              // Boost CP Hearts if gifting CP Partner
              if (sender.cpPartnerId === recipient.id && recipient.cpPartnerId === sender.id) {
                const heartGain = Math.max(10, Math.floor(totalCost / 10));
                const nextHearts = (sender.cpHearts || 100) + heartGain;
                const nextCpLevel = Math.max(1, Math.floor(nextHearts / 500) + 1);
                sender.cpHearts = nextHearts;
                sender.cpLevel = nextCpLevel;
                recipient.cpHearts = nextHearts;
                recipient.cpLevel = nextCpLevel;
              }

              notifyUser(recipient.id, 'user:updated', recipient);
            }
          }

          // Lucky Gift Multiplier Roll
          let luckyMultiplier: number | undefined;
          let luckyRebate: number | undefined;
          if (gift.tier === 'lucky') {
            const maxMult = gift.luckyMaxMultiplier || 50;
            const roll = Math.random();
            if (roll < 0.44) luckyMultiplier = 0;
            else if (roll < 0.70) luckyMultiplier = 1;
            else if (roll < 0.85) luckyMultiplier = 2;
            else if (roll < 0.94) luckyMultiplier = 5;
            else if (roll < 0.98) luckyMultiplier = 10;
            else if (roll < 0.995) luckyMultiplier = Math.min(50, maxMult);
            else luckyMultiplier = maxMult;

            luckyRebate = totalCost * luckyMultiplier;
            if (luckyRebate > 0) {
              sender.coins += luckyRebate;
            }
          }

          const launch: GiftLaunchEvent = {
            id: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            roomId,
            senderId: sender.id,
            senderName: sender.name,
            senderLevel: sender.level,
            targetName,
            giftId: gift.id,
            giftName: gift.name,
            giftEmoji: gift.emoji,
            quantity,
            currency: gift.currency,
            totalCost,
            luckyMultiplier,
            luckyRebate,
            timestamp: Date.now(),
          };

          const luckyTextSuffix =
            gift.tier === 'lucky' && luckyRebate && luckyRebate > 0
              ? ` · 🍀 LUCKY ×${luckyMultiplier} (+${luckyRebate.toLocaleString()} Coins back!)`
              : '';

          const giftMsg: RoomChatMessage = {
            id: `gmsg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            roomId,
            type: 'gift',
            userId: sender.id,
            userName: sender.name,
            userLevel: sender.level,
            text: `sent ${gift.name} ×${quantity} to ${targetName}${luckyTextSuffix}`,
            giftName: gift.name,
            giftEmoji: gift.emoji,
            targetUserName: targetName,
            timestamp: Date.now(),
          };
          room.messages.push(giftMsg);
          if (room.messages.length > 80) room.messages.shift();

          scheduleSave();
          notifyUser(sender.id, 'user:updated', sender);
          if (gift.tier === 'lucky' && luckyRebate && luckyRebate > 0) {
            notifyUser(sender.id, 'error:toast', {
              message: `🍀 Lucky Gift ×${luckyMultiplier}! +${luckyRebate.toLocaleString()} Coins won!`,
            });
          }
          broadcastRoom(roomId, 'room:gift:launch', launch);
          broadcastRoom(roomId, 'room:chat:new', giftMsg);
          broadcastRoom(roomId, 'room:state', room);
          return;
        }

        // Rocket Game Bet
        if (event === 'rocket:bet') {
          const user = session.userId ? db.users[session.userId] : null;
          const amount = Math.floor(Number(payload?.amount || 0));
          const autoCashout = payload?.autoCashout ? Number(payload.autoCashout) : null;
          if (!user || amount <= 0) return;

          if (rocketPhase !== 'COUNTDOWN') {
            sendJson(ws, 'error:toast', { message: 'Wait for the countdown to place fuel!' });
            return;
          }
          if (user.coins < amount) {
            sendJson(ws, 'error:toast', { message: 'Insufficient Coins for this bet.' });
            return;
          }
          if (rocketBets.some((b) => b.userId === user.id)) {
            // Top up existing bet
            const existing = rocketBets.find((b) => b.userId === user.id)!;
            user.coins -= amount;
            existing.amount += amount;
            existing.autoCashout = autoCashout;
            existing.userAvatar = user.avatar;
            existing.userUid = user.uid;
          } else {
            user.coins -= amount;
            rocketBets.unshift({
              userId: user.id,
              userUid: user.uid,
              userName: user.name,
              userAvatar: user.avatar,
              amount,
              autoCashout,
              cashedOutAt: null,
              payout: 0,
            });
          }
          scheduleSave();
          notifyUser(user.id, 'user:updated', user);
          broadcastAll('rocket:state', getPublicRocketState());
          return;
        }

        // Rocket Cashout
        if (event === 'rocket:cashout') {
          const user = session.userId ? db.users[session.userId] : null;
          if (!user || rocketPhase !== 'FLYING') return;
          const bet = rocketBets.find((b) => b.userId === user.id && !b.cashedOutAt);
          if (!bet) return;
          bet.cashedOutAt = rocketMultiplier;
          bet.payout = Math.floor(bet.amount * rocketMultiplier);
          user.coins += bet.payout;
          user.xp += 15;
          user.level = calculateLevel(user.xp);
          scheduleSave();
          notifyUser(user.id, 'user:updated', user);
          emitGameWin({
            game: 'rocket',
            roundId: rocketRoundId,
            user,
            stake: bet.amount,
            payout: bet.payout,
            multiplier: rocketMultiplier,
            targetLabel: `${rocketMultiplier.toFixed(2)}x`,
          });
          broadcastAll('rocket:state', getPublicRocketState());
          return;
        }

        // Lucky Wheel Bet (Max 4 distinct emblems per round)
        if (event === 'wheel:bet') {
          const user = session.userId ? db.users[session.userId] : null;
          const emblem = payload?.emblem as WheelEmblem;
          const amount = Math.floor(Number(payload?.amount || 0));
          if (!user || !emblem || amount <= 0) return;
          if (wheelPhase !== 'BETTING') {
            sendJson(ws, 'error:toast', { message: 'Betting is closed for this spin.' });
            return;
          }
          const existing = wheelBetsByUser.get(user.id) || {};
          const activeEmblems = Object.entries(existing)
            .filter(([, amt]) => (amt || 0) > 0)
            .map(([k]) => k);
          if (!existing[emblem] && activeEmblems.length >= 4) {
            sendJson(ws, 'error:toast', {
              message: 'Maximum 4 bets allowed per round on Luxury Wheel.',
            });
            return;
          }
          if (user.coins < amount) {
            sendJson(ws, 'error:toast', { message: 'Insufficient Coins.' });
            return;
          }
          user.coins -= amount;
          existing[emblem] = (existing[emblem] || 0) + amount;
          wheelBetsByUser.set(user.id, existing);
          scheduleSave();
          notifyUser(user.id, 'user:updated', user);
          broadcastWheelState();
          return;
        }

        // Fruit Party Bet
        if (event === 'fruit:bet') {
          const user = session.userId ? db.users[session.userId] : null;
          const fruit = payload?.fruit as FruitId;
          const amount = Math.floor(Number(payload?.amount || 0));
          if (!user || !fruit || amount <= 0) return;
          if (fruitPhase !== 'BETTING') {
            sendJson(ws, 'error:toast', { message: 'Betting is closed for this Fruit spin.' });
            return;
          }
          if (user.coins < amount) {
            sendJson(ws, 'error:toast', { message: 'Insufficient Coins.' });
            return;
          }
          user.coins -= amount;
          const existing = fruitBetsByUser.get(user.id) || {};
          existing[fruit] = (existing[fruit] || 0) + amount;
          fruitBetsByUser.set(user.id, existing);
          scheduleSave();
          notifyUser(user.id, 'user:updated', user);
          broadcastFruitState();
          return;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      if (session.roomId && db.rooms[session.roomId]) {
        const room = db.rooms[session.roomId];
        room.onlineCount = Math.max(1, room.onlineCount - 1);
        if (session.userId) {
          for (const seat of room.seats) {
            if (seat.userId === session.userId && seat.seatIndex !== 0) {
              seat.userId = null;
              seat.userUid = null;
              seat.userName = null;
              seat.userAvatar = null;
              seat.micOn = false;
              seat.speaking = false;
            }
          }
        }
        broadcastRoom(room.id, 'room:state', room);
      }
      clients.delete(session);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Zariya server running at http://localhost:${PORT}`);
  });
}

startServer();
