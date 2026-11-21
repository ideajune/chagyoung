/**
 * WishStore — 소원 연등 목록 및 합장 기록 localStorage 저장소
 */

import { STORAGE_KEYS, INITIAL_WISHES } from '../config/constants.js';

const LEGACY_KEYS = [
  'chakyeong_3d_wishes_v1',
  'chakyeong_3d_wishes_v2',
  'chakyeong_3d_hapjang_v1',
  'chakyeong_3d_hapjang_v2'
];

function sanitizeTempleTerms(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/영주\s*부석사/g, '청풍사')
    .replace(/부석사/g, '청풍사')
    .replace(/무량수전/g, '청풍사')
    .replace(/무량한/g, '맑은')
    .replace(/안양루/g, '차경루')
    .replace(/안양문/g, '차경루')
    .replace(/소백산맥/g, '운해 능선')
    .replace(/소백산/g, '운해 능선');
}

function sanitizeWishItem(wish) {
  if (!wish || typeof wish !== 'object') return wish;
  return {
    ...wish,
    space: 'cheongpungsa',
    author: sanitizeTempleTerms(wish.author),
    tag: sanitizeTempleTerms(wish.tag),
    text: sanitizeTempleTerms(wish.text)
  };
}

export class WishStore {
  constructor() {
    this.purgeLegacyStorage();
    this.wishes = this.loadWishes();
    this.likedWishIds = this.loadLikedWishes();
  }

  purgeLegacyStorage() {
    try {
      for (const key of LEGACY_KEYS) {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore storage errors
    }
  }

  loadWishes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WISHES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(
            (w) => !w.space || w.space === 'cheongpungsa' || w.space === 'buseoksa'
          );
          if (filtered.length > 0) {
            const seedMap = new Map(INITIAL_WISHES.map((s) => [s.id, s]));
            let updatedAny = false;

            const refreshed = filtered.map((w) => {
              const seed = seedMap.get(w.id);
              if (seed) {
                if (w.author !== seed.author || w.text !== seed.text || w.space !== 'cheongpungsa') {
                  updatedAny = true;
                  return { ...w, space: 'cheongpungsa', author: seed.author, text: seed.text };
                }
                return w;
              }
              const cleaned = sanitizeWishItem(w);
              if (
                cleaned.author !== w.author ||
                cleaned.text !== w.text ||
                cleaned.tag !== w.tag ||
                cleaned.space !== w.space
              ) {
                updatedAny = true;
              }
              return cleaned;
            });

            const existingIds = new Set(refreshed.map((w) => w.id));
            const mergedDefaults = [];
            for (const seed of INITIAL_WISHES) {
              if (!existingIds.has(seed.id)) {
                mergedDefaults.push({ ...seed });
              }
            }
            if (mergedDefaults.length > 0 || updatedAny) {
              const userCustom = refreshed.filter((w) => !String(w.id).startsWith('cp-'));
              const savedSeeds = refreshed.filter((w) => String(w.id).startsWith('cp-'));
              const combined = [...savedSeeds, ...mergedDefaults, ...userCustom];
              try {
                localStorage.setItem(STORAGE_KEYS.WISHES, JSON.stringify(combined));
              } catch {
                // ignore storage write errors
              }
              return combined;
            }
            return refreshed;
          }
        }
      }
    } catch (err) {
      console.warn('LocalStorage fallback:', err);
    }
    return INITIAL_WISHES.map((w) => ({ ...w }));
  }

  saveWishes() {
    try {
      localStorage.setItem(STORAGE_KEYS.WISHES, JSON.stringify(this.wishes));
    } catch {
      // ignore storage quota / privacy mode errors
    }
  }

  loadLikedWishes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HAPJANG);
      if (raw) return new Set(JSON.parse(raw));
    } catch {
      // ignore
    }
    return new Set();
  }

  saveLikedWishes() {
    try {
      localStorage.setItem(STORAGE_KEYS.HAPJANG, JSON.stringify([...this.likedWishIds]));
    } catch {
      // ignore
    }
  }

  getWishes() {
    return this.wishes.filter(
      (w) => !w.space || w.space === 'cheongpungsa' || w.space === 'buseoksa'
    );
  }

  getWishById(wishId) {
    return this.wishes.find((w) => w.id === wishId) || null;
  }

  isLiked(wishId) {
    return this.likedWishIds.has(wishId);
  }

  addWish({ color, author, tag, text }) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
      now.getDate()
    ).padStart(2, '0')}`;

    const newWish = sanitizeWishItem({
      id: `wish-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      space: 'cheongpungsa',
      color: color || 'amber',
      author: author || '산사 나그네',
      tag: tag || '마음 평안',
      text,
      date: dateStr,
      hapjang: 1
    });

    this.wishes.push(newWish);
    this.saveWishes();
    return newWish;
  }

  incrementHapjang(wishId) {
    const wish = this.getWishById(wishId);
    if (!wish) return null;

    wish.hapjang += 1;
    this.likedWishIds.add(wish.id);
    this.saveWishes();
    this.saveLikedWishes();
    return wish;
  }

  syncFromServer(remoteWishes) {
    if (!Array.isArray(remoteWishes) || remoteWishes.length === 0) return false;

    const mergedMap = new Map();
    for (const item of remoteWishes) {
      if (!item || !item.id) continue;
      mergedMap.set(item.id, sanitizeWishItem({ ...item }));
    }

    // 로컬에만 있던 사용자 작성 소원이 있다면 유실되지 않도록 병합
    for (const localWish of this.wishes) {
      if (!localWish || !localWish.id) continue;
      if (mergedMap.has(localWish.id)) {
        const remoteItem = mergedMap.get(localWish.id);
        remoteItem.hapjang = Math.max(
          Number(remoteItem.hapjang) || 1,
          Number(localWish.hapjang) || 1
        );
      } else if (!String(localWish.id).startsWith('cp-')) {
        mergedMap.set(localWish.id, sanitizeWishItem({ ...localWish }));
      }
    }

    this.wishes = [...mergedMap.values()];
    this.saveWishes();
    return true;
  }

  applyRemoteWishAdded(wish) {
    if (!wish || typeof wish !== 'object' || !wish.id) return null;
    if (this.getWishById(wish.id)) return null;

    const cleaned = sanitizeWishItem({
      ...wish,
      hapjang: Math.max(1, Number(wish.hapjang) || 1)
    });
    this.wishes.push(cleaned);
    this.saveWishes();
    return cleaned;
  }

  applyRemoteHapjang(wishId, hapjangCount) {
    const wish = this.getWishById(wishId);
    if (!wish) return null;

    const nextCount = Number(hapjangCount);
    wish.hapjang = Number.isFinite(nextCount)
      ? Math.max(wish.hapjang, nextCount)
      : wish.hapjang + 1;
    this.saveWishes();
    return wish;
  }
}
