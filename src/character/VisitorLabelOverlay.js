/**
 * VisitorLabelOverlay — 3D 캐릭터 삿갓 상단 닉네임 DOM 투영 및 화면 탭 리플 오버레이 관리
 */

import { SANSA_CORE as C_ENGINE } from '../engine/CoreRuntime.js';

export class VisitorLabelOverlay {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.container = null;
    this.selfLabel = null;
    this.revealedTarget = null;
    this.revealedUntil = 0;
    this.projVec = new C_ENGINE.Vector3();
  }

  ensureContainer() {
    if (this.container) return this.container;
    let container = document.getElementById('visitor-labels');
    if (!container) {
      container = document.createElement('div');
      container.id = 'visitor-labels';
      container.className = 'visitor-labels';
      container.setAttribute('aria-hidden', 'true');
      document.getElementById('app-stage')?.appendChild(container);
    }
    this.container = container;
    return container;
  }

  createLabelElement(nameText, isSelf = false) {
    const container = this.ensureContainer();
    if (!container) return null;
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
    container.appendChild(el);
    return { el, nameSpan };
  }

  reset(selfName, npcWanderers, remotePlayers) {
    const container = this.ensureContainer();
    container.innerHTML = '';

    this.selfLabel = this.createLabelElement(selfName, true);
    npcWanderers.forEach((npc) => {
      npc.labelObj = this.createLabelElement(npc.name, false);
    });
    remotePlayers.forEach((peer) => {
      peer.labelObj = this.createLabelElement(peer.name, false);
    });
  }

  reveal(target, durationMs = 3000) {
    if (!target) return;
    this.revealedTarget = target;
    this.revealedUntil = performance.now() + durationMs;
  }

  clearIfRevealed(target) {
    if (this.revealedTarget === target) {
      this.revealedTarget = null;
    }
  }

  update({ selfActor, selfName, selfKneeling, npcWanderers, remotePlayers }) {
    const camera = this.sceneManager.camera;
    if (!this.container || !camera) return;

    const vw = this.sceneManager.width || window.innerWidth;
    const vh = this.sceneManager.height || window.innerHeight;
    if (vw <= 0 || vh <= 0) return;

    const now = performance.now();
    if (this.revealedTarget && now >= this.revealedUntil) {
      this.revealedTarget = null;
    }

    const projectActorHatTop = (actor, labelObj, isSelf, opacity = 1.0, isKneeling = false) => {
      if (!actor || !actor.group || !labelObj || !actor.group.visible) {
        if (labelObj?.el) labelObj.el.hidden = true;
        return;
      }

      if (!actor.cachedHeadBone) {
        actor.cachedHeadBone = actor.group.getObjectByName('head') || null;
      }

      const pt = this.projVec;
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

      const dist = camera.position.distanceTo(pt);
      if (!isSelf && dist > 54) {
        labelObj.el.hidden = true;
        return;
      }

      pt.project(camera);
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
      if (this.selfLabel.nameSpan.textContent !== selfName) {
        this.selfLabel.nameSpan.textContent = selfName;
      }
      projectActorHatTop(selfActor, this.selfLabel, true, 1.0, selfKneeling);
    }

    npcWanderers.forEach((npc) => {
      if (!npc.labelObj) return;
      if (this.revealedTarget === npc && now < this.revealedUntil) {
        const remaining = this.revealedUntil - now;
        const fadeOpacity = remaining < 450 ? Math.max(0, remaining / 450) : 0.96;
        projectActorHatTop(npc.actor, npc.labelObj, false, fadeOpacity, false);
      } else {
        npc.labelObj.el.hidden = true;
      }
    });

    remotePlayers.forEach((peer) => {
      if (!peer.labelObj) return;
      if (this.revealedTarget === peer && now < this.revealedUntil) {
        const remaining = this.revealedUntil - now;
        const fadeOpacity = remaining < 450 ? Math.max(0, remaining / 450) : 0.96;
        projectActorHatTop(peer.actor, peer.labelObj, false, fadeOpacity, peer.posture === 'kneel');
      } else {
        peer.labelObj.el.hidden = true;
      }
    });
  }

  spawnTapRipple(clientX, clientY) {
    const el = document.createElement('div');
    el.className = 'ground-tap-ripple';
    el.style.left = `${clientX}px`;
    el.style.top = `${clientY}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 580);
  }
}
