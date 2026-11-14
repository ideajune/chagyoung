/**
 * HudController — 상단 음향 바, 음향 설정 믹서, 소원 연등 열람·작성 모달, 하단 3버튼 독, 호흡 명상 가이드, 풍경멍 모드 및 토스트 UI 전담 제어
 */

import { SPACE_META } from '../config/constants.js';

export class HudController {
  constructor({ wishStore, propsManager, cameraController, audioEngine }) {
    this.wishStore = wishStore;
    this.propsManager = propsManager;
    this.cameraController = cameraController;
    this.audioEngine = audioEngine;

    this.activeWishId = null;
    this.selectedLanternColor = 'amber';
    this.breathGuideTimer = null;
    this.toastTimeout = null;

    this.bindAudioControls();
    this.bindWishReaderControls();
    this.bindWriteModalControls();
    this.bindZenControls();

    this.sync3DLanterns();
  }

  bindWandererActions(wandererManager) {
    document
      .getElementById('spirit-bow-btn')
      ?.addEventListener('click', () => wandererManager.triggerGreeting());
    document
      .getElementById('spirit-stack-btn')
      ?.addEventListener('click', () => wandererManager.togglePosture());

    this.updatePostureButton(wandererManager.isMeditatingOrHeading);
  }

  updatePostureButton(isMeditatingOrHeading) {
    const stackBtn = document.getElementById('spirit-stack-btn');
    if (!stackBtn) return;

    stackBtn.classList.toggle('active', Boolean(isMeditatingOrHeading));
    const span = stackBtn.querySelector('span');
    if (span) {
      span.textContent = isMeditatingOrHeading ? '🎋 일어서기' : '🍵 명상하기';
    }
  }

  hasActiveWish() {
    return Boolean(this.activeWishId);
  }

  isWriteModalOpen() {
    return Boolean(document.getElementById('write-modal-backdrop')?.classList.contains('open'));
  }

  sync3DLanterns() {
    const wishes = this.wishStore.getWishes();
    const countEl = document.getElementById('count-buseoksa');
    if (countEl) {
      countEl.textContent = String(wishes.length);
    }
    this.propsManager.rebuild3DLanterns(wishes, this.activeWishId);
  }

  openWishReader(wishId) {
    const wish = this.wishStore.getWishById(wishId);
    if (!wish) return;

    this.activeWishId = wishId;
    this.sync3DLanterns();

    const worldPos = this.propsManager.getLanternWorldPos(wishId);
    if (worldPos) {
      this.cameraController.focusOnLantern(worldPos);
    }

    const meta = SPACE_META.buseoksa;
    const setElText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setElText('reader-location', meta.locationBadge);
    setElText('reader-tag', wish.tag || '소원 기원');
    setElText('reader-text', wish.text);
    setElText('reader-author', wish.author || '익명의 순례자');
    setElText('reader-date', wish.date || '2026.11.03');
    setElText('reader-hapjang-count', String(wish.hapjang));

    const hapjangBtn = document.getElementById('hapjang-btn');
    hapjangBtn?.classList.toggle('pressed', this.wishStore.isLiked(wish.id));

    document.getElementById('wish-reader-card')?.classList.add('open');
  }

  closeWishReader() {
    if (!this.activeWishId) return;
    this.activeWishId = null;
    document.getElementById('wish-reader-card')?.classList.remove('open');
    this.sync3DLanterns();
    this.cameraController.returnToFollow();
  }

  navigateWish(direction) {
    const spaceWishes = this.wishStore.getWishes();
    if (spaceWishes.length === 0) return;
    const idx = spaceWishes.findIndex((w) => w.id === this.activeWishId);
    const nextIdx = (idx + direction + spaceWishes.length) % spaceWishes.length;
    this.openWishReader(spaceWishes[nextIdx].id);
  }

  handleHapjangClick() {
    if (!this.activeWishId) return;
    const wish = this.wishStore.incrementHapjang(this.activeWishId);
    if (!wish) return;

    const countEl = document.getElementById('reader-hapjang-count');
    if (countEl) countEl.textContent = String(wish.hapjang);

    const btn = document.getElementById('hapjang-btn');
    if (btn) {
      btn.classList.remove('pressed');
      void btn.offsetWidth;
      btn.classList.add('pressed');
    }

    this.propsManager.spawnHapjangParticles3D(wish.id);
    this.showToast('🙏 따뜻한 합장의 마음이 3D 연등 불빛을 타고 하늘로 피어오릅니다.');
  }

