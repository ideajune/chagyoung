/**
 * CameraController — 3인칭 산사 나그네 추적 시점('follow') 및 3D 소원 연등 포커스 시점('lanternFocus') 통합 제어
 */

import { MURYANGSUJEON_CONFIG } from '../config/worldConfig.js';

import { SANSA_CORE as C_ENGINE } from './CoreRuntime.js';

export class CameraController {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.camera = sceneManager.camera;

    // 'follow' (3인칭 나그네 추적) | 'lanternFocus' (연등 카드 열람 시 포커스)
    this.mode = 'follow';
    this.isDragging = false;

    // 3인칭 시점 상태 및 줌아웃 범위 (기존 대비 줌아웃 폭 약 50% 축소)
    this.yaw = 0.0;
    this.pitch = 0.02;
    this.targetFollowYaw = null;
    this.targetFollowPitch = null;
    this.postureBlend = 0; // 0 = walk, 1 = kneel (착석·기립 시 카메라 높이 부드러운 보간)
    this.minDistance = 2.0;
    this.maxDistance = 11.8;
    this.defaultDistance = 3.65;
    this.distance = this.defaultDistance;
    this.wallBlockedRatio = 0;
    this.currentFov = this.camera ? this.camera.fov : 48;
    this.camInitialized = false;
    this.fovInitialized = false;

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
    this.mode = 'follow';
    if (immediate) {
      this.yaw = yaw;
      this.pitch = pitch;
      this.targetFollowYaw = null;
      this.targetFollowPitch = null;
      this.camInitialized = false;
      this.fovInitialized = false;
    } else {
      // 즉시 스냅하지 않고 최단 회전 경로로 부드럽게 선회 (착석 시 카메라 튐 방지)
      this.targetFollowYaw = yaw;
      this.targetFollowPitch = pitch;
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
    this.targetFollowYaw = null;
    this.targetFollowPitch = null;
    const camAngleDiff = Math.atan2(
      Math.sin(characterRotationY - this.yaw),
      Math.cos(characterRotationY - this.yaw)
    );
    this.yaw += camAngleDiff * (1 - Math.exp(-dt * 2.6));
  }

  getZoomOutProgress() {
    return Math.max(
      0,
      Math.min(1, (this.distance - 3.8) / Math.max(1, this.maxDistance - 3.8))
    );
  }

  handleDrag(dx, dy, isTouch = false) {
    this.targetFollowYaw = null;
    this.targetFollowPitch = null;
    if (this.mode === 'lanternFocus') {
      this.targetYawOffset = Math.max(-0.85, Math.min(0.85, this.targetYawOffset - dx * 0.0028));
      this.targetPitchOffset = Math.max(
        -0.36,
        Math.min(0.42, this.targetPitchOffset - dy * 0.0022)
      );
      return;
    }

    const rotSpeed = isTouch ? 0.0068 : 0.0072;
    const maxPitch = 0.36 + this.getZoomOutProgress() * 0.30;
    this.yaw -= dx * rotSpeed;
    this.pitch = Math.max(-0.22, Math.min(maxPitch, this.pitch + dy * 0.0050));
  }

