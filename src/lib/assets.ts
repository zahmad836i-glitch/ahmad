import partyStageBackdrop from '../assets/images/party_stage_backdrop_1794711567297.jpg';
import avatarLuna from '../assets/images/avatar_host_luna_1794711567761.jpg';
import avatarKai from '../assets/images/avatar_user_kai_1794711568328.jpg';
import avatarZara from '../assets/images/avatar_user_zara_1794711567737.jpg';
import roomCoverChill from '../assets/images/room_cover_chill_1794711570072.jpg';
import gameFruitArena from '../assets/images/game_fruit_arena_1794718737493.jpg';
import gameWheelArena from '../assets/images/game_wheel_arena_1794718738410.jpg';
import gameRocketSpace from '../assets/images/game_rocket_space_1794718738564.jpg';

export const PRESET_AVATARS = [
  { key: 'preset:luna', label: 'Luna Studio', src: avatarLuna },
  { key: 'preset:kai', label: 'Kai Producer', src: avatarKai },
  { key: 'preset:zara', label: 'Zara Velvet', src: avatarZara },
];

export const STAGE_BACKDROP = partyStageBackdrop;
export const CHILL_COVER = roomCoverChill;
export const GAME_BACKDROPS = {
  fruit: gameFruitArena,
  wheel: gameWheelArena,
  rocket: gameRocketSpace,
};

const ASSET_MAP: Record<string, string> = {
  'preset:luna': avatarLuna,
  'preset:kai': avatarKai,
  'preset:zara': avatarZara,
  'preset:stage': partyStageBackdrop,
  'preset:chill': roomCoverChill,
};

export function resolveAsset(key?: string | null): string {
  if (!key) return avatarLuna;
  if (ASSET_MAP[key]) return ASSET_MAP[key];
  if (key.startsWith('data:') || key.startsWith('http') || key.startsWith('/')) {
    return key;
  }
  return avatarLuna;
}