  openWriteModal() {
    const meta = SPACE_META.buseoksa;
    const descEl = document.getElementById('write-modal-desc');
    if (descEl) descEl.textContent = meta.writeDesc;

    document.getElementById('write-modal-backdrop')?.classList.add('open');
    setTimeout(() => {
      document.getElementById('wish-input')?.focus();
    }, 140);
  }

  closeWriteModal() {
    document.getElementById('write-modal-backdrop')?.classList.remove('open');
  }

  handleWriteFormSubmit(e) {
    e.preventDefault();
    const textInput = document.getElementById('wish-input');
    const authorInput = document.getElementById('wish-author');
    const tagSelect = document.getElementById('wish-tag');

    const text = textInput?.value.trim();
    if (!text) return;

    const author = authorInput?.value.trim() || '산사 나그네';
    const tag = tagSelect?.value || '마음 평안';

    const newWish = this.wishStore.addWish({
      color: this.selectedLanternColor,
      author,
      tag,
      text
    });

    if (textInput) textInput.value = '';
    if (authorInput) authorInput.value = '';
    const counter = document.getElementById('char-counter');
    if (counter) counter.textContent = '0 / 90자';

    this.closeWriteModal();
    this.openWishReader(newWish.id);
    this.propsManager.spawnHapjangParticles3D(newWish.id);
    this.showToast('🏮 새로운 3D 소원 연등이 밝혀졌습니다!');
  }

  triggerBellRingInteraction() {
    this.audioEngine.strikeWindBell(0.95);
    this.propsManager.exciteWindBell();
    this.showToast('🔔 처마 끝 풍경종이 은은하게 울립니다.');
  }

  setMixerSliders(bell, water, wind) {
    const setSlider = (type, val) => {
      const slider = document.getElementById(`slider-${type}`);
      const valEl = document.getElementById(`val-${type}`);
      if (slider) slider.value = String(val);
      if (valEl) valEl.textContent = `${val}%`;
    };

    setSlider('bell', bell);
    setSlider('water', water);
    setSlider('wind', wind);

    this.audioEngine.bellLevel = bell / 100;
    this.audioEngine.waterLevel = water / 100;
    this.audioEngine.windLevel = wind / 100;
    this.audioEngine.updateContinuousVolumes();
  }

