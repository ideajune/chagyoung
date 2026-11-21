/**
 * HudController — 상단 산방 현황 표시·음향 바, 음향 설정 믹서, 소원 연등 열람·작성 모달, 하단 3버튼 독, 호흡 명상 가이드, 풍경멍 모드 및 토스트 UI 전담 제어
 */

import { SPACE_META } from '../config/constants.js';

export class HudController {
  constructor({ wishStore, propsManager, cameraController, audioEngine }) {
    this.wishStore = wishStore;
    this.propsManager = propsManager;
    this.cameraController = cameraController;
    this.audioEngine = audioEngine;

    this.wandererManager = null;
    this.multiplayerClient = null;

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

  setMultiplayerClient(client) {
    this.multiplayerClient = client;
    if (client) {
      this.updateRoomStatusUI(client.getRoomInfo());
    }
  }

  bindWandererActions(wandererManager) {
    this.wandererManager = wandererManager;

    document
      .getElementById('spirit-bow-btn')
      ?.addEventListener('click', () => wandererManager.triggerGreeting());
    document
      .getElementById('spirit-stack-btn')
      ?.addEventListener('click', () => wandererManager.togglePosture());

    this.updatePostureButton(wandererManager.isMeditatingOrHeading);
  }

  updateRoomStatusUI(roomInfo) {
    if (!roomInfo) return;

    const nameEl = document.getElementById('room-status-name');
    const countEl = document.getElementById('room-status-count');
    const dotEl = document.getElementById('room-live-dot');

    if (nameEl) nameEl.textContent = `청풍명월 제 ${roomInfo.roomId}산방`;
    if (countEl) countEl.textContent = `${roomInfo.visitorCount} / ${roomInfo.maxCapacity}명`;
    if (dotEl) {
      dotEl.classList.toggle('is-local', roomInfo.transportMode === 'local-channel');
    }
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

    this.multiplayerClient?.publishWishHapjang(wish.id, wish.hapjang);
    this.propsManager.spawnHapjangParticles3D(wish.id);
    this.showToast('🙏 따뜻한 합장의 마음이 3D 연등 불빛을 타고 하늘로 피어오릅니다.');
  }

  openWriteModal() {
    const meta = SPACE_META.buseoksa;
    const descEl = document.getElementById('write-modal-desc');
    if (descEl) descEl.textContent = meta.writeDesc;

    const authorInput = document.getElementById('wish-author');
    if (authorInput && this.wandererManager?.profile?.name) {
      authorInput.placeholder = this.wandererManager.profile.name;
    }

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

    const defaultAuthor = this.wandererManager?.profile?.name || '산사 나그네';
    const author = authorInput?.value.trim() || defaultAuthor;
    const tag = tagSelect?.value || '마음 평안';

    const newWish = this.wishStore.addWish({
      color: this.selectedLanternColor,
      author,
      tag,
      text
    });

    this.multiplayerClient?.publishWishAdded(newWish);

    if (textInput) textInput.value = '';
    if (authorInput) authorInput.value = '';
    const counter = document.getElementById('char-counter');
    if (counter) counter.textContent = '0 / 90자';

    this.closeWriteModal();
    this.openWishReader(newWish.id);
    this.propsManager.spawnHapjangParticles3D(newWish.id);
    this.showToast('🏮 새로운 3D 소원 연등이 밝혀졌습니다!');
  }

  handleRemoteWishesSync(remoteWishes) {
    if (this.wishStore.syncFromServer(remoteWishes)) {
      this.sync3DLanterns();
    }
  }

  handleRemoteWishAdded(wish) {
    const added = this.wishStore.applyRemoteWishAdded(wish);
    if (!added) return;
    this.sync3DLanterns();
    this.propsManager.spawnHapjangParticles3D(added.id);
    this.showToast(`🏮 '${added.author}'님이 차경루 처마에 새 소원 연등을 걸었습니다.`);
  }

  handleRemoteWishHapjang(wishId, hapjangCount) {
    const updated = this.wishStore.applyRemoteHapjang(wishId, hapjangCount);
    if (!updated) return;
    if (this.activeWishId === wishId) {
      const countEl = document.getElementById('reader-hapjang-count');
      if (countEl) countEl.textContent = String(updated.hapjang);
    }
    this.propsManager.spawnHapjangParticles3D(wishId);
  }

  triggerBellRingInteraction({ fromRemote = false } = {}) {
    this.audioEngine.strikeWindBell(fromRemote ? 0.72 : 0.95);
    this.propsManager.exciteWindBell();
    if (!fromRemote) {
      this.multiplayerClient?.sendAction('bell', {});
      this.showToast('🔔 처마 끝 풍경종이 은은하게 울립니다.');
    }
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

    ['water', 'wind'].forEach((type) => {
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
    const orbEl = guideEl.querySelector('.breath-orb');

    const isActive =
      typeof forceState === 'boolean'
        ? (guideEl.classList.toggle('active', forceState), forceState)
        : guideEl.classList.toggle('active');

    if (this.breathGuideTimer) {
      clearTimeout(this.breathGuideTimer);
      this.breathGuideTimer = null;
    }
    if (this.breathGuideRaf) {
      cancelAnimationFrame(this.breathGuideRaf);
      this.breathGuideRaf = null;
    }

    if (isActive && textEl) {
      // 호흡 오브 CSS 애니메이션(10초 주기: 4초 들숨 / 2초 멈춤 / 4초 날숨)을 0초 지점에서 정확히 재시작
      if (orbEl) {
        orbEl.style.animation = 'none';
        void orbEl.offsetWidth;
        orbEl.style.animation = '';
      }

      const phases = [
        { label: '코끝으로 산사의 맑은 공기를 천천히 들이마십니다', durationSec: 4 },
        { label: '가슴 가득 고요함을 잠시 머금어 봅니다', durationSec: 2 },
        { label: '어깨의 긴장을 내려놓으며 길게 내쉽니다', durationSec: 4 }
      ];
      const cycleDurationSec = phases.reduce((sum, p) => sum + p.durationSec, 0); // 10초
      const maxCycles = 2; // 총 20초 (2회 사이클)
      const totalDurationMs = cycleDurationSec * maxCycles * 1000;
      const startTime = performance.now();
      let lastRenderedText = '';

      const updateBreathingText = (now) => {
        const elapsedMs = now - startTime;
        if (elapsedMs >= totalDurationMs) {
          this.breathGuideRaf = null;
          guideEl.classList.remove('active');
          return;
        }

        const inCycleSec = (elapsedMs * 0.001) % cycleDurationSec;
        let acc = 0;
        let activePhase = phases[phases.length - 1];
        let phaseRemainingSec = 1;

        for (const phase of phases) {
          if (inCycleSec < acc + phase.durationSec) {
            activePhase = phase;
            phaseRemainingSec = Math.max(1, Math.ceil(acc + phase.durationSec - inCycleSec));
            break;
          }
          acc += phase.durationSec;
        }

        const nextText = `${activePhase.label} (${phaseRemainingSec}초)`;
        if (nextText !== lastRenderedText) {
          textEl.textContent = nextText;
          lastRenderedText = nextText;
        }

        this.breathGuideRaf = requestAnimationFrame(updateBreathingText);
      };

      updateBreathingText(startTime);
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
