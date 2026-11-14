/**
 * CameraController — 3인칭 산사 나그네 추적 시점('follow') 및 3D 소원 연등 포커스 시점('lanternFocus') 통합 제어
 */

import { MURYANGSUJEON_CONFIG } from '../config/worldConfig.js';

const C_ENGINE = window.SANSA_CORE;

export class CameraController {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.camera = sceneManager.camera;

    // 'follow' (3인칭 나그네 추적) | 'lanternFocus' (연등 카드 열람 시 포커스)
    this.mode = 'follow';
    this.isDragging = false;

    // 3인칭 시점 상태
    this.yaw = 0.0;
    this.pitch = 0.02;
    this.distance = 3.65;
    this.camInitialized = false;

    // 현재 보간된 카메라 위치 및 시선 목표점
    this.camPos = new C_ENGINE.Vector3(0, 2.55, 8.5);
    this.camLook = new C_ENGINE.Vector3(0, 2.15, -22);

    // 연등 포커스 모드 목표점 및 미세 시선 오프셋
    this.focusTargetPos = this.camPos.clone();
    this.focusTargetLook = this.camLook.clone();
    this.yawOffset = 0;
    this.pitchOffset = 0;
    this.zoomOffset = 0;
    this.targetYawOffset = 0;
    this.targetPitchOffset = 0;
    this.targetZoomOffset = 0;

    // 멀티터치 핀치 상태
    this.pinchBaseValue = this.distance;

