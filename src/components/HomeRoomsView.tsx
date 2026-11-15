import React, { useState } from 'react';
import { Search, Plus, Users, Mic, X } from 'lucide-react';
import { PartyRoom, RoomCategory, UserProfile } from '../types';
import { resolveAsset } from '../lib/assets';
import { isZeeshanUser, getUserNameClass } from '../lib/userStyle';

interface HomeRoomsViewProps {
  rooms: PartyRoom[];
  currentUser: UserProfile;
  onJoinRoom: (room: PartyRoom) => void;
  onCreateRoom: (payload: { title: string; topic: string; category: RoomCategory }) => Promise<void>;
}

const CATEGORIES: Array<'All' | RoomCategory> = ['All', 'Popular', 'New', 'Friendship Party'];

export const HomeRoomsView: React.FC<HomeRoomsViewProps> = ({
  rooms,
  onJoinRoom,
  onCreateRoom,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | RoomCategory>('All');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newCategory, setNewCategory] = useState<RoomCategory>('Friendship Party');
  const [creating, setCreating] = useState(false);

  const filteredRooms = rooms
    .filter((r) => {
      const matchesCat = selectedCategory === 'All' || r.category === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchesQuery =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.topic.toLowerCase().includes(q) ||
        r.id.includes(q) ||
        r.hostName.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    })
    .sort((a, b) => {
      const aTop = isZeeshanUser(a.hostName) ? 1 : 0;
      const bTop = isZeeshanUser(b.hostName) ? 1 : 0;
      return bTop - aTop;
    });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await onCreateRoom({
        title: newTitle.trim(),
        topic: newTopic.trim() || 'Open Voice Lounge',
        category: newCategory,
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewTopic('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Party Rooms
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Live 9-seat audio rooms · Tap any room to take a mic or play Rocket
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room title or ID..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#161124] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0C0914] font-semibold text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Room</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-amber-500 text-[#0C0914]'
                  : 'bg-[#161124] text-slate-300 hover:text-white border border-white/10'
              }`}
            >
              {cat === 'All' ? 'All Rooms' : cat}
            </button>
          );
        })}
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-[#161124] p-10 sm:p-14 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto">
            <Mic className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <p className="font-display text-lg font-bold text-white">
              {rooms.length === 0 ? 'No active party rooms yet' : 'No matching party rooms'}
            </p>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {rooms.length === 0
                ? 'Rooms only appear when someone creates a live party room. Tap below to open your 9-seat stage.'
                : 'Try switching categories or create a new 9-seat room right now.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0C0914] font-semibold text-sm inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Room</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredRooms.map((room) => {
            const occupiedSeats = room.seats.filter((s) => s.userId !== null);
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => onJoinRoom(room)}
                className="group text-left rounded-2xl overflow-hidden bg-[#161124] border border-white/10 hover:border-amber-400/50 transition-all flex flex-col"
              >
                <div className="relative h-44 w-full overflow-hidden">
                  <img
                    src={resolveAsset(room.coverImage)}
                    alt={room.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#161124] via-[#161124]/45 to-transparent" />

                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={resolveAsset(room.hostAvatar)}
                        alt={room.hostName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover border-2 border-amber-400/80 shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-bold text-white truncate">
                          {room.title}
                        </h3>
                        <p className="text-xs text-slate-300 truncate">
                          Host:{' '}
                          <span className={getUserNameClass(room.hostName, undefined, 'text-slate-300')}>
                            {room.hostName}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-mono-nums font-semibold text-amber-300 shrink-0">
                      <Users className="w-3.5 h-3.5" />
                      <span>{room.onlineCount}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-amber-300 font-medium">{room.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-nums">ID: {room.id}</span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-1">{room.topic}</p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center -space-x-2">
                      {occupiedSeats.slice(0, 5).map((seat) => (
                        <img
                          key={seat.seatIndex}
                          src={resolveAsset(seat.userAvatar)}
                          alt={seat.userName || 'Speaker'}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover border-2 border-[#161124]"
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono-nums">{occupiedSeats.length}/9</span> seats
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#161124] border border-white/15 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Launch a Voice Room</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Room Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Late Night Chill & Rocket"
                  className="w-full h-11 px-4 rounded-xl bg-[#0C0914] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Topic / Welcome Note
                </label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Music, friendship, or mini-games"
                  className="w-full h-11 px-4 rounded-xl bg-[#0C0914] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Room Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Popular', 'New', 'Friendship Party'] as RoomCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        newCategory === cat
                          ? 'bg-amber-500 text-[#0C0914] border-amber-500'
                          : 'bg-[#0C0914] text-slate-300 border-white/10 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0C0914] font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating Room...' : 'Start 9-Seat Party Room'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