  handleWheel(deltaY) {
    if (this.mode === 'lanternFocus') {
      const focusScale = 1 + Math.max(0, this.targetZoomOffset) * 0.05;
      this.targetZoomOffset = Math.max(
        -3.2,
        Math.min(11.5, this.targetZoomOffset + deltaY * 0.0038 * focusScale)
      );
      return;
    }

    const zoomScale = 1 + Math.max(0, this.distance - 4.5) * 0.065;
    this.distance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.distance + deltaY * 0.0032 * zoomScale)
    );
  }

  beginPinch() {
    this.pinchBaseValue = this.mode === 'lanternFocus' ? this.targetZoomOffset : this.distance;
  }

  updatePinch(pixelDelta) {
    if (this.mode === 'lanternFocus') {
      const zoomDelta = pixelDelta * 0.028;
      this.targetZoomOffset = Math.max(-3.2, Math.min(11.5, this.pinchBaseValue + zoomDelta));
      return;
    }

    const pinchScale = 1 + Math.max(0, this.pinchBaseValue - 4.5) * 0.06;
    const distDelta = pixelDelta * 0.016 * pinchScale;
    this.distance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.pinchBaseValue + distDelta)
    );
  }

  /**
   * 2D 선분(캐릭터 -> 희망 카메라 좌표)이 청풍사 본전 4면 벽체를 관통하지 않도록 슬랩 교차 보정
   */
  clipRayAgainstHall(sx, sz, cx, cz) {
    const hall = MURYANGSUJEON_CONFIG.hallCollisionBox;
    const hallInt = MURYANGSUJEON_CONFIG.interior;
    // 전면 열린 중앙 3칸 출입구(어칸·좌우 협칸) 폭: 문턱 출입 시 카메라가 벽에 걸려 튀지 않도록 통과 허용
    const doorwayHalfX = 7.8;

    // 1) 캐릭터가 청풍사 실내에 들어와 있을 때: 줌아웃 시에도 카메라가 4면 벽체·출입구 밖으로 절대 벗어나지 않도록 엄격히 실내 유지
    if (
      hallInt &&
      sx >= hallInt.minX - 0.25 &&
      sx <= hallInt.maxX + 0.25 &&
      sz >= hallInt.minZ &&
      sz <= hallInt.maxZ + 0.25
    ) {
      const padX = 0.65;
      const padZ = 0.55;
      const clampedX = Math.max(hallInt.minX + padX, Math.min(hallInt.maxX - padX, cx));
      const clampedZ = Math.max(hallInt.minZ + padZ, Math.min(hallInt.maxZ - padZ, cz));
      const changed = Math.abs(clampedX - cx) > 0.01 || Math.abs(clampedZ - cz) > 0.01;
      return {
        x: clampedX,
        z: clampedZ,
        blockedRatio: changed ? 0.2 : 0,
        insideHall: true
      };
    }

    // 2) 캐릭터가 전면 열린 출입구 문턱 바로 바깥(z ∈ [3.2, hallInt.minZ))에 있을 때:
    //    열린 출입구 안쪽으로 들어가는 카메라 시선도 급격한 클리핑 없이 자연스럽게 통과
    if (
      hallInt &&
      Math.abs(sx) <= doorwayHalfX &&
      sz >= 3.2 &&
      sz < hallInt.minZ &&
      Math.abs(cx) <= doorwayHalfX
    ) {
      const clampedZ = Math.min(hallInt.maxZ - 0.35, cz);
      return {
        x: cx,
        z: clampedZ,
        blockedRatio: 0,
        insideHall: cz >= hallInt.minZ
      };
    }

    const pad = 0.50;
    const hMinX = hall.minX - pad;
    const hMaxX = hall.maxX + pad;
    const hMinZ = hall.minZ - pad;
    const hMaxZ = hall.maxZ + pad;

    const dx = cx - sx;
    const dz = cz - sz;
    let tMin = 0.0;
    let tMax = 1.0;

    if (Math.abs(dx) < 1e-6) {
      if (sx <= hMinX || sx >= hMaxX) {
        return { x: cx, z: cz, blockedRatio: 0 };
      }
    } else {
      const invDx = 1.0 / dx;
      let tx1 = (hMinX - sx) * invDx;
      let tx2 = (hMaxX - sx) * invDx;
      if (tx1 > tx2) {
        const tmp = tx1;
        tx1 = tx2;
        tx2 = tmp;
      }
      tMin = Math.max(tMin, tx1);
      tMax = Math.min(tMax, tx2);
    }

    if (Math.abs(dz) < 1e-6) {
      if (sz <= hMinZ || sz >= hMaxZ) {
        return { x: cx, z: cz, blockedRatio: 0 };
      }
    } else {
      const invDz = 1.0 / dz;
      let tz1 = (hMinZ - sz) * invDz;
      let tz2 = (hMaxZ - sz) * invDz;
      if (tz1 > tz2) {
        const tmp = tz1;
        tz1 = tz2;
        tz2 = tmp;
      }
      tMin = Math.max(tMin, tz1);
      tMax = Math.min(tMax, tz2);
    }

    if (tMax > tMin && tMin < 1.0 && tMax > 0.0) {
      const safeT = Math.max(0.06, tMin * 0.96);
      return {
        x: sx + dx * safeT,
        z: sz + dz * safeT,
        blockedRatio: Math.max(0, 1.0 - safeT)
      };
    }

    return { x: cx, z: cz, blockedRatio: 0 };
  }

  /**
   * 직사각형 처마 영영 내·외부 부드러운 가중치 산출 (처마/현판/연등 간섭 방지용)
   */
  computeSmoothRectWeight(x, z, minX, maxX, minZ, maxZ, feather = 2.0) {
    const dx = Math.max(minX - x, 0, x - maxX);
    const dz = Math.max(minZ - z, 0, z - maxZ);
    const outDist = Math.hypot(dx, dz);
    if (outDist <= 0) return 1.0;
    if (outDist >= feather) return 0.0;
    const s = outDist / feather;
    return 1.0 - s * s * (3.0 - 2.0 * s);
  }

  /**
   * 줌아웃 거리 변화에 맞춰 원근 왜곡 없이 시원한 광각 파노라마 시야(FOV)를 부드럽게 확장
   */
  updateDynamicFov(dt) {
    if (!this.camera) return;
    const aspect = this.sceneManager.width / Math.max(1, this.sceneManager.height);
    const baseFov = this.sceneManager.getBaseFov
      ? this.sceneManager.getBaseFov(aspect)
      : (aspect < 0.65 ? 64 : aspect < 0.85 ? 58 : 48);

    let extraFov = 0;
    if (this.mode === 'lanternFocus') {
      const focusWideT = Math.max(0, Math.min(1, this.zoomOffset / 11.5));
      const maxFocusAdd = aspect < 0.85 ? 9 : 13;
      extraFov = (1 - Math.pow(1 - focusWideT, 1.5)) * maxFocusAdd;
    } else {
      const zoomOutT = this.getZoomOutProgress();
      const easedWide = 1 - Math.pow(1 - zoomOutT, 1.55);
      const maxFollowAdd = aspect < 0.65 ? 11 : aspect < 0.85 ? 13 : 16;
      const wallReliefAdd = this.wallBlockedRatio * zoomOutT * (aspect < 0.85 ? 3.5 : 5.5);
      extraFov = easedWide * maxFollowAdd + wallReliefAdd;
    }

    const targetFov = Math.min(78, baseFov + extraFov);
    const fovSmooth = this.fovInitialized ? 1 - Math.exp(-dt * 10) : 1.0;
    this.fovInitialized = true;
    this.currentFov = this.camera.fov + (targetFov - this.camera.fov) * fovSmooth;

    if (Math.abs(this.camera.fov - this.currentFov) > 0.015) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }

  update(elapsed, dt) {
    if (this.mode === 'lanternFocus') {
      this.wallBlockedRatio = 0;
      this.updateDynamicFov(dt);
      this.updateLanternFocusCamera(elapsed, dt);
    } else {
      this.updateFollowCamera(dt);
      this.updateDynamicFov(dt);
    }
  }

  updateFollowCamera(dt) {
    const subject = this.followSubjectProvider ? this.followSubjectProvider() : null;
    if (!subject || !subject.position) return;

    const selfPos = subject.position;
    const posture = subject.posture || 'walk';
    const isMobileScreen =
      window.innerWidth <= 768 || (this.camera && this.camera.aspect < 0.88);

    const zoomOutT = this.getZoomOutProgress();

    // 착석·기립 시 카메라 목표 시선(yaw/pitch)을 최단 각도 경로로 부드럽게 선회
    if (!this.isDragging && this.targetFollowYaw !== null) {
      const yawDiff = Math.atan2(
        Math.sin(this.targetFollowYaw - this.yaw),
        Math.cos(this.targetFollowYaw - this.yaw)
      );
      const orientBlend = 1 - Math.exp(-dt * 3.8);
      this.yaw += yawDiff * orientBlend;
      if (this.targetFollowPitch !== null) {
        this.pitch += (this.targetFollowPitch - this.pitch) * orientBlend;
      }
      if (
        Math.abs(yawDiff) < 0.004 &&
        (this.targetFollowPitch === null || Math.abs(this.targetFollowPitch - this.pitch) < 0.004)
      ) {
        this.yaw = this.targetFollowYaw;
        if (this.targetFollowPitch !== null) this.pitch = this.targetFollowPitch;
        this.targetFollowYaw = null;
        this.targetFollowPitch = null;
      }
    }

    const maxPitch = 0.36 + zoomOutT * 0.30;
    if (this.pitch > maxPitch) {
      this.pitch += (maxPitch - this.pitch) * (1 - Math.exp(-dt * 8));
    }

    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    // 모바일에서도 근접 시야 비율(0.86)은 유지하되, 줌아웃 시에는 데스크톱과 동일한 전경 거리까지 확장
    const mobileDistScale = isMobileScreen ? 0.86 + 0.14 * Math.min(1, zoomOutT * 1.4) : 1.0;
    const effectiveDist = this.distance * mobileDistScale;

    // 착석/기립 시 카메라 고도와 시선 높이를 부드럽게 보간 (뚝 떨어지는 현상 방지)
    const targetPostureBlend = posture === 'kneel' ? 1 : 0;
    const postureSmooth = this.camInitialized ? 1 - Math.exp(-dt * 3.6) : 1.0;
    this.postureBlend += (targetPostureBlend - this.postureBlend) * postureSmooth;
    const pb = this.postureBlend;

    const camHeightOffset = isMobileScreen
      ? 1.62 + (1.32 - 1.62) * pb
      : 1.88 + (1.48 - 1.88) * pb;
    const lookHeightOffset = isMobileScreen
      ? 0.54 + (0.68 - 0.54) * pb
      : 1.13 + (1.24 - 1.13) * pb;

    // 줌아웃 구간에 따라 자연스러운 시점 고도 상승 (중거리 완만 -> 원거리 산사 전경 부감 시점)
    const midSpan = Math.max(0, effectiveDist - 3.3);
    const wideSpan = Math.max(0, effectiveDist - 7.5);
    const extraZoomHeight = midSpan * 0.25 + Math.pow(wideSpan, 1.15) * 0.18;

    const rawCamX = selfPos.x + sinYaw * effectiveDist;
    const rawCamZ = selfPos.z + cosYaw * effectiveDist;

    // 청풍사 본전 4면 벽체 관통 방지 슬랩 보정
    const clipped = this.clipRayAgainstHall(selfPos.x, selfPos.z, rawCamX, rawCamZ);
    const desiredCamX = clipped.x;
    const desiredCamZ = clipped.z;
    this.wallBlockedRatio = clipped.blockedRatio;

    const pitchSpan = 3.0 + zoomOutT * 2.2;
    const wallReliefLift = clipped.insideHall ? 0 : this.wallBlockedRatio * zoomOutT * 1.55;
    const actualCamDist = Math.hypot(desiredCamX - selfPos.x, desiredCamZ - selfPos.z);
    const hallExtraZoomHeight = Math.max(0, actualCamDist - 3.3) * 0.22;
    let desiredCamY =
      selfPos.y +
      camHeightOffset +
      (clipped.insideHall ? hallExtraZoomHeight : extraZoomHeight) +
      wallReliefLift +
      this.pitch * pitchSpan;
    if (clipped.insideHall) {
      desiredCamY = Math.min(desiredCamY, 5.45);
    }

    // 1) 청풍사 겹처마·현판 하단 여유 고도 소프트 클램프 (MURYANGSUJEON_CONFIG SSOT 기준)
    const muryangEaveWeight = this.computeSmoothRectWeight(
      desiredCamX,
      desiredCamZ,
      -19.1,
      19.1,
      MURYANGSUJEON_CONFIG.stylobateMinZ - 2.35,
      MURYANGSUJEON_CONFIG.stylobateMaxZ + 2.25,
      0.60
    );
    if (muryangEaveWeight > 0 && desiredCamY > 3.92) {
      desiredCamY += (3.92 - desiredCamY) * muryangEaveWeight;
    }

    // 2) 차경루 처마·소원 연등·현판 하단 여유 고도 소프트 클램프 (마당->누각 진입 구간 부드러운 전이)
    const anyangEaveWeight = this.computeSmoothRectWeight(
      desiredCamX,
      desiredCamZ,
      -19.6,
      19.6,
      -25.4,
      -13.6,
      4.2
    );
    if (anyangEaveWeight > 0 && desiredCamY > 2.98) {
      desiredCamY += (2.98 - desiredCamY) * anyangEaveWeight;
    }

    // 3) 마당·기단·외곽 산자락 지형 바닥 최소 안전 고도 보장
    let floorY = -0.82;
    if (desiredCamZ < -25.0) {
      floorY = -0.82 - Math.min(5.2, (-25.0 - desiredCamZ) * 0.2);
    } else {
      const sideDist = Math.max(0, Math.abs(desiredCamX) - 22.0);
      floorY = -0.82 + Math.min(7.5, Math.pow(sideDist * 0.075, 1.35) * 4.4);
    }
    if (
      desiredCamX >= MURYANGSUJEON_CONFIG.stylobateMinX - 0.4 &&
      desiredCamX <= MURYANGSUJEON_CONFIG.stylobateMaxX + 0.4 &&
      desiredCamZ >= MURYANGSUJEON_CONFIG.stylobateMinZ &&
      desiredCamZ <= MURYANGSUJEON_CONFIG.stylobateMaxZ
    ) {
      floorY = Math.max(floorY, MURYANGSUJEON_CONFIG.verandaY);
    } else if (Math.abs(desiredCamX) < 16.5 && desiredCamZ >= -23.8 && desiredCamZ <= -15.2) {
      floorY = Math.max(floorY, 0.08);
    }
    desiredCamY = Math.max(floorY + 0.65, desiredCamY);

    const lookAheadDist = 3.0 + zoomOutT * 2.4 + this.wallBlockedRatio * zoomOutT * 1.4;
    const lookTargetX = selfPos.x - sinYaw * lookAheadDist;
    const lookTargetY =
      selfPos.y + lookHeightOffset - zoomOutT * 0.35 - this.pitch * (1.7 + zoomOutT * 0.6);
    const lookTargetZ = selfPos.z - cosYaw * lookAheadDist;

    const smoothRate = this.isDragging ? 32 : 14;
    const camSmooth = this.camInitialized ? 1 - Math.exp(-dt * smoothRate) : 1.0;
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

    if (!this._tmpViewDir) {
      this._tmpViewDir = new C_ENGINE.Vector3();
      this._tmpFinalPos = new C_ENGINE.Vector3();
      this._tmpFinalLook = new C_ENGINE.Vector3();
    }

    const viewDir = this._tmpViewDir.copy(this.camLook).sub(this.camPos).normalize();
    const finalPos = this._tmpFinalPos.copy(this.camPos).addScaledVector(viewDir, -this.zoomOffset);
    finalPos.x += Math.sin(elapsed * 0.45) * 0.035;
    finalPos.y += Math.cos(elapsed * 0.38) * 0.025;

    const lookDist = this.camPos.distanceTo(this.camLook);
    const baseYaw = Math.atan2(viewDir.x, viewDir.z) + this.yawOffset;
    const basePitch = Math.asin(Math.max(-0.95, Math.min(0.95, viewDir.y))) + this.pitchOffset;

    const finalLook = this._tmpFinalLook.set(
      finalPos.x + Math.sin(baseYaw) * Math.cos(basePitch) * lookDist,
      finalPos.y + Math.sin(basePitch) * lookDist,
      finalPos.z + Math.cos(baseYaw) * Math.cos(basePitch) * lookDist
    );

    this.camera.position.copy(finalPos);
    this.camera.lookAt(finalLook);
    this.camera.updateMatrixWorld(true);
  }
}
