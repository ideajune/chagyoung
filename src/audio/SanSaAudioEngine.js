/**
 * SanSaAudioEngine — 범종·풍경종(templebell.wav 50% 구간 재생 및 60초 반복) + 계곡 여울물·산바람·산새 소리 Web Audio 합성 엔진
 */

export class SanSaAudioEngine {
  constructor({ onBellStrike } = {}) {
    this.onBellStrike = onBellStrike || null;

    this.ctx = null;
    this.isPlaying = true;
    this.bellLevel = 0.50;
    this.waterLevel = 0.50;
    this.windLevel = 0.50;

    this.waterGain = null;
    this.windGain = null;
    this.masterGain = null;
    this.autoBellTimer = null;
    this.birdSongTimer = null;

    // 추후 경량 범종 MP3 파일 업로드 시 파일 경로(예: 'templebell.mp3')를 지정하면 자동 연동됩니다.
    // 파일이 지정되지 않은 동안에는 주기적 합성음('딩~' 소리)을 재생하지 않습니다.
    this.bellAudioUrl = null;
    this.bellRepeatIntervalSec = 60;
    this.bellPlayFraction = 0.50;
    this.bellDefaultDurationSec = 35.03;
    this.bellRepeatTimer = null;
    this.needsGestureUnlock = false;

    this.bellLoopAudio = null;
    this.bellOnceAudio = null;

    if (this.bellAudioUrl) {
      this.initExternalBellAudio(this.bellAudioUrl);
    }
  }

  initExternalBellAudio(url) {
    this.bellAudioUrl = url;
    this.bellLoopAudio = new Audio(url);
    this.bellLoopAudio.loop = false;
    this.bellLoopAudio.preload = 'none';
    this.bellLoopAudio.volume = this.bellLevel;

    this.bellOnceAudio = new Audio(url);
    this.bellOnceAudio.loop = false;
    this.bellOnceAudio.preload = 'none';
    this.bellOnceAudio.volume = this.bellLevel;

    const enforceFiftyPercentPlayLimit = (audioEl, getBaseVolume) => {
      audioEl.addEventListener('timeupdate', () => {
        if (audioEl.paused) return;
        const fullDur =
          Number.isFinite(audioEl.duration) && audioEl.duration > 2
            ? audioEl.duration
            : this.bellDefaultDurationSec;
        const cutoffSec = fullDur * this.bellPlayFraction;
        const fadeStartSec = Math.max(0, cutoffSec - 2.2);
        const cur = audioEl.currentTime;

        if (cur >= cutoffSec) {
          audioEl.pause();
          audioEl.currentTime = 0;
          audioEl.volume = Math.max(0, Math.min(1, getBaseVolume()));
        } else if (cur > fadeStartSec) {
          const fadeRatio = Math.max(0, (cutoffSec - cur) / (cutoffSec - fadeStartSec));
          audioEl.volume = Math.max(0, Math.min(1, getBaseVolume() * fadeRatio));
        }
      });
    };

    enforceFiftyPercentPlayLimit(this.bellLoopAudio, () => this.bellLevel);
    enforceFiftyPercentPlayLimit(this.bellOnceAudio, () => Math.max(0.25, this.bellLevel));
  }

  initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.85;
    this.masterGain.connect(this.ctx.destination);

