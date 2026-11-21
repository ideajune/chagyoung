/**
 * WandererManager — 플레이어 '삿갓 쓴 산사 나그네' 및 동료 NPC 제어, 클릭 보행, WASD 이동, 합장·명상 액션 및 머리 위 닉네임 투영
 */

import {
  STORAGE_KEYS,
  WANDERER_POETIC_NAMES,
  WANDERER_PALETTES,
  WANDERER_SPOTS,
  FELLOW_WANDERERS_PRESETS
} from '../config/constants.js';
import {
  MURYANGSUJEON_CONFIG,
  ANYANGRU_CONFIG,
  ANYANGRU_CUSHIONS
} from '../config/worldConfig.js';
import {
  equipWandererActor,
  applyWiderWalkingStride,
  applyWandererPalette,
  createWandererBubbleSprite
} from './WandererActor.js';
import {
  getGroundHeightAt,
  clampWalkableXZ,
  buildWalkPath,
  findNearestAnyangruCushion,
  getAnyangruCushionByIndex,
  selectPriorityAnyangruCushion
} from './Navigation.js';

const C_ENGINE = window.SANSA_CORE;

export class WandererManager {
  constructor(sceneManager, cameraController, callbacks = {}) {
    this.sceneManager = sceneManager;
    this.cameraController = cameraController;
    this.callbacks = callbacks;

    this.scene = sceneManager.scene;
    this.camera = sceneManager.camera;

    this.rootGroup = new C_ENGINE.Group();
    this.rootGroup.name = 'SansaWanderersRoot';
    this.scene.add(this.rootGroup);

    this.profile = this.loadProfile();
    this.currentSpotId = 'courtyard_steps';
    this.posture = 'walk'; // 'walk' | 'kneel'

    this.selfActor = null;
    this.npcWanderers = [];
    this.remotePlayers = new Map();
    this.multiplayerClient = null;
    this.occupiedSeatIndex = null;
    this.seatRequestInFlight = false;
    this.revealedNpc = null;
    this.revealedNpcUntil = 0;
    this.activeBubbles = [];
    this.greetingRipples = [];

    this.mobileMoveSpeed = 2.42;
    this.pcMoveSpeed = Number((2.42 * 1.3).toFixed(3)); // PC 보행 속도 30% 상향 (3.146)
    this.moveSpeed = this.getEffectiveMoveSpeed();
    this.velocity = new C_ENGINE.Vector3();
    this.keys = { w: false, a: false, s: false, d: false };
    this.waypoints = [];
    this.journeyFinalSpotId = null;
    this.pendingMeditationOnArrival = false;
    this.targetCushion = null;
    this.activeHallSeatIndex = null;
    this.targetHallCushion = null;
    this.pendingHallMeditationOnArrival = false;

    this.raycaster = new C_ENGINE.Raycaster();
    this.ndcPointer = new C_ENGINE.Vector2();
    this.destinationMarker = this.createDestinationMarker();
    this.rootGroup.add(this.destinationMarker);

    this.lastElapsed = 0;

    this.cameraController.setFollowSubjectProvider(() => {
      if (!this.selfActor?.group) return null;
      return {
        position: this.selfActor.group.position,
        posture: this.posture
      };
    });

    this.buildWanderers();
  }