    // 추적 대상 나그네 상태 공급자 콜백 ({ position, posture })
    this.followSubjectProvider = null;
  }

  setFollowSubjectProvider(providerFn) {
    this.followSubjectProvider = providerFn;
  }

  setFollowOrientation(yaw = 0.0, pitch = 0.02, immediate = false) {
    this.yaw = yaw;
    this.pitch = pitch;
    this.mode = 'follow';
    if (immediate) {
      this.camInitialized = false;
    }
  }

  returnToFollow() {
    this.mode = 'follow';
    this.targetYawOffset = 0;
    this.targetPitchOffset = 0;
    this.targetZoomOffset = 0;
  }

  focusOnLantern(worldPos) {
    if (!worldPos) return;
    this.mode = 'lanternFocus';
    this.yawOffset = 0;
    this.pitchOffset = 0;
    this.zoomOffset = 0;
    this.targetYawOffset = 0;
    this.targetPitchOffset = 0;
    this.targetZoomOffset = 0;

    const aspect = this.sceneManager.width / Math.max(1, this.sceneManager.height);
    const mobileOffset = aspect < 0.85 ? 1.25 : 0;

    this.focusTargetPos.set(
      worldPos.x * 0.96,
      worldPos.y - 0.35,
      worldPos.z + 3.6 + mobileOffset
    );
    this.focusTargetLook.set(worldPos.x, worldPos.y - 0.05, worldPos.z - 2.8);
  }

  /**
   * 캐릭터가 보행 중일 때 수동 드래그 중이 아니면 캐릭터 등 뒤로 카메라 방향을 부드럽게 정렬
   */
  alignBehindHeading(characterRotationY, dt) {
    if (this.mode !== 'follow' || this.isDragging) return;
    const camAngleDiff = Math.atan2(
      Math.sin(characterRotationY - this.yaw),
      Math.cos(characterRotationY - this.yaw)
    );
    this.yaw += camAngleDiff * (1 - Math.exp(-dt * 2.6));
  }

  handleDrag(dx, dy, isTouch = false) {
    if (this.mode === 'lanternFocus') {
      this.targetYawOffset = Math.max(-0.68, Math.min(0.68, this.targetYawOffset - dx * 0.0028));
      this.targetPitchOffset = Math.max(
        -0.32,
        Math.min(0.36, this.targetPitchOffset - dy * 0.0022)
      );
      return;
    }

    const rotSpeed = isTouch ? 0.0068 : 0.0055;
    this.yaw -= dx * rotSpeed;
    this.pitch = Math.max(-0.22, Math.min(0.34, this.pitch + dy * 0.0038));
  }

  handleWheel(deltaY) {
    if (this.mode === 'lanternFocus') {
      this.targetZoomOffset = Math.max(
        -3.2,
        Math.min(4.8, this.targetZoomOffset + deltaY * 0.0035)
      );
      return;
    }

    this.distance = Math.max(2.1, Math.min(9.5, this.distance + deltaY * 0.0028));
  }

  beginPinch() {
    this.pinchBaseValue = this.mode === 'lanternFocus' ? this.targetZoomOffset : this.distance;
  }

  updatePinch(pixelDelta) {
    if (this.mode === 'lanternFocus') {
      const zoomDelta = pixelDelta * 0.025;
      this.targetZoomOffset = Math.max(-3.2, Math.min(4.8, this.pinchBaseValue + zoomDelta));
      return;
    }

    const distDelta = pixelDelta * 0.012;
    this.distance = Math.max(2.1, Math.min(9.0, this.pinchBaseValue + distDelta));
  }

  update(elapsed, dt) {
    if (this.mode === 'lanternFocus') {
      this.updateLanternFocusCamera(elapsed, dt);
    } else {
      this.updateFollowCamera(dt);
    }
  }

  updateFollowCamera(dt) {
    const subject = this.followSubjectProvider ? this.followSubjectProvider() : null;
    if (!subject || !subject.position) return;

    const selfPos = subject.position;
    const posture = subject.posture || 'walk';
    const isMobileScreen =
      window.innerWidth <= 768 || (this.camera && this.camera.aspect < 0.88);

    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    const effectiveDist = isMobileScreen ? this.distance * 0.86 : this.distance;
    const camHeightOffset = isMobileScreen
      ? (posture === 'walk' ? 1.62 : 1.32)
      : (posture === 'walk' ? 1.88 : 1.48);
    const lookHeightOffset = isMobileScreen
      ? (posture === 'walk' ? 0.54 : 0.68)
      : (posture === 'walk' ? 1.13 : 1.24);
    const extraZoomHeight = Math.max(0, effectiveDist - 3.3) * 0.22;

    let desiredCamX = selfPos.x + sinYaw * effectiveDist;
    const desiredCamY = selfPos.y + camHeightOffset + extraZoomHeight + this.pitch * 3.0;
    let desiredCamZ = selfPos.z + cosYaw * effectiveDist;

    // 무량수전 4면 벽체 내부로 카메라가 파고들지 않도록 광선 슬라이딩 보정
    const hall = MURYANGSUJEON_CONFIG.hallCollisionBox;
    const pad = 0.42;
    const hMinX = hall.minX - pad;
    const hMaxX = hall.maxX + pad;
    const hMinZ = hall.minZ - pad;
    const hMaxZ = hall.maxZ + pad;

    if (
      desiredCamX > hMinX &&
      desiredCamX < hMaxX &&
      desiredCamZ > hMinZ &&
      desiredCamZ < hMaxZ &&
      desiredCamY < 7.2
    ) {
      const rayDx = desiredCamX - selfPos.x;
      const rayDz = desiredCamZ - selfPos.z;
      let tEnter = 1.0;
      if (Math.abs(rayDx) > 1e-4) {
        const tx1 = (hMinX - selfPos.x) / rayDx;
        const tx2 = (hMaxX - selfPos.x) / rayDx;
        const tNearX = Math.min(tx1, tx2);
        if (tNearX >= 0 && tNearX < tEnter) {
          const zAtX = selfPos.z + rayDz * tNearX;
          if (zAtX >= hMinZ && zAtX <= hMaxZ) tEnter = tNearX;
        }
      }
      if (Math.abs(rayDz) > 1e-4) {
        const tz1 = (hMinZ - selfPos.z) / rayDz;
        const tz2 = (hMaxZ - selfPos.z) / rayDz;
        const tNearZ = Math.min(tz1, tz2);
        if (tNearZ >= 0 && tNearZ < tEnter) {
          const xAtZ = selfPos.x + rayDx * tNearZ;
          if (xAtZ >= hMinX && xAtZ <= hMaxX) tEnter = tNearZ;
        }
      }
      const safeT = Math.max(0.18, tEnter * 0.92);
      desiredCamX = selfPos.x + rayDx * safeT;
      desiredCamZ = selfPos.z + rayDz * safeT;
    }

    const lookTargetX = selfPos.x - sinYaw * 3.0;
    const lookTargetY = selfPos.y + lookHeightOffset - this.pitch * 1.7;
    const lookTargetZ = selfPos.z - cosYaw * 3.0;

    const camSmooth = this.camInitialized ? 1 - Math.exp(-dt * 12) : 1.0;
    this.camInitialized = true;

    this.camPos.x += (desiredCamX - this.camPos.x) * camSmooth;
    this.camPos.y += (desiredCamY - this.camPos.y) * camSmooth;
    this.camPos.z += (desiredCamZ - this.camPos.z) * camSmooth;

    this.camLook.x += (lookTargetX - this.camLook.x) * camSmooth;
    this.camLook.y += (lookTargetY - this.camLook.y) * camSmooth;
    this.camLook.z += (lookTargetZ - this.camLook.z) * camSmooth;

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.camera.updateMatrixWorld(true);
  }

  updateLanternFocusCamera(elapsed, dt) {
    const damp = 1 - Math.exp(-dt * 4.5);
    this.camPos.lerp(this.focusTargetPos, damp);
    this.camLook.lerp(this.focusTargetLook, damp);
    this.yawOffset += (this.targetYawOffset - this.yawOffset) * damp;
    this.pitchOffset += (this.targetPitchOffset - this.pitchOffset) * damp;
    this.zoomOffset += (this.targetZoomOffset - this.zoomOffset) * damp;

    const viewDir = this.camLook.clone().sub(this.camPos).normalize();
    const finalPos = this.camPos.clone().addScaledVector(viewDir, -this.zoomOffset);
    finalPos.x += Math.sin(elapsed * 0.45) * 0.035;
    finalPos.y += Math.cos(elapsed * 0.38) * 0.025;

    const lookDist = this.camPos.distanceTo(this.camLook);
    const baseYaw = Math.atan2(viewDir.x, viewDir.z) + this.yawOffset;
    const basePitch = Math.asin(Math.max(-0.95, Math.min(0.95, viewDir.y))) + this.pitchOffset;

    const finalLook = new C_ENGINE.Vector3(
      finalPos.x + Math.sin(baseYaw) * Math.cos(basePitch) * lookDist,
      finalPos.y + Math.sin(basePitch) * lookDist,
      finalPos.z + Math.cos(baseYaw) * Math.cos(basePitch) * lookDist
    );

    this.camera.position.copy(finalPos);
    this.camera.lookAt(finalLook);
    this.camera.updateMatrixWorld(true);
  }
}
