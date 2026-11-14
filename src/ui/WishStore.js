/**
 * WishStore — 소원 연등 목록 및 합장 기록 localStorage 저장소
 */

import { STORAGE_KEYS, INITIAL_WISHES } from '../config/constants.js';

export class WishStore {
  constructor() {
    this.wishes = this.loadWishes();
    this.likedWishIds = this.loadLikedWishes();
  }

  loadWishes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WISHES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((w) => !w.space || w.space === 'buseoksa');
          if (filtered.length > 0) {
            // 기존 저장 데이터(사용자 작성 연등 및 합장 수)를 보존하면서 기본 시드 연등(bs-1..bs-16)의 명칭·문구 최신화 및 병합
            const seedMap = new Map(INITIAL_WISHES.map((s) => [s.id, s]));
            let updatedAny = false;
            const refreshed = filtered.map((w) => {
              const seed = seedMap.get(w.id);
              if (seed && (w.author !== seed.author || w.text !== seed.text)) {
                updatedAny = true;
                return { ...w, author: seed.author, text: seed.text };
              }
              return w;
            });

            const existingIds = new Set(refreshed.map((w) => w.id));
            const mergedDefaults = [];
            for (const seed of INITIAL_WISHES) {
              if (!existingIds.has(seed.id)) {
                mergedDefaults.push({ ...seed });
              }
            }
            if (mergedDefaults.length > 0 || updatedAny) {
              const userCustom = refreshed.filter((w) => !String(w.id).startsWith('bs-'));
              const savedSeeds = refreshed.filter((w) => String(w.id).startsWith('bs-'));
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
    return this.wishes.filter((w) => !w.space || w.space === 'buseoksa');
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

    const newWish = {
      id: `wish-${Date.now()}`,
      space: 'buseoksa',
      color: color || 'amber',
      author: author || '산사 나그네',
      tag: tag || '마음 평안',
      text,
      date: dateStr,
      hapjang: 1
    };

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
}