    this.setupContinuousStreams();
  }

  createNoiseBuffer(seconds = 4, type = 'pink') {
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'brown') {
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 2.8;
      } else {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.08;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  setupContinuousStreams() {
    const brownNoise = this.ctx.createBufferSource();
    brownNoise.buffer = this.createNoiseBuffer(5, 'brown');
    brownNoise.loop = true;

    const waterBand = this.ctx.createBiquadFilter();
    waterBand.type = 'bandpass';
    waterBand.frequency.value = 540;
    waterBand.Q.value = 0.75;

    const waterHigh = this.ctx.createBiquadFilter();
    waterHigh.type = 'lowpass';
    waterHigh.frequency.value = 1750;

    const waterLfo = this.ctx.createOscillator();
    waterLfo.frequency.value = 0.32;
    const waterLfoGain = this.ctx.createGain();
    waterLfoGain.gain.value = 190;
    waterLfo.connect(waterLfoGain);
    waterLfoGain.connect(waterBand.frequency);
    waterLfo.start();

    this.waterGain = this.ctx.createGain();
    this.waterGain.gain.value = 0;

    brownNoise.connect(waterBand);
    waterBand.connect(waterHigh);
    waterHigh.connect(this.waterGain);
    this.waterGain.connect(this.masterGain);
    brownNoise.start();

    const pinkNoise = this.ctx.createBufferSource();
    pinkNoise.buffer = this.createNoiseBuffer(6, 'pink');
    pinkNoise.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 250;
    windFilter.Q.value = 2.5;

    const windLfo = this.ctx.createOscillator();
    windLfo.frequency.value = 0.12;
    const windLfoGain = this.ctx.createGain();
    windLfoGain.gain.value = 115;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);
    windLfo.start();

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;

    pinkNoise.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    pinkNoise.start();
  }

  playMountainBirdCall() {
    if (!this.isPlaying || !this.ctx || this.ctx.state !== 'running') return;
    const ambientLevel = Math.max(this.windLevel, this.waterLevel, 0.35);
    if (ambientLevel <= 0.02) return;

    const now = this.ctx.currentTime + 0.05;
    const callGroupGain = this.ctx.createGain();
    callGroupGain.gain.value = Math.min(0.28, ambientLevel * 0.38);

    let outputNode = callGroupGain;
    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 1.3;
      callGroupGain.connect(panner);
      outputNode = panner;
    }

    const delay = this.ctx.createDelay(1.0);
    delay.delayTime.value = 0.24 + Math.random() * 0.12;
    const echoFilter = this.ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 2600;
    const echoGain = this.ctx.createGain();
    echoGain.gain.value = 0.26;

    outputNode.connect(this.masterGain);
    outputNode.connect(delay);
    delay.connect(echoFilter);
    echoFilter.connect(echoGain);
    echoGain.connect(this.masterGain);

    const scheduleNote = (
      startOffset,
      dur,
      fStart,
      fMid,
      fEnd,
      peakAmp = 0.22,
      vibratoHz = 0,
      vibratoDepth = 0
    ) => {
      const t0 = now + startOffset;
      const t1 = t0 + dur;

      const osc = this.ctx.createOscillator();
      const harmOsc = this.ctx.createOscillator();
      const harmGain = this.ctx.createGain();
      const noteGain = this.ctx.createGain();

      osc.type = 'sine';
      harmOsc.type = 'sine';
      harmGain.gain.value = 0.14;

      osc.frequency.setValueAtTime(fStart, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(200, fMid), t0 + dur * 0.48);
      osc.frequency.exponentialRampToValueAtTime(Math.max(200, fEnd), t1);

      harmOsc.frequency.setValueAtTime(fStart * 2, t0);
      harmOsc.frequency.exponentialRampToValueAtTime(Math.max(400, fMid * 2), t0 + dur * 0.48);
      harmOsc.frequency.exponentialRampToValueAtTime(Math.max(400, fEnd * 2), t1);

      if (vibratoHz > 0 && vibratoDepth > 0) {
        const vib = this.ctx.createOscillator();
        const vibGain = this.ctx.createGain();
        vib.frequency.value = vibratoHz;
        vibGain.gain.value = vibratoDepth;
        vib.connect(vibGain);
        vibGain.connect(osc.frequency);
        vib.start(t0);
        vib.stop(t1 + 0.02);
      }

      noteGain.gain.setValueAtTime(0.0001, t0);
      noteGain.gain.linearRampToValueAtTime(peakAmp, t0 + Math.min(0.028, dur * 0.28));
      noteGain.gain.exponentialRampToValueAtTime(0.0001, t1);

      osc.connect(noteGain);
      harmOsc.connect(harmGain);
      harmGain.connect(noteGain);
      noteGain.connect(callGroupGain);

      osc.start(t0);
      harmOsc.start(t0);
      osc.stop(t1 + 0.02);
      harmOsc.stop(t1 + 0.02);
    };

    const speciesRoll = Math.random();
    if (speciesRoll < 0.45) {
      const baseF = 2450 + Math.random() * 420;
      const syllables = 2 + Math.floor(Math.random() * 2);
      let cursor = 0;
      for (let i = 0; i < syllables; i++) {
        scheduleNote(cursor, 0.11, baseF * 0.92, baseF * 1.18, baseF * 1.04, 0.20);
        scheduleNote(cursor + 0.13, 0.14, baseF * 1.15, baseF * 0.88, baseF * 0.82, 0.17);
        cursor += 0.31 + Math.random() * 0.05;
      }
    } else if (speciesRoll < 0.80) {
      const baseF = 2150 + Math.random() * 360;
      scheduleNote(0.0, 0.34, baseF * 0.96, baseF * 1.02, baseF * 1.05, 0.16, 12, 18);
      scheduleNote(0.40, 0.14, baseF * 1.28, baseF * 1.42, baseF * 1.12, 0.21, 28, 45);
      scheduleNote(0.57, 0.16, baseF * 1.18, baseF * 1.35, baseF * 0.98, 0.19, 26, 40);
      if (Math.random() > 0.35) {
        scheduleNote(0.76, 0.18, baseF * 1.24, baseF * 1.06, baseF * 0.92, 0.16, 22, 30);
      }
    } else {
      const hiF = 655 + (Math.random() - 0.5) * 30;
      const loF = hiF * 0.80;
      scheduleNote(0.0, 0.16, hiF * 0.97, hiF * 1.02, hiF, 0.14);
      scheduleNote(0.26, 0.28, loF * 1.01, loF, loF * 0.98, 0.12);
      if (Math.random() > 0.45) {
        scheduleNote(1.15, 0.16, hiF * 0.97, hiF * 1.02, hiF, 0.11);
        scheduleNote(1.41, 0.28, loF * 1.01, loF, loF * 0.98, 0.095);
      }
    }
  }

  scheduleNextBirdSong(initialDelayMs = null) {
    if (this.birdSongTimer) {
      clearTimeout(this.birdSongTimer);
      this.birdSongTimer = null;
    }
    if (!this.isPlaying) return;

    const delayMs =
      initialDelayMs !== null
        ? initialDelayMs
        : Math.round((13 + Math.random() * 14) * 1000);

    this.birdSongTimer = setTimeout(() => {
      if (this.isPlaying) {
        this.playMountainBirdCall();
      }
      this.scheduleNextBirdSong();
    }, delayMs);
  }

  stopBirdSongCycle() {
    if (this.birdSongTimer) {
      clearTimeout(this.birdSongTimer);
      this.birdSongTimer = null;
    }
  }

  startBellRepeatCycle() {
    this.stopBellRepeatCycle();

    const triggerBell = () => {
      if (this.bellLoopAudio) {
        this.bellLoopAudio.currentTime = 0;
        this.bellLoopAudio.volume = Math.max(0, Math.min(1, this.bellLevel));
        this.bellLoopAudio
          .play()
          .then(() => {
            this.needsGestureUnlock = false;
            this.onBellStrike?.();
          })
          .catch(() => {
            this.needsGestureUnlock = true;
          });
      } else {
        this.onBellStrike?.();
      }
    };

    triggerBell();

    this.bellRepeatTimer = setInterval(() => {
      if (!this.isPlaying) return;
      triggerBell();
    }, this.bellRepeatIntervalSec * 1000);
  }

  stopBellRepeatCycle() {
    if (this.bellRepeatTimer) {
      clearInterval(this.bellRepeatTimer);
      this.bellRepeatTimer = null;
    }
    this.bellLoopAudio?.pause();
  }

  startDefaultPlayback() {
    this.isPlaying = true;
    try {
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {
          this.needsGestureUnlock = true;
        });
      }
      this.updateContinuousVolumes();
      this.startBellRepeatCycle();
      this.scheduleNextBirdSong(4500);
    } catch {
      this.needsGestureUnlock = true;
    }

    const gestureEvents = ['pointerdown', 'touchstart', 'keydown', 'click'];
    const removeGestureListeners = () => {
      gestureEvents.forEach((evt) => {
        window.removeEventListener(evt, unlockOnFirstGesture);
      });
    };

    const unlockOnFirstGesture = () => {
      if (!this.isPlaying) return;
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.updateContinuousVolumes();
      if (!this.birdSongTimer) {
        this.scheduleNextBirdSong(3200);
      }
      if (
        this.needsGestureUnlock ||
        (this.bellLoopAudio &&
          this.bellLoopAudio.paused &&
          this.bellLoopAudio.currentTime === 0 &&
          !this.bellRepeatTimer)
      ) {
        this.needsGestureUnlock = false;
        if (!this.bellRepeatTimer) {
          this.startBellRepeatCycle();
        } else if (this.bellLoopAudio && this.bellLoopAudio.currentTime < 2.0) {
          this.bellLoopAudio.play().catch(() => {});
        }
      }
      if (this.ctx && this.ctx.state === 'running' && !this.needsGestureUnlock) {
        removeGestureListeners();
      }
    };

    gestureEvents.forEach((evt) => {
      window.addEventListener(evt, unlockOnFirstGesture, { passive: true });
    });
  }

  toggle() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.isPlaying = !this.isPlaying;
    this.updateContinuousVolumes();

    if (this.isPlaying) {
      this.bellOnceAudio?.pause();
      this.startBellRepeatCycle();
      this.scheduleNextBirdSong(3500);
    } else {
      this.stopBellRepeatCycle();
      this.stopBirdSongCycle();
      this.bellOnceAudio?.pause();
      if (this.autoBellTimer) {
        clearTimeout(this.autoBellTimer);
        this.autoBellTimer = null;
      }
    }
    return this.isPlaying;
  }

  updateContinuousVolumes() {
    if (this.bellLoopAudio) {
      this.bellLoopAudio.volume = Math.max(0, Math.min(1, this.bellLevel));
    }
    if (this.bellOnceAudio) {
      this.bellOnceAudio.volume = Math.max(0.25, Math.min(1, this.bellLevel));
    }

    if (!this.ctx || !this.waterGain || !this.windGain) return;
    const now = this.ctx.currentTime;
    if (!this.isPlaying) {
      this.waterGain.gain.setTargetAtTime(0, now, 0.4);
      this.windGain.gain.setTargetAtTime(0, now, 0.4);
      return;
    }
    this.waterGain.gain.setTargetAtTime(this.waterLevel * 0.24, now, 0.5);
    this.windGain.gain.setTargetAtTime(this.windLevel * 0.28, now, 0.5);
  }

  scheduleNextAutoBell() {
    if (this.autoBellTimer) clearTimeout(this.autoBellTimer);
    if (!this.isPlaying) return;

    const intervalMs = this.bellRepeatIntervalSec * 1000;
    this.autoBellTimer = setTimeout(() => {
      if (this.isPlaying && this.bellLevel > 0.02) {
        this.onBellStrike?.();
      }
      this.scheduleNextAutoBell();
    }, intervalMs);
  }

  strikeWindBell(intensity = 0.85) {
    const vol = Math.max(0.25, Math.min(1, intensity * Math.max(0.45, this.bellLevel)));

    if (!this.bellLoopAudio || !this.bellOnceAudio) {
      return;
    }

    if (this.isPlaying && !this.bellLoopAudio.paused) {
      this.bellLoopAudio.volume = Math.max(this.bellLoopAudio.volume, vol);
      return;
    }

    try {
      this.bellOnceAudio.pause();
      this.bellOnceAudio.currentTime = 0.50;
      this.bellOnceAudio.volume = vol;
      this.bellOnceAudio
        .play()
        .catch((err) => console.warn('Bell audio play blocked:', err));
    } catch (err) {
      console.warn('Error playing bell audio:', err);
    }
  }
}
