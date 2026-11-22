/**
 * PlayerProfileStore — 로컬 나그네 닉네임 및 도포 팔레트 영속 저장소
 */

import {
  STORAGE_KEYS,
  WANDERER_PALETTES,
  WANDERER_POETIC_NAMES
} from '../config/constants.js';

export function loadWandererProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.WANDERER_PROFILE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        parsed &&
        typeof parsed.name === 'string' &&
        WANDERER_POETIC_NAMES.includes(parsed.name) &&
        typeof parsed.paletteIdx === 'number'
      ) {
        return {
          name: parsed.name,
          paletteIdx: parsed.v2Palette ? Math.abs(parsed.paletteIdx) % WANDERER_PALETTES.length : 0,
          v2Palette: true
        };
      }
    }
  } catch {
    // localStorage 접근 불가 시 폴백
  }

  const randomIdx = Math.floor(Math.random() * WANDERER_POETIC_NAMES.length);
  const initial = {
    name: WANDERER_POETIC_NAMES[randomIdx],
    paletteIdx: 0, // 기본 연옥빛 풍류 도포(시안 1)
    v2Palette: true
  };
  saveWandererProfile(initial);
  return initial;
}

export function saveWandererProfile(profile) {
  try {
    const payload = { ...profile, v2Palette: true };
    localStorage.setItem(STORAGE_KEYS.WANDERER_PROFILE, JSON.stringify(payload));
  } catch {
    // ignore
  }
}