  bindAudioControls() {
    const audioMuteBtn = document.getElementById('audio-mute-btn');
    const audioSettingsBtn = document.getElementById('audio-settings-btn');
    const mixerPanel = document.getElementById('sound-mixer-panel');

    const syncAudioMuteUI = (playing) => {
      if (!audioMuteBtn) return;
      audioMuteBtn.classList.toggle('active-audio', playing);
      audioMuteBtn.classList.toggle('is-muted', !playing);
      audioMuteBtn.setAttribute('aria-pressed', String(playing));
      audioMuteBtn.setAttribute('aria-label', playing ? '소리 끄기' : '소리 켜기');
      audioMuteBtn.setAttribute('title', playing ? '소리 켜짐 (클릭 시 음소거)' : '소리 꺼짐 (클릭 시 켜기)');
    };

    const meta = SPACE_META.buseoksa;
    this.setMixerSliders(meta.defaultBellMix, meta.defaultWaterMix, meta.defaultWindMix);
    this.audioEngine.startDefaultPlayback();
    syncAudioMuteUI(this.audioEngine.isPlaying);

    audioMuteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const playing = this.audioEngine.toggle();
      syncAudioMuteUI(playing);
      if (playing) {
        this.propsManager.exciteWindBell();
      }
    });

    audioSettingsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = mixerPanel?.classList.toggle('open');
      audioSettingsBtn.setAttribute('aria-expanded', String(Boolean(isOpen)));
    });

    document.getElementById('close-mixer-btn')?.addEventListener('click', () => {
      mixerPanel?.classList.remove('open');
      audioSettingsBtn?.setAttribute('aria-expanded', 'false');
    });

    document
      .getElementById('manual-bell-btn')
      ?.addEventListener('click', () => this.triggerBellRingInteraction());

    ['bell', 'water', 'wind'].forEach((type) => {
      const slider = document.getElementById(`slider-${type}`);
      if (!slider) return;
      slider.addEventListener('input', () => {
        const val = Number(slider.value);
        const valEl = document.getElementById(`val-${type}`);
        if (valEl) valEl.textContent = `${val}%`;
        this.audioEngine[`${type}Level`] = val / 100;
        if (!this.audioEngine.isPlaying) {
          const playing = this.audioEngine.toggle();
          syncAudioMuteUI(playing);
        } else {
          this.audioEngine.updateContinuousVolumes();
        }
      });
    });
  }

  bindWishReaderControls() {
    document
      .getElementById('close-reader-btn')
      ?.addEventListener('click', () => this.closeWishReader());
    document
      .getElementById('prev-wish-btn')
      ?.addEventListener('click', () => this.navigateWish(-1));
    document
      .getElementById('next-wish-btn')
      ?.addEventListener('click', () => this.navigateWish(1));
    document
      .getElementById('hapjang-btn')
      ?.addEventListener('click', () => this.handleHapjangClick());
  }

  bindWriteModalControls() {
    document
      .getElementById('open-write-modal-btn')
      ?.addEventListener('click', () => this.openWriteModal());
    document
      .getElementById('close-write-modal-btn')
      ?.addEventListener('click', () => this.closeWriteModal());
    document.getElementById('write-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'write-modal-backdrop') this.closeWriteModal();
    });

    document.querySelectorAll('#lantern-color-picker .color-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedLanternColor = btn.dataset.color || 'amber';
        document
          .querySelectorAll('#lantern-color-picker .color-option')
          .forEach((b) => b.classList.toggle('selected', b === btn));
      });
    });

    const wishInput = document.getElementById('wish-input');
    wishInput?.addEventListener('input', () => {
      const counter = document.getElementById('char-counter');
      if (counter) counter.textContent = `${wishInput.value.length} / 90자`;
    });

    document
      .getElementById('write-lantern-form')
      ?.addEventListener('submit', (e) => this.handleWriteFormSubmit(e));
  }

  bindZenControls() {
    document
      .getElementById('zen-restore-btn')
      ?.addEventListener('click', () => this.toggleZenMode(false));
  }

  toggleZenMode(forceState) {
    const isZen =
      typeof forceState === 'boolean'
        ? forceState
        : !document.body.classList.contains('zen-mode');

    document.body.classList.toggle('zen-mode', isZen);
    if (isZen) {
      this.closeWishReader();
      document.getElementById('sound-mixer-panel')?.classList.remove('open');
      document.getElementById('audio-settings-btn')?.setAttribute('aria-expanded', 'false');
      this.showToast('풍경멍 모드입니다. 드래그로 3D 시선을 천천히 둘러보세요 (Esc로 복귀).');
    }
  }

  toggleBreathingGuide(forceState) {
    const guideEl = document.getElementById('breathing-guide');
    if (!guideEl) return;
    const textEl = document.getElementById('breath-text');

    const isActive =
      typeof forceState === 'boolean'
        ? (guideEl.classList.toggle('active', forceState), forceState)
        : guideEl.classList.toggle('active');

    if (this.breathGuideTimer) {
      clearTimeout(this.breathGuideTimer);
      this.breathGuideTimer = null;
    }

    if (isActive && textEl) {
      const prompts = [
        { text: '코끝으로 산사의 맑은 공기를 천천히 들이마십니다 (4초)', durationMs: 4000 },
        { text: '가슴 가득 고요함을 잠시 머금어 봅니다 (2초)', durationMs: 2000 },
        { text: '어깨의 긴장을 내려놓으며 길게 내쉽니다 (4초)', durationMs: 4000 }
      ];
      const maxCycles = 2; // 명상 시작 후 호흡 안내 멘트는 2회 사이클만 반복 후 자동 종료
      const totalSteps = prompts.length * maxCycles;
      let currentStep = 0;

      const advanceStep = () => {
        if (currentStep >= totalSteps) {
          this.breathGuideTimer = null;
          guideEl.classList.remove('active');
          return;
        }
        const item = prompts[currentStep % prompts.length];
        textEl.textContent = item.text;
        currentStep += 1;
        this.breathGuideTimer = setTimeout(advanceStep, item.durationMs);
      };

      advanceStep();
    }
  }

  showToast(message) {
    const banner = document.getElementById('toast-banner');
    if (!banner) return;
    banner.textContent = message;
    banner.classList.add('show');
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      banner.classList.remove('show');
    }, 3200);
  }

  handleEscape() {
    this.closeWriteModal();
    this.closeWishReader();
    document.getElementById('sound-mixer-panel')?.classList.remove('open');
    document.getElementById('audio-settings-btn')?.setAttribute('aria-expanded', 'false');
    if (document.body.classList.contains('zen-mode')) {
      this.toggleZenMode(false);
    }
  }
}