  loadProfile() {
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
            paletteIdx: parsed.v2Palette ? Math.abs(parsed.paletteIdx) % WANDERER_PALETTES.length : 0
          };
        }
      }
    } catch {
      // localStorage 접근 불가 시 폴백
    }

    const randomIdx = Math.floor(Math.random() * WANDERER_POETIC_NAMES.length);
    const initial = {
      name: WANDERER_POETIC_NAMES[randomIdx],
      paletteIdx: 0 // 기본 연옥빛 풍류 도포(시안 1)
    };
    try {
      localStorage.setItem(STORAGE_KEYS.WANDERER_PROFILE, JSON.stringify(initial));
    } catch {
      // ignore
    }
    return initial;
  }

  saveProfile() {
    try {
      localStorage.setItem(STORAGE_KEYS.WANDERER_PROFILE, JSON.stringify(this.profile));
    } catch {
      // ignore
    }
  }

  get currentPalette() {
    return WANDERER_PALETTES[this.profile.paletteIdx % WANDERER_PALETTES.length];
  }

  get isMeditatingOrHeading() {
    return this.posture === 'kneel' || this.pendingMeditationOnArrival;
  }

  isMobileViewport() {
    return window.innerWidth <= 768 || Boolean(this.camera && this.camera.aspect < 0.88);
  }

  getEffectiveMoveSpeed() {
    return this.isMobileViewport() ? this.mobileMoveSpeed : this.pcMoveSpeed;
  }

  notifyPostureChanged() {
    this.callbacks.onPostureChange?.(this.isMeditatingOrHeading);
  }

  notifySeatStateChanged() {
    this.callbacks.onSeatStateChange?.(this.getAllSeatsSnapshot());
  }

  setMultiplayerClient(client) {
    this.multiplayerClient = client;
  }

  getInitialNetworkProfile() {
    const pos = this.selfActor?.group?.position;
    return {
      name: this.profile.name,
      paletteIdx: this.profile.paletteIdx,
      x: pos ? pos.x : 0,
      z: pos ? pos.z : 1.5,
      yaw: this.selfActor?.group?.rotation?.y || 0,
      posture: this.posture,
      seatIndex: this.occupiedSeatIndex
    };
  }

  applyAssignedProfile({ name }) {
    if (!name || typeof name !== 'string') return;
    this.profile.name = name;
    if (this.selfLabel?.nameSpan) {
      this.selfLabel.nameSpan.textContent = name;
    }
    this.notifySeatStateChanged();
  }

  publishImmediateSelfState() {
    if (!this.multiplayerClient || !this.selfActor?.group) return;
    const pos = this.selfActor.group.position;
    this.multiplayerClient.publishSelfState(
      {
        name: this.profile.name,
        paletteIdx: this.profile.paletteIdx,
        x: pos.x,
        z: pos.z,
        yaw: this.selfActor.group.rotation.y,
        posture: this.posture,
        seatIndex: this.occupiedSeatIndex
      },
      true
    );
  }

  releaseOccupiedSeat() {
    if (this.occupiedSeatIndex === null) return;
    this.occupiedSeatIndex = null;
    this.multiplayerClient?.releaseSeat();
    this.notifySeatStateChanged();
  }

  getSeatInfo(seatIndex) {
    const seat = getAnyangruCushionByIndex(seatIndex);
    if (!seat) return null;

    if (this.occupiedSeatIndex === seatIndex) {
      return {
        seat,
        status: 'mine',
        occupantName: this.profile.name,
        peerId: null,
        isKneeling: this.posture === 'kneel'
      };
    }

    for (const peer of this.remotePlayers.values()) {
      if (peer.seatIndex === seatIndex) {
        return {
          seat,
          status: 'occupied',
          occupantName: peer.name || '산사 나그네',
          peerId: peer.id,
          isKneeling: peer.posture === 'kneel'
        };
      }
    }

    return {
      seat,
      status: 'empty',
      occupantName: null,
      peerId: null,
      isKneeling: false
    };
  }

  getAllSeatsSnapshot() {
    return ANYANGRU_CUSHIONS.map((c) => this.getSeatInfo(c.index));
  }

  syncNpcVisibility() {
    const showNpcs = this.remotePlayers.size === 0;
    for (const npc of this.npcWanderers) {
      if (npc.actor?.group) {
        npc.actor.group.visible = showNpcs;
      }
      if (!showNpcs && npc.labelObj?.el) {
        npc.labelObj.el.hidden = true;
      }
    }
  }

  upsertRemotePlayer(peer) {
    if (!peer || !peer.id) return;

    const paletteIdx = Math.abs(Number(peer.paletteIdx) || 0) % WANDERER_PALETTES.length;
    const palette = WANDERER_PALETTES[paletteIdx];
    const seatIdx = Number.isInteger(peer.seatIndex) ? peer.seatIndex : null;
    const posture = peer.posture === 'kneel' ? 'kneel' : 'walk';
    const seatCushion = seatIdx !== null ? getAnyangruCushionByIndex(seatIdx) : null;

    let targetX = Number.isFinite(peer.x) ? Number(peer.x) : 0;
    let targetZ = Number.isFinite(peer.z) ? Number(peer.z) : 1.5;
    let targetY = getGroundHeightAt(targetX, targetZ);
    let targetYaw = Number.isFinite(peer.yaw) ? Number(peer.yaw) : 0;

    if (posture === 'kneel' && seatCushion) {
      targetX = seatCushion.x;
      targetY = ANYANGRU_CONFIG.cushionWorldY;
      targetZ = seatCushion.z;
      targetYaw = 0;
    }

    if (!this.remotePlayers.has(peer.id)) {
      const actor = C_ENGINE.createMonk({ detail: 'reduced', remote: true });
      actor.group.name = `RemoteWanderer_${peer.id}`;
      actor.group.position.set(targetX, targetY, targetZ);
      actor.group.rotation.y = targetYaw;
      this.rootGroup.add(actor.group);

      const labelObj = this.createVisitorLabelElement(peer.name || '산사 나그네', false);

      const entry = {
        id: peer.id,
        name: peer.name || '산사 나그네',
        paletteIdx,
        palette,
        actor,
        labelObj,
        posture,
        seatIndex: seatIdx,
        targetPos: new C_ENGINE.Vector3(targetX, targetY, targetZ),
        targetYaw,
        animSeed: Math.random() * 8.0,
        equipped: false
      };

      this.remotePlayers.set(peer.id, entry);

      actor.ready?.then(() => {
        if (!this.remotePlayers.has(peer.id)) return;
        equipWandererActor(actor, entry.palette, false, entry.posture);
        entry.equipped = true;
      });

      this.syncNpcVisibility();
      this.notifySeatStateChanged();
      return;
    }

    const entry = this.remotePlayers.get(peer.id);
    const prevSeat = entry.seatIndex;
    const prevPosture = entry.posture;

    if (peer.name && peer.name !== entry.name) {
      entry.name = peer.name;
      if (entry.labelObj?.nameSpan) {
        entry.labelObj.nameSpan.textContent = peer.name;
      }
    }

    if (paletteIdx !== entry.paletteIdx) {
      entry.paletteIdx = paletteIdx;
      entry.palette = palette;
      if (entry.equipped) {
        applyWandererPalette(entry.actor, palette);
      }
    }

    entry.seatIndex = seatIdx;
    entry.targetPos.set(targetX, targetY, targetZ);
    entry.targetYaw = targetYaw;

    if (posture !== entry.posture) {
      entry.posture = posture;
      entry.actor.setMode(posture);
      if (posture === 'kneel' && seatCushion) {
        entry.actor.group.position.set(seatCushion.x, ANYANGRU_CONFIG.cushionWorldY, seatCushion.z);
        entry.actor.group.rotation.y = 0;
      }
    }

    if (prevSeat !== entry.seatIndex || prevPosture !== entry.posture) {
      this.notifySeatStateChanged();
    }
  }

  removeRemotePlayer(peerId) {
    const entry = this.remotePlayers.get(peerId);
    if (!entry) return;

    for (let i = this.activeBubbles.length - 1; i >= 0; i--) {
      const b = this.activeBubbles[i];
      if (b.parent === entry.actor?.group) {
        b.parent.remove(b.sprite);
        b.sprite.material.map?.dispose();
        b.sprite.material.dispose();
        this.activeBubbles.splice(i, 1);
      }
    }

    if (entry.actor?.group) {
      this.rootGroup.remove(entry.actor.group);
    }
    entry.actor?.destroy?.();
    entry.labelObj?.el?.remove();

    if (this.revealedNpc === entry) {
      this.revealedNpc = null;
    }

    this.remotePlayers.delete(peerId);
    this.syncNpcVisibility();
    this.notifySeatStateChanged();
  }

  handleRemoteAction(peerId, actionType) {
    if (actionType !== 'greet') return;
    const entry = this.remotePlayers.get(peerId);
    if (!entry || !entry.actor?.group) return;

    const now = this.lastElapsed || 0;
    if (entry.posture === 'kneel') {
      entry.actor.bow(now);
    } else {
      entry.actor.greet(now);
    }

    this.spawnBubbleAbove(entry.actor.group, '🙏 평안하신지요', 2.6);
    this.spawnGroundRipple(
      entry.actor.group.position,
      entry.palette?.markerHex || 0x98f5c4
    );
    this.revealNpcLabel(entry, 3200);
  }

  createDestinationMarker() {
    const group = new C_ENGINE.Group();
    group.name = 'WandererDestinationMarker';
    group.visible = false;

    const ringGeo = new C_ENGINE.RingGeometry(0.24, 0.33, 48);
    const ringMat = new C_ENGINE.MeshBasicMaterial({
      color: 0xffd27d,
      side: C_ENGINE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    const ringMesh = new C_ENGINE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.renderOrder = 18;
    group.add(ringMesh);

    const dotGeo = new C_ENGINE.CircleGeometry(0.095, 32);
    const dotMat = new C_ENGINE.MeshBasicMaterial({
      color: 0xfff3d1,
      side: C_ENGINE.DoubleSide,
      transparent: true,
      opacity: 0.98,
      depthWrite: false
    });
    const dotMesh = new C_ENGINE.Mesh(dotGeo, dotMat);
    dotMesh.rotation.x = -Math.PI / 2;
    dotMesh.position.y = 0.005;
    dotMesh.renderOrder = 19;
    group.add(dotMesh);

    const waveGeo = new C_ENGINE.RingGeometry(0.26, 0.31, 48);
    const waveMat = new C_ENGINE.MeshBasicMaterial({
      color: 0xffd27d,
      side: C_ENGINE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });
    const waveMesh = new C_ENGINE.Mesh(waveGeo, waveMat);
    waveMesh.rotation.x = -Math.PI / 2;
    waveMesh.position.y = 0.003;
    waveMesh.renderOrder = 17;
    group.add(waveMesh);

    const beamGeo = new C_ENGINE.CylinderGeometry(0.018, 0.075, 0.85, 16, 1, true);
    const beamMat = new C_ENGINE.MeshBasicMaterial({
      color: 0xffe29e,
      transparent: true,
      opacity: 0.42,
      side: C_ENGINE.DoubleSide,
      depthWrite: false,
      blending: C_ENGINE.AdditiveBlending
    });
    const beamMesh = new C_ENGINE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = 0.425;
    beamMesh.renderOrder = 16;
    group.add(beamMesh);

    group.userData = {
      ringMesh,
      ringMat,
      dotMesh,
      dotMat,
      waveMesh,
      waveMat,
      beamMesh,
      beamMat
    };

    return group;
  }

  buildWanderers() {
    if (this.selfActor?.group) {
      this.rootGroup.remove(this.selfActor.group);
    }
    this.npcWanderers.forEach((npc) => {
      if (npc.actor?.group) this.rootGroup.remove(npc.actor.group);
    });
    this.npcWanderers = [];
    this.waypoints = [];
    this.destinationMarker.visible = false;

    const spots = WANDERER_SPOTS.buseoksa;
    const initialSpot = spots[0];
    this.currentSpotId = initialSpot.id;
    this.posture = 'walk';

    // 1. 플레이어 나그네 스폰
    const selfActor = C_ENGINE.createMonk();
    selfActor.group.name = 'PlayerSansaWanderer';
    const startY = getGroundHeightAt(initialSpot.pos[0], initialSpot.pos[2]);
    selfActor.group.position.set(initialSpot.pos[0], startY, initialSpot.pos[2]);
    selfActor.group.rotation.y = initialSpot.facingYaw || 0;
    this.rootGroup.add(selfActor.group);
    this.selfActor = selfActor;

    this.cameraController.setFollowOrientation(initialSpot.facingYaw || 0, 0.02, true);

    selfActor.ready.then(() => {
      equipWandererActor(selfActor, this.currentPalette, true);
    });

    // 2. 동료 산사 나그네 NPC 스폰 (PC·모바일 동일 2명)
    const maxNpcs = 2;
    const presets = FELLOW_WANDERERS_PRESETS.buseoksa.slice(0, maxNpcs);
    presets.forEach((preset, idx) => {
      const spot = spots[preset.spotIdx % spots.length] || spots[0];
      const homeX = spot.pos[0] + preset.offset[0];
      const homeZ = spot.pos[2] + preset.offset[2];
      const clamped = clampWalkableXZ(homeX, homeZ);
      const homeY = getGroundHeightAt(clamped.x, clamped.z);

      const npcActor = C_ENGINE.createMonk({ detail: 'reduced', remote: true });
      npcActor.group.position.set(clamped.x, homeY, clamped.z);
      npcActor.group.rotation.y = spot.facingYaw || 0;
      this.rootGroup.add(npcActor.group);

      const palette = WANDERER_PALETTES[preset.paletteIdx % WANDERER_PALETTES.length];
      npcActor.ready.then(() => {
        equipWandererActor(npcActor, palette, false);
        // 고폴리곤(19.4만 삼각형) NPC의 실시간 그림자 패스 비활성화로 GPU 부하 대폭 절감
        npcActor.group.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = false;
            obj.receiveShadow = false;
          }
        });
      });

      let npcName = preset.name;
      if (npcName === this.profile.name) {
        const altNames = WANDERER_POETIC_NAMES.filter((n) => n !== this.profile.name);
        npcName = altNames[idx % altNames.length] || '맑은 이슬';
      }

      this.npcWanderers.push({
        name: npcName,
        actor: npcActor,
        palette,
        homePos: new C_ENGINE.Vector3(clamped.x, homeY, clamped.z),
        targetPos: new C_ENGINE.Vector3(clamped.x, homeY, clamped.z),
        patrolRadius: preset.patrolRadius || 1.8,
        seed: preset.seed || 1.0,
        nextMoveTime: 2.5 + Math.random() * 4.0,
        speed: 1.15
      });
    });

    this.initVisitorLabels();
    this.notifyPostureChanged();
  }

  createVisitorLabelElement(nameText, isSelf) {
    if (!this.visitorLabelContainer) return null;
    const el = document.createElement('div');
    el.className = isSelf ? 'visitor-label is-self' : 'visitor-label';
    el.hidden = !isSelf;
    if (isSelf) {
      const meBadge = document.createElement('span');
      meBadge.className = 'visitor-label-me';
      meBadge.textContent = '나';
      el.appendChild(meBadge);
    }
    const nameSpan = document.createElement('span');
    nameSpan.className = 'visitor-label-name';
    nameSpan.textContent = nameText;
    el.appendChild(nameSpan);
    this.visitorLabelContainer.appendChild(el);
    return { el, nameSpan };
  }

  initVisitorLabels() {
    let container = document.getElementById('visitor-labels');
    if (!container) {
      container = document.createElement('div');
      container.id = 'visitor-labels';
      container.className = 'visitor-labels';
      container.setAttribute('aria-hidden', 'true');
      document.getElementById('app-stage')?.appendChild(container);
    }
    container.innerHTML = '';
    this.visitorLabelContainer = container;
    this.labelProjVec = new C_ENGINE.Vector3();

    this.selfLabel = this.createVisitorLabelElement(this.profile.name, true);
    this.npcWanderers.forEach((npc) => {
      npc.labelObj = this.createVisitorLabelElement(npc.name, false);
    });
    this.remotePlayers.forEach((peer) => {
      peer.labelObj = this.createVisitorLabelElement(peer.name, false);
    });
  }

  revealNpcLabel(npc, durationMs = 3000) {
    if (!npc) return;
    this.revealedNpc = npc;
    this.revealedNpcUntil = performance.now() + durationMs;
    this.updateVisitorLabels();
  }

  updateVisitorLabels() {
    if (!this.visitorLabelContainer || !this.camera) return;
    const vw = this.sceneManager.width || window.innerWidth;
    const vh = this.sceneManager.height || window.innerHeight;
    if (vw <= 0 || vh <= 0) return;

    const now = performance.now();
    if (this.revealedNpc && now >= this.revealedNpcUntil) {
      this.revealedNpc = null;
    }

    const projectActorHatTop = (actor, labelObj, isSelf, opacity = 1.0, isKneeling = false) => {
      if (!actor || !actor.group || !labelObj || !actor.group.visible) {
        if (labelObj?.el) labelObj.el.hidden = true;
        return;
      }

      actor.group.updateWorldMatrix(true, true);

      if (!actor.cachedHeadBone) {
        actor.cachedHeadBone = actor.group.getObjectByName('head') || null;
      }

      const pt = this.labelProjVec;
      if (actor.satgatTopAnchor) {
        actor.satgatTopAnchor.getWorldPosition(pt);
        pt.y += 0.06;
      } else if (actor.cachedHeadBone) {
        actor.cachedHeadBone.getWorldPosition(pt);
        pt.y += 0.64;
      } else {
        actor.group.getWorldPosition(pt);
        pt.y += isKneeling ? 1.44 : 1.88;
      }

      const dist = this.camera.position.distanceTo(pt);
      if (!isSelf && dist > 54) {
        labelObj.el.hidden = true;
        return;
      }

      pt.project(this.camera);
      if (pt.z < -1 || pt.z > 1) {
        labelObj.el.hidden = true;
        return;
      }
      if (!isSelf && (Math.abs(pt.x) > 1.05 || Math.abs(pt.y) > 1.05)) {
        labelObj.el.hidden = true;
        return;
      }

      let sx = (pt.x * 0.5 + 0.5) * vw;
      let sy = (-pt.y * 0.5 + 0.5) * vh;

      if (isSelf) {
        sx = Math.max(54, Math.min(vw - 54, sx));
        sy = Math.max(38, Math.min(vh - 38, sy));
      }

      labelObj.el.hidden = false;
      labelObj.el.style.opacity = opacity.toFixed(2);
      labelObj.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -100%)`;
    };

    if (this.selfLabel) {
      if (this.selfLabel.nameSpan.textContent !== this.profile.name) {
        this.selfLabel.nameSpan.textContent = this.profile.name;
      }
      projectActorHatTop(this.selfActor, this.selfLabel, true, 1.0, this.posture === 'kneel');
    }

    this.npcWanderers.forEach((npc) => {
      if (!npc.labelObj) return;
      if (this.revealedNpc === npc && now < this.revealedNpcUntil) {
        const remaining = this.revealedNpcUntil - now;
        const fadeOpacity = remaining < 450 ? Math.max(0, remaining / 450) : 0.96;
        projectActorHatTop(npc.actor, npc.labelObj, false, fadeOpacity, false);
      } else {
        npc.labelObj.el.hidden = true;
      }
    });

    this.remotePlayers.forEach((peer) => {
      if (!peer.labelObj) return;
      if (this.revealedNpc === peer && now < this.revealedNpcUntil) {
        const remaining = this.revealedNpcUntil - now;
        const fadeOpacity = remaining < 450 ? Math.max(0, remaining / 450) : 0.96;
        projectActorHatTop(
          peer.actor,
          peer.labelObj,
          false,
          fadeOpacity,
          peer.posture === 'kneel'
        );
      } else {
        peer.labelObj.el.hidden = true;
      }
    });
  }

  pickNpcWandererAtClient(clientX, clientY) {
    const canvas = this.sceneManager.renderer?.domElement;
    if (!canvas) return null;

    const candidates = [...this.remotePlayers.values(), ...this.npcWanderers];
    if (candidates.length === 0) return null;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    this.ndcPointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.ndcPointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndcPointer, this.camera);

    const ray = this.raycaster.ray;
    let bestNpc = null;
    let bestDist = Infinity;

    for (const npc of candidates) {
      const grp = npc.actor?.group;
      if (!grp || !grp.visible) continue;

      const basePos = grp.position;
      const toCamDist = this.camera.position.distanceTo(basePos);
      if (toCamDist > 56) continue;

      for (const sampleH of [0.45, 0.95, 1.42]) {
        const center = new C_ENGINE.Vector3(basePos.x, basePos.y + sampleH, basePos.z);
        const distSq = ray.distanceSqToPoint(center);
        const hitRadius = sampleH > 1.25 ? 0.56 : 0.48;
        if (distSq <= hitRadius * hitRadius && toCamDist < bestDist) {
          bestDist = toCamDist;
          bestNpc = npc;
        }
      }
    }

    return bestNpc;
  }

  spawnScreenTapRipple(clientX, clientY) {
    const el = document.createElement('div');
    el.className = 'ground-tap-ripple';
    el.style.left = `${clientX}px`;
    el.style.top = `${clientY}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 580);
  }

  startJourneyToPoint(targetVec, spotId = null, toastMessage = null, meditateOnArrival = false) {
    if (!this.selfActor) return;

    if (!meditateOnArrival) {
      this.pendingHallMeditationOnArrival = false;
      this.targetHallCushion = null;
      this.activeHallSeatIndex = null;
      if (this.occupiedSeatIndex !== null) {
        this.targetCushion = null;
        this.releaseOccupiedSeat();
        this.publishImmediateSelfState();
      }
    }

    const allowedSeatKey =
      this.pendingHallMeditationOnArrival && this.targetHallCushion
        ? `hall:${this.targetHallCushion.index}`
        : meditateOnArrival && this.targetCushion
          ? this.targetCushion.index
          : null;
    this.waypoints = buildWalkPath(this.selfActor.group.position, targetVec, allowedSeatKey);
    this.journeyFinalSpotId = spotId;
    this.pendingMeditationOnArrival = meditateOnArrival;
    this.cameraController.returnToFollow();

    if (this.posture !== 'walk') {
      this.posture = 'walk';
      this.selfActor.setMode('walk');
      this.callbacks.onBreathingToggle?.(false);
      this.publishImmediateSelfState();
    }
    this.notifyPostureChanged();

    const finalDest = this.waypoints[this.waypoints.length - 1];
    if (finalDest) {
      this.destinationMarker.position.set(finalDest.x, finalDest.y + 0.035, finalDest.z);
      this.destinationMarker.visible = true;

      const hex = this.currentPalette.markerHex || 0xffd27d;
      const { ringMat, waveMat } = this.destinationMarker.userData;
      if (ringMat) ringMat.color.setHex(hex);
      if (waveMat) waveMat.color.setHex(hex);
    }

    if (spotId) {
      this.currentSpotId = spotId;
    }

    if (toastMessage) {
      this.callbacks.onToast?.(toastMessage);
    }
  }

  handleGroundClick(clientX, clientY) {
    const canvas = this.sceneManager.renderer?.domElement;
    if (!canvas) return;

    const clickedNpc = this.pickNpcWandererAtClient(clientX, clientY);
    if (clickedNpc) {
      this.revealNpcLabel(clickedNpc, 3000);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    this.ndcPointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.ndcPointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndcPointer, this.camera);

    // 초고속 해석적(Analytical) 다층 지면 평면 교차 검사 (수백만 삼각형 CPU 레이캐스팅 완전 제거)
    const ray = this.raycaster.ray;
    let hitPoint = null;
    if (Math.abs(ray.direction.y) > 0.001) {
      let bestT = Infinity;
      const testPlane = (planeY, boundsCheck) => {
        const t = (planeY - ray.origin.y) / ray.direction.y;
        if (t <= 0.1 || t >= 95 || t >= bestT) return;
        const hx = ray.origin.x + ray.direction.x * t;
        const hz = ray.origin.z + ray.direction.z * t;
        if (!boundsCheck || boundsCheck(hx, hz)) {
          bestT = t;
          hitPoint = new C_ENGINE.Vector3(hx, planeY, hz);
        }
      };

      // 1) 차경루 누각 마루 (y = 0.86)
      testPlane(ANYANGRU_CONFIG.deckY, (x, z) =>
        Math.abs(x) <= ANYANGRU_CONFIG.deckHalfW && z >= -23.5 && z <= -15.2
      );
      // 2) 청풍사 본전 기단·실내 마루 (y = 0.20)
      testPlane(MURYANGSUJEON_CONFIG.verandaY, (x, z) =>
        x >= MURYANGSUJEON_CONFIG.stylobateMinX &&
        x <= MURYANGSUJEON_CONFIG.stylobateMaxX &&
        z >= MURYANGSUJEON_CONFIG.stylobateMinZ &&
        z <= MURYANGSUJEON_CONFIG.stylobateMaxZ
      );
      // 3) 동쪽 연화지 청풍교 아치 (y ≈ 0.05)
      testPlane(0.05, (x, z) => x >= 20.1 && x <= 36.9 && z >= -5.75 && z <= -3.25);
      // 4) 기본 마당·정원 지면 (y = -0.78)
      testPlane(-0.78, null);
    }

    if (!hitPoint) return;

    const clamped = clampWalkableXZ(hitPoint.x, hitPoint.z);
    const groundY = getGroundHeightAt(clamped.x, clamped.z);
    const finalTarget = new C_ENGINE.Vector3(clamped.x, groundY, clamped.z);

    this.startJourneyToPoint(finalTarget, null, null, false);
  }

  setMoveKey(key, pressed) {
    if (!(key in this.keys)) return;
    this.keys[key] = pressed;
    if (pressed) {
      this.cancelPointJourney();
    }
  }

  cancelPointJourney() {
    this.waypoints = [];
    this.pendingMeditationOnArrival = false;
    this.targetCushion = null;
    this.activeHallSeatIndex = null;
    this.targetHallCushion = null;
    this.pendingHallMeditationOnArrival = false;
    this.destinationMarker.visible = false;
    this.cameraController.returnToFollow();
    document.body.classList.remove('wanderer-walking');

    let changed = false;
    if (this.occupiedSeatIndex !== null) {
      this.releaseOccupiedSeat();
      changed = true;
    }

    if (this.posture !== 'walk' && this.selfActor) {
      this.posture = 'walk';
      this.selfActor.setMode('walk');
      this.callbacks.onBreathingToggle?.(false);
      changed = true;
    }

    if (changed) {
      this.publishImmediateSelfState();
    }
    this.notifyPostureChanged();
  }

  triggerGreeting() {
    if (!this.selfActor) return;
    const now = this.lastElapsed || 0;

    if (this.posture !== 'kneel' && this.occupiedSeatIndex !== null) {
      this.targetCushion = null;
      this.releaseOccupiedSeat();
      this.publishImmediateSelfState();
    }

    this.waypoints = [];
    this.pendingMeditationOnArrival = false;
    this.destinationMarker.visible = false;
    this.keys.w = false;
    this.keys.a = false;
    this.keys.s = false;
    this.keys.d = false;
    this.velocity.set(0, 0, 0);
    document.body.classList.remove('wanderer-walking');
    this.notifyPostureChanged();

    if (this.posture === 'kneel') {
      this.selfActor.bow(now);
    } else {
      this.selfActor.update(now, 0.016, 0);
      this.selfActor.greet(now);
    }

    this.spawnBubbleAbove(this.selfActor.group, '🙏 평안하신지요', 2.6);
    this.spawnGroundRipple(
      this.selfActor.group.position,
      this.currentPalette.markerHex || 0xffd27d
    );

    this.multiplayerClient?.sendAction('greet', {
      posture: this.posture
    });

    if (this.remotePlayers.size === 0) {
      this.npcWanderers.forEach((npc, idx) => {
        setTimeout(() => {
          if (!npc.actor || !npc.actor.group?.visible) return;
          npc.actor.greet((this.lastElapsed || 0) + 0.35);
          const replies = ['🙏 성불하십시오', '🎋 좋은 바람입니다', '🍵 평안한 산책 되소서'];
          this.spawnBubbleAbove(npc.actor.group, replies[idx % replies.length], 2.5);
          this.spawnGroundRipple(npc.actor.group.position, 0x98f5c4);
        }, 360 + idx * 280);
      });
    }

    this.callbacks.onToast?.(
      `🙏 '${this.profile.name}'님이 걸음을 멈추고 두 손을 모아 합장 인사를 건넵니다.`
    );
  }

  enterAnyangruMeditation() {
    if (!this.selfActor) return;
    this.pendingMeditationOnArrival = false;
    this.waypoints = [];
    this.destinationMarker.visible = false;
    this.posture = 'kneel';

    const selfPos = this.selfActor.group.position;
    const assignedCushion = getAnyangruCushionByIndex(this.occupiedSeatIndex);
    const fallbackCushion = findNearestAnyangruCushion(selfPos.x, selfPos.z).cushion;
    const targetCushion = this.targetCushion || assignedCushion || fallbackCushion;
    this.targetCushion = null;
    this.occupiedSeatIndex = targetCushion.index;

    this.selfActor.group.position.set(
      targetCushion.x,
      ANYANGRU_CONFIG.cushionWorldY,
      targetCushion.z
    );
    this.selfActor.group.rotation.y = 0.0;
    this.cameraController.setFollowOrientation(0.0, 0.04, false);
    this.selfActor.setMode('kneel');
    this.spawnGroundRipple(
      this.selfActor.group.position,
      this.currentPalette.markerHex || 0xffd27d
    );
    this.callbacks.onBreathingToggle?.(true);
    this.notifySeatStateChanged();
    this.notifyPostureChanged();
    this.publishImmediateSelfState();
  }

  standUpFromMeditation() {
    if (!this.selfActor) return;
    this.pendingMeditationOnArrival = false;
    this.targetCushion = null;
    this.activeHallSeatIndex = null;
    this.targetHallCushion = null;
    this.pendingHallMeditationOnArrival = false;
    this.waypoints = [];
    this.destinationMarker.visible = false;
    this.releaseOccupiedSeat();

    if (this.posture !== 'walk') {
      this.posture = 'walk';
      this.selfActor.setMode('walk');
      this.callbacks.onBreathingToggle?.(false);
    }

    this.notifyPostureChanged();
    this.publishImmediateSelfState();
  }

  getIndoorSeatInfo(hallSeatIndex) {
    const isMine =
      (this.posture === 'kneel' && this.activeHallSeatIndex === hallSeatIndex) ||
      (this.pendingHallMeditationOnArrival && this.targetHallCushion?.index === hallSeatIndex);
    return { status: isMine ? 'mine' : 'empty' };
  }

  enterHallMeditation() {
    if (!this.selfActor || !this.targetHallCushion) return;
    const cushion = this.targetHallCushion;
    this.pendingHallMeditationOnArrival = false;
    this.pendingMeditationOnArrival = false;
    this.waypoints = [];
    this.destinationMarker.visible = false;
    this.posture = 'kneel';
    this.activeHallSeatIndex = cushion.index;

    const sitY = MURYANGSUJEON_CONFIG.interior.floorY + 0.08;
    this.selfActor.group.position.set(cushion.x, sitY, cushion.z);
    this.selfActor.group.rotation.y = cushion.yaw;
    this.cameraController.setFollowOrientation(cushion.yaw, 0.06, false);
    this.selfActor.setMode('kneel');
    this.spawnGroundRipple(
      this.selfActor.group.position,
      this.currentPalette.markerHex || 0xffd27d
    );
    this.callbacks.onBreathingToggle?.(true);
    this.notifyPostureChanged();
    this.publishImmediateSelfState();
  }

  sitAtHallCushion(hallSeatIndex) {
    if (!this.selfActor) return false;
    const cushions = MURYANGSUJEON_CONFIG.interior?.cushions || [];
    const cushion = cushions.find((c) => c.index === hallSeatIndex);
    if (!cushion) return false;

    if (
      (this.posture === 'kneel' && this.activeHallSeatIndex === hallSeatIndex) ||
      (this.pendingHallMeditationOnArrival && this.targetHallCushion?.index === hallSeatIndex)
    ) {
      this.standUpFromMeditation();
      return true;
    }

    if (this.occupiedSeatIndex !== null) {
      this.targetCushion = null;
      this.releaseOccupiedSeat();
    }

    this.targetHallCushion = cushion;
    this.pendingHallMeditationOnArrival = true;
    this.activeHallSeatIndex = cushion.index;

    const selfPos = this.selfActor.group.position;
    const dist = Math.hypot(selfPos.x - cushion.x, selfPos.z - cushion.z);
    if (dist <= 0.48) {
      this.enterHallMeditation();
    } else {
      const targetVec = new C_ENGINE.Vector3(
        cushion.x,
        MURYANGSUJEON_CONFIG.interior.floorY + 0.08,
        cushion.z
      );
      this.startJourneyToPoint(targetVec, null, null, true);
    }
    return true;
  }

  async sitAtAutoSeat() {
    if (!this.selfActor || this.seatRequestInFlight) return false;
    this.seatRequestInFlight = true;

    const selfPos = this.selfActor.group.position;
    let res;
    try {
      if (this.multiplayerClient) {
        res = await this.multiplayerClient.requestSeat({
          mode: 'auto',
          x: selfPos.x,
          z: selfPos.z
        });
      } else {
        const { cushion } = selectPriorityAnyangruCushion(selfPos.x, selfPos.z, new Set());
        res = cushion ? { ok: true, seatIndex: cushion.index } : { ok: false, reason: 'full' };
      }
    } finally {
      this.seatRequestInFlight = false;
    }

    if (!res?.ok) {
      return false;
    }

    const cushion = getAnyangruCushionByIndex(res.seatIndex);
    if (!cushion) return false;

    if (this.posture === 'kneel' && this.occupiedSeatIndex === cushion.index) {
      return true;
    }

    this.occupiedSeatIndex = cushion.index;
    this.targetCushion = cushion;
    this.notifySeatStateChanged();
    this.publishImmediateSelfState();

    const dist = Math.hypot(selfPos.x - cushion.x, selfPos.z - cushion.z);
    if (dist <= 0.48) {
      this.enterAnyangruMeditation();
    } else {
      const cushionTarget = new C_ENGINE.Vector3(
        cushion.x,
        ANYANGRU_CONFIG.cushionWorldY,
        cushion.z
      );
      this.startJourneyToPoint(cushionTarget, 'anyangnu_cushion', null, true);
    }

    return true;
  }

  async sitAtSpecificSeat(seatIndex) {
    const cushion = getAnyangruCushionByIndex(seatIndex);
    if (!cushion || !this.selfActor) return false;

    // 이미 내가 앉아 있거나 이동 중인 방석을 다시 누르면 자리에서 일어섬
    if (this.occupiedSeatIndex === seatIndex && this.isMeditatingOrHeading) {
      this.standUpFromMeditation();
      return true;
    }

    const seatInfo = this.getSeatInfo(seatIndex);
    if (seatInfo?.status === 'occupied') {
      if (seatInfo.peerId && this.remotePlayers.has(seatInfo.peerId)) {
        this.revealNpcLabel(this.remotePlayers.get(seatInfo.peerId), 3200);
      }
      this.callbacks.onToast?.(
        `🙏 이미 '${seatInfo.occupantName}'님이 명상 중인 자리입니다. 다른 방석을 선택해 주세요.`
      );
      return false;
    }

    if (this.seatRequestInFlight) return false;
    this.seatRequestInFlight = true;

    const selfPos = this.selfActor.group.position;
    let res;
    try {
      if (this.multiplayerClient) {
        res = await this.multiplayerClient.requestSeat({
          mode: 'manual',
          seatIndex,
          x: selfPos.x,
          z: selfPos.z
        });
      } else {
        res = { ok: true, seatIndex };
      }
    } finally {
      this.seatRequestInFlight = false;
    }

    if (!res?.ok) {
      if (res?.reason === 'occupied') {
        this.callbacks.onToast?.(
          `🙏 방금 '${res.occupantName || '다른 나그네'}'님이 먼저 앉은 자리입니다. 다른 방석을 선택해 주세요.`
        );
      } else {
        this.callbacks.onToast?.('🙏 선택한 방석에 앉을 수 없습니다.');
      }
      this.notifySeatStateChanged();
      return false;
    }

    this.occupiedSeatIndex = cushion.index;
    this.targetCushion = cushion;
    this.notifySeatStateChanged();
    this.publishImmediateSelfState();

    const dist = Math.hypot(selfPos.x - cushion.x, selfPos.z - cushion.z);
    if (dist <= 0.48) {
      this.enterAnyangruMeditation();
    } else {
      const cushionTarget = new C_ENGINE.Vector3(
        cushion.x,
        ANYANGRU_CONFIG.cushionWorldY,
        cushion.z
      );
      this.startJourneyToPoint(cushionTarget, 'anyangnu_cushion', null, true);
    }

    return true;
  }

  togglePosture() {
    if (!this.selfActor) return;

    if (
      this.posture === 'kneel' ||
      this.pendingMeditationOnArrival ||
      this.pendingHallMeditationOnArrival
    ) {
      this.standUpFromMeditation();
      return;
    }

    // 캐릭터가 청풍사 실내에 있을 때는 가장 가까운 실내 방석에 앉아 명상하기
    const selfPos = this.selfActor.group.position;
    const hallInt = MURYANGSUJEON_CONFIG.interior;
    if (
      hallInt &&
      selfPos.x >= hallInt.minX - 0.5 &&
      selfPos.x <= hallInt.maxX + 0.5 &&
      selfPos.z >= hallInt.thresholdStartZ &&
      selfPos.z <= hallInt.maxZ + 0.5 &&
      Array.isArray(hallInt.cushions) &&
      hallInt.cushions.length > 0
    ) {
      let nearest = hallInt.cushions[0];
      let bestDist = Infinity;
      for (const c of hallInt.cushions) {
        const d = Math.hypot(selfPos.x - c.x, selfPos.z - c.z);
        if (d < bestDist) {
          bestDist = d;
          nearest = c;
        }
      }
      this.sitAtHallCushion(nearest.index);
      return;
    }

    this.sitAtAutoSeat();
  }

  cyclePalette() {
    this.profile.paletteIdx = (this.profile.paletteIdx + 1) % WANDERER_PALETTES.length;
    this.saveProfile();

    if (this.selfActor) {
      applyWandererPalette(this.selfActor, this.currentPalette);
      this.spawnGroundRipple(this.selfActor.group.position, this.currentPalette.markerHex);
    }

    this.publishImmediateSelfState();
    this.callbacks.onToast?.(`🎋 '${this.currentPalette.fullName}' 차림으로 갈아입었습니다.`);
  }

  spawnBubbleAbove(targetGroup, text, duration = 2.4) {
    if (!targetGroup) return;
    const sprite = createWandererBubbleSprite(text);
    sprite.position.set(0, 1.72, 0);
    targetGroup.add(sprite);
    this.activeBubbles.push({
      sprite,
      parent: targetGroup,
      age: 0,
      duration
    });
  }

  spawnGroundRipple(pos, colorHex = 0xffd27d) {
    const geo = new C_ENGINE.RingGeometry(0.18, 0.26, 40);
    const mat = new C_ENGINE.MeshBasicMaterial({
      color: colorHex,
      side: C_ENGINE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const mesh = new C_ENGINE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, pos.y + 0.04, pos.z);
    this.rootGroup.add(mesh);
    this.greetingRipples.push({ mesh, mat, age: 0, duration: 1.25 });
  }

  updateFrame(elapsed, dt) {
    this.lastElapsed = elapsed;
    if (!this.selfActor || !this.selfActor.group) return;

    const selfPos = this.selfActor.group.position;
    const isMobileScreen = this.isMobileViewport();
    const activeMoveSpeed = this.getEffectiveMoveSpeed();
    this.moveSpeed = activeMoveSpeed;
    const speedScale = activeMoveSpeed / this.mobileMoveSpeed;

    // 1. WASD 또는 클릭 목적지 경로 기반 이동 속도 산출
    let moveX = 0;
    let moveZ = 0;
    const forwardInput = (this.keys.w ? 1 : 0) - (this.keys.s ? 1 : 0);
    const strafeInput = (this.keys.d ? 1 : 0) - (this.keys.a ? 1 : 0);

    if (forwardInput !== 0 || strafeInput !== 0) {
      const yaw = this.cameraController.yaw;
      const fwdX = -Math.sin(yaw);
      const fwdZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);

      moveX = fwdX * forwardInput + rightX * strafeInput;
      moveZ = fwdZ * forwardInput + rightZ * strafeInput;
      const len = Math.hypot(moveX, moveZ) || 1;
      moveX = (moveX / len) * activeMoveSpeed;
      moveZ = (moveZ / len) * activeMoveSpeed;
    } else if (this.waypoints.length > 0 && this.posture === 'walk') {
      const target = this.waypoints[0];
      const dx = target.x - selfPos.x;
      const dz = target.z - selfPos.z;
      const distSq = dx * dx + dz * dz;

      if (distSq <= 0.03) {
        selfPos.x = target.x;
        selfPos.z = target.z;
        selfPos.y = getGroundHeightAt(selfPos.x, selfPos.z);
        this.waypoints.shift();

        if (this.waypoints.length === 0) {
          this.destinationMarker.visible = false;
          this.spawnGroundRipple(selfPos, this.currentPalette.markerHex || 0xffd27d);
          if (this.pendingHallMeditationOnArrival) {
            this.enterHallMeditation();
            return;
          }
          if (this.pendingMeditationOnArrival) {
            this.enterAnyangruMeditation();
            return;
          }
        }
      } else {
        const dist = Math.sqrt(distSq);
        const stepSpeed = Math.min(
          activeMoveSpeed,
          Math.max(0.95 * speedScale, dist * 3.2 * speedScale)
        );
        moveX = (dx / dist) * stepSpeed;
        moveZ = (dz / dist) * stepSpeed;
      }
    }

    // 2. 위치 적분, 충돌 해소 및 보행 방향 회전
    const damp = Math.exp(-dt * 10);
    this.velocity.x = this.velocity.x * damp + moveX * (1 - damp);
    this.velocity.z = this.velocity.z * damp + moveZ * (1 - damp);

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > 0.03 && this.posture === 'walk') {
      const prevX = selfPos.x;
      const prevZ = selfPos.z;
      const nextX = prevX + this.velocity.x * dt;
      const nextZ = prevZ + this.velocity.z * dt;
      const moveAllowedSeat =
        this.pendingHallMeditationOnArrival && this.targetHallCushion
          ? `hall:${this.targetHallCushion.index}`
          : this.pendingMeditationOnArrival && this.targetCushion
            ? this.targetCushion.index
            : null;
      const clamped = clampWalkableXZ(nextX, nextZ, prevX, prevZ, moveAllowedSeat);
      selfPos.x = clamped.x;
      selfPos.z = clamped.z;

      const actualDx = clamped.x - prevX;
      const actualDz = clamped.z - prevZ;
      const actualMoveLen = Math.hypot(actualDx, actualDz);
      const rotDirX = actualMoveLen > 0.0005 ? actualDx : this.velocity.x;
      const rotDirZ = actualMoveLen > 0.0005 ? actualDz : this.velocity.z;

      const targetRotY = Math.atan2(-rotDirX, -rotDirZ);
      const angleDiff = Math.atan2(
        Math.sin(targetRotY - this.selfActor.group.rotation.y),
        Math.cos(targetRotY - this.selfActor.group.rotation.y)
      );
      this.selfActor.group.rotation.y += angleDiff * (1 - Math.exp(-dt * 10));

      this.cameraController.alignBehindHeading(this.selfActor.group.rotation.y, dt);
    } else {
      this.velocity.set(0, 0, 0);
    }

    const targetGroundY = getGroundHeightAt(selfPos.x, selfPos.z);
    selfPos.y += (targetGroundY - selfPos.y) * (1 - Math.exp(-dt * 16));

    const normalizedSpeed = Math.min(1, speed / activeMoveSpeed);
    this.selfActor.update(elapsed, dt, normalizedSpeed);
    if (this.posture === 'walk' && normalizedSpeed > 0.02) {
      applyWiderWalkingStride(this.selfActor, normalizedSpeed * (isMobileScreen ? 1.0 : 1.18));
    }

    const isActivelyWalking = speed > 0.06 || this.waypoints.length > 0;
    document.body.classList.toggle('wanderer-walking', isActivelyWalking);

    // 3. 목적지 포인트 마커 애니메이션
    if (this.destinationMarker.visible) {
      const { ringMesh, dotMesh, waveMesh, waveMat, beamMat } = this.destinationMarker.userData;
      const mobileScale = isMobileScreen ? 1.38 : 1.0;
      this.destinationMarker.scale.setScalar(mobileScale);

      const pulse = 1 + Math.sin(elapsed * 5.0) * 0.08;
      ringMesh.scale.setScalar(pulse);
      dotMesh.scale.setScalar(1 + Math.cos(elapsed * 5.0) * 0.14);

      const wavePhase = (elapsed * 0.95) % 1;
      waveMesh.scale.setScalar(1 + wavePhase * 1.5);
      waveMat.opacity = (1 - wavePhase) * 0.72;

      if (beamMat) {
        beamMat.opacity = 0.34 + Math.sin(elapsed * 4.0) * 0.14;
      }
    }

    // 4. 동료 나그네 NPC 패트롤 업데이트 (원격 접속자가 없을 때만 활성화)
    if (this.remotePlayers.size === 0) {
      this.npcWanderers.forEach((npc) => {
        if (!npc.actor || !npc.actor.group || !npc.actor.group.visible) return;
        const nPos = npc.actor.group.position;

        if (elapsed > npc.nextMoveTime) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * npc.patrolRadius;
          const tx = npc.homePos.x + Math.cos(angle) * r;
          const tz = npc.homePos.z + Math.sin(angle) * r;
          const clamped = clampWalkableXZ(tx, tz);
          npc.targetPos.set(clamped.x, getGroundHeightAt(clamped.x, clamped.z), clamped.z);
          npc.nextMoveTime = elapsed + 6.0 + Math.random() * 6.5;
        }

        const dx = npc.targetPos.x - nPos.x;
        const dz = npc.targetPos.z - nPos.z;
        const dist = Math.hypot(dx, dz);

        let npcNormSpeed = 0;
        if (dist > 0.12) {
          const step = Math.min(dist, npc.speed * dt);
          const nextNpcX = nPos.x + (dx / dist) * step;
          const nextNpcZ = nPos.z + (dz / dist) * step;
          const clampedNpc = clampWalkableXZ(nextNpcX, nextNpcZ, nPos.x, nPos.z);
          nPos.x = clampedNpc.x;
          nPos.z = clampedNpc.z;
          nPos.y = getGroundHeightAt(nPos.x, nPos.z);

          const targetYaw = Math.atan2(-dx, -dz);
          const diff = Math.atan2(
            Math.sin(targetYaw - npc.actor.group.rotation.y),
            Math.cos(targetYaw - npc.actor.group.rotation.y)
          );
          npc.actor.group.rotation.y += diff * (1 - Math.exp(-dt * 8));
          npcNormSpeed = 0.68;
        }

        npc.actor.update(elapsed + npc.seed, dt, npcNormSpeed);
        if (npcNormSpeed > 0.02) {
          applyWiderWalkingStride(npc.actor, npcNormSpeed);
        }
      });
    }

    // 4-1. 같은 산방에 접속한 원격 나그네(최대 20명) 60fps 보간 업데이트
    if (this.remotePlayers.size > 0) {
      const posBlend = 1 - Math.exp(-dt * 11);
      const rotBlend = 1 - Math.exp(-dt * 12);

      for (const peer of this.remotePlayers.values()) {
        const grp = peer.actor?.group;
        if (!grp) continue;

        let remoteNormSpeed = 0;
        if (peer.posture === 'kneel' && Number.isInteger(peer.seatIndex)) {
          const seat = getAnyangruCushionByIndex(peer.seatIndex);
          if (seat) {
            grp.position.x += (seat.x - grp.position.x) * posBlend;
            grp.position.z += (seat.z - grp.position.z) * posBlend;
            grp.position.y += (ANYANGRU_CONFIG.cushionWorldY - grp.position.y) * posBlend;
            const yawDiff = Math.atan2(Math.sin(-grp.rotation.y), Math.cos(-grp.rotation.y));
            grp.rotation.y += yawDiff * rotBlend;
          }
        } else {
          const dx = peer.targetPos.x - grp.position.x;
          const dz = peer.targetPos.z - grp.position.z;
          const dist = Math.hypot(dx, dz);

          if (dist > 9.0) {
            grp.position.copy(peer.targetPos);
          } else if (dist > 0.014) {
            grp.position.x += dx * posBlend;
            grp.position.z += dz * posBlend;
            grp.position.y = getGroundHeightAt(grp.position.x, grp.position.z);
            remoteNormSpeed = Math.min(1, (dist * 3.8) / this.pcMoveSpeed);
          } else {
            const groundY = getGroundHeightAt(grp.position.x, grp.position.z);
            grp.position.y += (groundY - grp.position.y) * posBlend;
          }

          const yawDiff = Math.atan2(
            Math.sin(peer.targetYaw - grp.rotation.y),
            Math.cos(peer.targetYaw - grp.rotation.y)
          );
          grp.rotation.y += yawDiff * rotBlend;
        }

        peer.actor.update(elapsed + peer.animSeed, dt, remoteNormSpeed);
        if (peer.posture === 'walk' && remoteNormSpeed > 0.03) {
          applyWiderWalkingStride(peer.actor, remoteNormSpeed);
        }
      }
    }

    // 4-2. 로컬 플레이어 상태 100ms 쓰로틀 송신 (정지·명상 중 패킷 0바이트)
    if (this.multiplayerClient) {
      this.multiplayerClient.publishSelfState(
        {
          name: this.profile.name,
          paletteIdx: this.profile.paletteIdx,
          x: selfPos.x,
          z: selfPos.z,
          yaw: this.selfActor.group.rotation.y,
          posture: this.posture,
          seatIndex: this.occupiedSeatIndex
        },
        false
      );
    }

    // 5. 말풍선 스프라이트 및 바닥 합장 파문 업데이트
    for (let i = this.activeBubbles.length - 1; i >= 0; i--) {
      const b = this.activeBubbles[i];
      b.age += dt;
      b.sprite.position.y = 1.98 + b.age * 0.12;
      if (b.age > b.duration - 0.45) {
        b.sprite.material.opacity = Math.max(0, (b.duration - b.age) / 0.45);
      }
      if (b.age >= b.duration) {
        b.parent.remove(b.sprite);
        b.sprite.material.map?.dispose();
        b.sprite.material.dispose();
        this.activeBubbles.splice(i, 1);
      }
    }

    for (let i = this.greetingRipples.length - 1; i >= 0; i--) {
      const r = this.greetingRipples[i];
      r.age += dt;
      const t = r.age / r.duration;
      r.mesh.scale.setScalar(1 + t * 3.8);
      r.mat.opacity = Math.max(0, (1 - t) * 0.75);
      if (r.age >= r.duration) {
        this.rootGroup.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mat.dispose();
        this.greetingRipples.splice(i, 1);
      }
    }
  }
}
