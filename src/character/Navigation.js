/**
 * Navigation — 지형 높이 계산, 원형·사각 장애물 충돌 해소, 2D 그리드 A* 길찾기 및 돌계단 경유 경로 생성
 * - worldConfig.js의 단일 원본(SSOT) 수치를 직접 참조합니다.
 */

import {
  MURYANGSUJEON_CONFIG,
  ANYANGRU_CONFIG,
  COURTYARD_CONFIG,
  ANYANGRU_CUSHIONS,
  SPACE_OBSTACLES,
  YEONHWAJI_CONFIG,
  WISH_GARDEN_CONFIG,
  getCheongpungBridgeY
} from '../config/worldConfig.js';

const C_ENGINE = window.SANSA_CORE;

export function getGroundHeightAt(x, z) {
  const groundY = COURTYARD_CONFIG.groundY;

  // 1. 청풍사 본전 실내 마루(4면 보행 공간) 및 전면 문턱 경사 보간
  const hallInt = MURYANGSUJEON_CONFIG.interior;
  if (
    hallInt &&
    x >= hallInt.minX - 0.15 &&
    x <= hallInt.maxX + 0.15 &&
    z >= hallInt.thresholdEndZ &&
    z <= hallInt.maxZ + 0.35
  ) {
    return hallInt.floorY;
  }
  if (
    hallInt &&
    x >= -8.4 &&
    x <= 8.4 &&
    z > hallInt.thresholdStartZ &&
    z < hallInt.thresholdEndZ
  ) {
    const t =
      (z - hallInt.thresholdStartZ) / (hallInt.thresholdEndZ - hallInt.thresholdStartZ);
    return MURYANGSUJEON_CONFIG.verandaY + t * (hallInt.floorY - MURYANGSUJEON_CONFIG.verandaY);
  }

  // 1-1. 무량수전 화강암 기단 상면 및 4면 둘레 회랑
  if (
    x >= MURYANGSUJEON_CONFIG.stylobateMinX &&
    x <= MURYANGSUJEON_CONFIG.stylobateMaxX &&
    z >= MURYANGSUJEON_CONFIG.verandaMinZ &&
    z <= MURYANGSUJEON_CONFIG.verandaMaxZ
  ) {
    return MURYANGSUJEON_CONFIG.verandaY;
  }

  // 2. 무량수전 전면 3개 돌계단(어칸·좌우 협칸) 경사 보간
  if (z > MURYANGSUJEON_CONFIG.stepsStartZ && z < MURYANGSUJEON_CONFIG.stepsEndZ) {
    const onFrontStair = MURYANGSUJEON_CONFIG.frontStairXs.some(
      (sx) => Math.abs(x - sx) <= (sx === 0 ? 2.35 : 1.75)
    );
    if (onFrontStair) {
      const t =
        (z - MURYANGSUJEON_CONFIG.stepsStartZ) /
        (MURYANGSUJEON_CONFIG.stepsEndZ - MURYANGSUJEON_CONFIG.stepsStartZ);
      return groundY + t * (MURYANGSUJEON_CONFIG.verandaY - groundY);
    }
  }

  // 2-1. 무량수전 후면 중앙 돌계단 경사 보간
  if (
    z > MURYANGSUJEON_CONFIG.rearStepsEndZ &&
    z < MURYANGSUJEON_CONFIG.rearStepsStartZ &&
    Math.abs(x) <= 2.15
  ) {
    const t =
      (MURYANGSUJEON_CONFIG.rearStepsStartZ - z) /
      (MURYANGSUJEON_CONFIG.rearStepsStartZ - MURYANGSUJEON_CONFIG.rearStepsEndZ);
    return groundY + t * (MURYANGSUJEON_CONFIG.verandaY - groundY);
  }

  // 3. 차경루 우물마루 및 21개 좌선 방석 (z <= -15.55)
  if (z <= ANYANGRU_CONFIG.stepsEndZ) {
    for (const c of ANYANGRU_CUSHIONS) {
      if (Math.hypot(x - c.x, z - c.z) < ANYANGRU_CONFIG.cushionHitRadius) {
        return ANYANGRU_CONFIG.cushionWorldY;
      }
    }
    return ANYANGRU_CONFIG.worldDeckY;
  }

  // 4. 안양루 중앙 돌계단 (-15.55 < z < -13.65)
  if (z < ANYANGRU_CONFIG.stepsStartZ && z > ANYANGRU_CONFIG.stepsEndZ) {
    const t =
      (ANYANGRU_CONFIG.stepsStartZ - z) /
      (ANYANGRU_CONFIG.stepsStartZ - ANYANGRU_CONFIG.stepsEndZ);
    return groundY + t * (ANYANGRU_CONFIG.worldDeckY - groundY);
  }

  // 4-1. 동쪽 연화지 청풍교 아치형 목교 보행 높이
  const br = YEONHWAJI_CONFIG.bridge;
  const deckMinZ = br.deckMinZ ?? br.minZ;
  const deckMaxZ = br.deckMaxZ ?? br.maxZ;
  if (x >= br.minX && x <= br.maxX && z >= deckMinZ && z <= deckMaxZ) {
    return getCheongpungBridgeY(x);
  }

  // 4-2. 서쪽 소원 연등 정원 소원정 기단 및 사방 2단 돌계단 높이
  const wg = WISH_GARDEN_CONFIG;
  const dxWg = Math.abs(x - wg.cx);
  const dzWg = Math.abs(z - wg.cz);
  if (dxWg <= wg.plinthHalfW && dzWg <= wg.plinthHalfD) {
    return wg.plinthY;
  }
  if (
    (dxWg <= wg.plinthHalfW + wg.stairExtend && dzWg <= 1.45) ||
    (dzWg <= wg.plinthHalfD + wg.stairExtend && dxWg <= 1.45)
  ) {
    const over = Math.max(dxWg - wg.plinthHalfW, dzWg - wg.plinthHalfD, 0);
    const t = Math.max(0, Math.min(1, 1 - over / wg.stairExtend));
    return groundY + t * (wg.plinthY - groundY);
  }

  // 5. 앞마당 및 박석길
  return groundY;
}

const CUSHION_AVOID_RADIUS = 0.64;
const HALL_CUSHION_AVOID_RADIUS = 0.56;

function isSeatAllowed(seatIndex, allowedSeats) {
  if (allowedSeats === null || allowedSeats === undefined) return false;
  if (typeof allowedSeats === 'number') return seatIndex === allowedSeats;
  if (allowedSeats instanceof Set) return allowedSeats.has(seatIndex);
  return false;
}

function isHallSeatAllowed(hallSeatIndex, allowedSeats) {
  if (allowedSeats === null || allowedSeats === undefined) return false;
  const key = `hall:${hallSeatIndex}`;
  if (typeof allowedSeats === 'string') return allowedSeats === key;
  if (allowedSeats instanceof Set) return allowedSeats.has(key);
  return false;
}

function isOnPondBridge(pond, x, z, margin = 0) {
  const b = pond.bridge;
  if (!b) return false;
  return x >= b.minX && x <= b.maxX && z >= b.minZ + margin && z <= b.maxZ - margin;
}

export function isPointBlocked(x, z, extraMargin = 0, allowedSeats = null) {
  const { minX, maxX, minZ, maxZ } = COURTYARD_CONFIG.walkBounds.block;
  if (x < minX || x > maxX || z < minZ || z > maxZ) return true;
  if (
    z < COURTYARD_CONFIG.walkBounds.anyangruMaxZ &&
    Math.abs(x) > COURTYARD_CONFIG.walkBounds.anyangruHalfX
  ) {
    return true;
  }

  const obs = SPACE_OBSTACLES.buseoksa;
  for (const c of obs.circles) {
    const r = c.r + extraMargin;
    const dx = x - c.x;
    const dz = z - c.z;
    if (dx * dx + dz * dz < r * r) return true;
  }

  for (const b of obs.boxes) {
    if (
      x >= b.minX - extraMargin &&
      x <= b.maxX + extraMargin &&
      z >= b.minZ - extraMargin &&
      z <= b.maxZ + extraMargin
    ) {
      return true;
    }
  }

  if (obs.ponds) {
    for (const p of obs.ponds) {
      if (isOnPondBridge(p, x, z, extraMargin)) continue;
      const rx = p.rx + extraMargin;
      const rz = p.rz + extraMargin;
      const nx = (x - p.cx) / rx;
      const nz = (z - p.cz) / rz;
      if (nx * nx + nz * nz < 1) return true;
    }
  }

  // 차경루 빈 방석 밟기 방지 (목표 착석 방석 및 출발 이탈 방석만 예외 허용)
  if (z <= ANYANGRU_CONFIG.stepsEndZ + 0.5) {
    const cr = CUSHION_AVOID_RADIUS + extraMargin;
    const crSq = cr * cr;
    for (const c of ANYANGRU_CUSHIONS) {
      if (isSeatAllowed(c.index, allowedSeats)) continue;
      const dx = x - c.x;
      const dz = z - c.z;
      if (dx * dx + dz * dz < crSq) return true;
    }
  }

  // 청풍사 실내 빈 방석 밟기 방지 (목표 착석 방석 및 출발 이탈 방석만 예외 허용)
  const hallCushions = MURYANGSUJEON_CONFIG.interior?.cushions;
  if (hallCushions && z >= 7.0 && z <= 30.0) {
    const hr = HALL_CUSHION_AVOID_RADIUS + extraMargin;
    const hrSq = hr * hr;
    for (const c of hallCushions) {
      if (isHallSeatAllowed(c.index, allowedSeats)) continue;
      const dx = x - c.x;
      const dz = z - c.z;
      if (dx * dx + dz * dz < hrSq) return true;
    }
  }

  return false;
}

export function hasLineOfSight(x0, z0, x1, z1, extraMargin = 0.04, allowedSeats = null) {
  const dist = Math.hypot(x1 - x0, z1 - z0);
  if (dist < 0.05) return true;
  const steps = Math.max(4, Math.ceil(dist / 0.24));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const sx = x0 + (x1 - x0) * t;
    const sz = z0 + (z1 - z0) * t;
    if (isPointBlocked(sx, sz, extraMargin, allowedSeats)) return false;
  }
  return true;
}

export function clampWalkableXZ(x, z, prevX = null, prevZ = null, allowedSeats = null) {
  const { clamp, anyangruMaxZ, anyangruHalfX } = COURTYARD_CONFIG.walkBounds;
  const { minX, maxX, minZ, maxZ } = clamp;

  let cx = Math.max(minX, Math.min(maxX, x));
  let cz = Math.max(minZ, Math.min(maxZ, z));

  if (cz < anyangruMaxZ) {
    cx = Math.max(-anyangruHalfX, Math.min(anyangruHalfX, cx));
  }

  // 청풍교 상판·난간 영역 클릭/진입 시 연못 바깥으로 튕겨나가지 않고 다리 보행 중앙선으로 정확히 정렬
  const br = YEONHWAJI_CONFIG.bridge;
  if (
    prevX === null &&
    cx >= br.minX - 0.3 &&
    cx <= br.maxX + 0.3 &&
    cz >= (br.deckMinZ ?? -5.75) - 0.15 &&
    cz <= (br.deckMaxZ ?? -3.25) + 0.15
  ) {
    cz = Math.max(br.minZ + 0.04, Math.min(br.maxZ - 0.04, cz));
  }

  const obs = SPACE_OBSTACLES.buseoksa;

  for (let iter = 0; iter < 2; iter++) {
    for (const b of obs.boxes) {
      if (cx > b.minX && cx < b.maxX && cz > b.minZ && cz < b.maxZ) {
        const dLeft = cx - b.minX;
        const dRight = b.maxX - cx;
        const dBottom = cz - b.minZ;
        const dTop = b.maxZ - cz;
        const minPen = Math.min(dLeft, dRight, dBottom, dTop);

        if (minPen === dLeft) cx = b.minX - 0.01;
        else if (minPen === dRight) cx = b.maxX + 0.01;
        else if (minPen === dBottom) cz = b.minZ - 0.01;
        else cz = b.maxZ + 0.01;
      }
    }

    for (const c of obs.circles) {
      const dx = cx - c.x;
      const dz = cz - c.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < c.r * c.r) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          cx = c.x + (dx / dist) * (c.r + 0.01);
          cz = c.z + (dz / dist) * (c.r + 0.01);
        } else if (prevX !== null && prevZ !== null) {
          const pdx = prevX - c.x;
          const pdz = prevZ - c.z;
          const pLen = Math.hypot(pdx, pdz) || 1;
          cx = c.x + (pdx / pLen) * (c.r + 0.02);
          cz = c.z + (pdz / pLen) * (c.r + 0.02);
        } else {
          cz = c.z - (c.r + 0.02);
        }
      }
    }

    if (obs.ponds) {
      for (const p of obs.ponds) {
        if (isOnPondBridge(p, cx, cz, 0)) continue;
        const nx = (cx - p.cx) / p.rx;
        const nz = (cz - p.cz) / p.rz;
        const ellipSq = nx * nx + nz * nz;
        if (ellipSq < 1.0) {
          if (ellipSq > 0.0001) {
            const scale = 1.015 / Math.sqrt(ellipSq);
            cx = p.cx + (cx - p.cx) * scale;
            cz = p.cz + (cz - p.cz) * scale;
          } else {
            cx = p.cx - (p.rx + 0.08);
          }
        }
      }
    }

    // 차경루 빈 방석 밟기 방지 밀어내기
    if (cz <= ANYANGRU_CONFIG.stepsEndZ + 0.5) {
      for (const c of ANYANGRU_CUSHIONS) {
        if (isSeatAllowed(c.index, allowedSeats)) continue;
        const dx = cx - c.x;
        const dz = cz - c.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < CUSHION_AVOID_RADIUS * CUSHION_AVOID_RADIUS) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            cx = c.x + (dx / dist) * (CUSHION_AVOID_RADIUS + 0.015);
            cz = c.z + (dz / dist) * (CUSHION_AVOID_RADIUS + 0.015);
          } else if (prevX !== null && prevZ !== null) {
            const pdx = prevX - c.x;
            const pdz = prevZ - c.z;
            const pLen = Math.hypot(pdx, pdz) || 1;
            cx = c.x + (pdx / pLen) * (CUSHION_AVOID_RADIUS + 0.02);
            cz = c.z + (pdz / pLen) * (CUSHION_AVOID_RADIUS + 0.02);
          } else {
            cz = c.z + (CUSHION_AVOID_RADIUS + 0.02);
          }
        }
      }
    }

    // 청풍사 실내 빈 방석 밟기 방지 밀어내기
    const hallCushions = MURYANGSUJEON_CONFIG.interior?.cushions;
    if (hallCushions && cz >= 7.0 && cz <= 30.0) {
      for (const c of hallCushions) {
        if (isHallSeatAllowed(c.index, allowedSeats)) continue;
        const dx = cx - c.x;
        const dz = cz - c.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < HALL_CUSHION_AVOID_RADIUS * HALL_CUSHION_AVOID_RADIUS) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            cx = c.x + (dx / dist) * (HALL_CUSHION_AVOID_RADIUS + 0.015);
            cz = c.z + (dz / dist) * (HALL_CUSHION_AVOID_RADIUS + 0.015);
          } else if (prevX !== null && prevZ !== null) {
            const pdx = prevX - c.x;
            const pdz = prevZ - c.z;
            const pLen = Math.hypot(pdx, pdz) || 1;
            cx = c.x + (pdx / pLen) * (HALL_CUSHION_AVOID_RADIUS + 0.02);
            cz = c.z + (pdz / pLen) * (HALL_CUSHION_AVOID_RADIUS + 0.02);
          } else {
            cz = c.z + (HALL_CUSHION_AVOID_RADIUS + 0.02);
          }
        }
      }
    }

    cx = Math.max(minX, Math.min(maxX, cx));
    cz = Math.max(minZ, Math.min(maxZ, cz));
  }

  return { x: cx, z: cz };
}

export function findObstacleFreePath(startX, startZ, goalX, goalZ, allowedSeats = null) {
  if (hasLineOfSight(startX, startZ, goalX, goalZ, 0.05, allowedSeats)) {
    return [{ x: goalX, z: goalZ }];
  }

  const step = 0.48;
  const { minX, maxX, minZ, maxZ } = COURTYARD_CONFIG.walkBounds.clamp;

  const cols = Math.round((maxX - minX) / step) + 1;
  const rows = Math.round((maxZ - minZ) / step) + 1;

  const toGrid = (wx, wz) => ({
    gx: Math.max(0, Math.min(cols - 1, Math.round((wx - minX) / step))),
    gz: Math.max(0, Math.min(rows - 1, Math.round((wz - minZ) / step)))
  });
  const toWorld = (gx, gz) => ({
    x: minX + gx * step,
    z: minZ + gz * step
  });

  const startNode = toGrid(startX, startZ);
  const goalNode = toGrid(goalX, goalZ);
  const keyOf = (gx, gz) => gz * cols + gx;

  const gScore = new Map();
  const cameFrom = new Map();
  const closed = new Set();
  const open = [];

  const startKey = keyOf(startNode.gx, startNode.gz);
  const goalKey = keyOf(goalNode.gx, goalNode.gz);
  gScore.set(startKey, 0);
  open.push({
    gx: startNode.gx,
    gz: startNode.gz,
    key: startKey,
    f: Math.hypot(goalNode.gx - startNode.gx, goalNode.gz - startNode.gz)
  });

  const dirs = [
    [1, 0, 1.0],
    [-1, 0, 1.0],
    [0, 1, 1.0],
    [0, -1, 1.0],
    [1, 1, 1.414],
    [-1, 1, 1.414],
    [1, -1, 1.414],
    [-1, -1, 1.414]
  ];

  let bestKey = startKey;
  let bestDistToGoal = Math.hypot(goalNode.gx - startNode.gx, goalNode.gz - startNode.gz);
  let iterations = 0;

  while (open.length > 0 && iterations < 14000) {
    iterations++;
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open.splice(bestIdx, 1)[0];
    if (current.key === goalKey) {
      bestKey = goalKey;
      break;
    }
    if (closed.has(current.key)) continue;
    closed.add(current.key);

    const dGoal = Math.hypot(goalNode.gx - current.gx, goalNode.gz - current.gz);
    if (dGoal < bestDistToGoal) {
      bestDistToGoal = dGoal;
      bestKey = current.key;
    }

    const curG = gScore.get(current.key) ?? Infinity;

    for (const [dx, dz, cost] of dirs) {
      const nx = current.gx + dx;
      const nz = current.gz + dz;
      if (nx < 0 || nx >= cols || nz < 0 || nz >= rows) continue;
      const nKey = keyOf(nx, nz);
      if (closed.has(nKey)) continue;

      const wPos = toWorld(nx, nz);
      if (nKey !== goalKey && isPointBlocked(wPos.x, wPos.z, 0.05, allowedSeats)) {
        continue;
      }

      if (dx !== 0 && dz !== 0) {
        const sideA = toWorld(current.gx + dx, current.gz);
        const sideB = toWorld(current.gx, current.gz + dz);
        if (
          isPointBlocked(sideA.x, sideA.z, 0.02, allowedSeats) ||
          isPointBlocked(sideB.x, sideB.z, 0.02, allowedSeats)
        ) {
          continue;
        }
      }

      const tentativeG = curG + cost;
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, current.key);
        gScore.set(nKey, tentativeG);
        const h = Math.hypot(goalNode.gx - nx, goalNode.gz - nz);
        open.push({ gx: nx, gz: nz, key: nKey, f: tentativeG + h });
      }
    }
  }

  const rawPts = [{ x: startX, z: startZ }];
  const chain = [];
  let curr = bestKey;
  while (curr !== undefined && curr !== startKey) {
    chain.push(curr);
    curr = cameFrom.get(curr);
  }
  chain.reverse();
  for (const k of chain) {
    const gz = Math.floor(k / cols);
    const gx = k % cols;
    rawPts.push(toWorld(gx, gz));
  }
  rawPts.push({ x: goalX, z: goalZ });

  const smoothed = [];
  let anchorIdx = 0;
  while (anchorIdx < rawPts.length - 1) {
    let furthestIdx = anchorIdx + 1;
    for (let testIdx = rawPts.length - 1; testIdx > anchorIdx + 1; testIdx--) {
      if (
        hasLineOfSight(
          rawPts[anchorIdx].x,
          rawPts[anchorIdx].z,
          rawPts[testIdx].x,
          rawPts[testIdx].z,
          0.04,
          allowedSeats
        )
      ) {
        furthestIdx = testIdx;
        break;
      }
    }
    smoothed.push(rawPts[furthestIdx]);
    anchorIdx = furthestIdx;
  }

  return smoothed;
}

export function buildWalkPath(startPos, endPos, targetSeat = null) {
  const allowedSeats = new Set();
  if (Number.isInteger(targetSeat) || typeof targetSeat === 'string') {
    allowedSeats.add(targetSeat);
  }
  // 방석 위에서 일어서서 출발할 때 현재 방석에서만 빠져나올 수 있도록 출발 방석 허용
  for (const c of ANYANGRU_CUSHIONS) {
    if (Math.hypot(startPos.x - c.x, startPos.z - c.z) <= CUSHION_AVOID_RADIUS + 0.14) {
      allowedSeats.add(c.index);
    }
  }
  const hallCushions = MURYANGSUJEON_CONFIG.interior?.cushions || [];
  for (const c of hallCushions) {
    if (Math.hypot(startPos.x - c.x, startPos.z - c.z) <= HALL_CUSHION_AVOID_RADIUS + 0.14) {
      allowedSeats.add(`hall:${c.index}`);
    }
  }

  const clampedEnd = clampWalkableXZ(endPos.x, endPos.z, startPos.x, startPos.z, allowedSeats);

  const stageTargets = [];
  const mPortal = MURYANGSUJEON_CONFIG.stepPortal;
  const aPortal = ANYANGRU_CONFIG.stepPortal;

  const isOnMuryangTerrace = (p) =>
    p.x >= MURYANGSUJEON_CONFIG.stylobateMinX &&
    p.x <= MURYANGSUJEON_CONFIG.stylobateMaxX &&
    p.z > mPortal.thresholdZ &&
    p.z < MURYANGSUJEON_CONFIG.stylobateMaxZ + 0.15;

  const startOnMuryang = isOnMuryangTerrace(startPos);
  const endOnMuryang = isOnMuryangTerrace(clampedEnd);
  const startOnAnyang = startPos.z < aPortal.thresholdZ;
  const endOnAnyang = clampedEnd.z < aPortal.thresholdZ;

  const pickNearestFrontStairX = (refX) => {
    let bestX = 0.0;
    let bestD = Infinity;
    for (const sx of MURYANGSUJEON_CONFIG.frontStairXs) {
      const d = Math.abs(refX - sx);
      if (d < bestD) {
        bestD = d;
        bestX = sx;
      }
    }
    return bestX;
  };

  if (startOnMuryang && !endOnMuryang) {
    if (clampedEnd.z > MURYANGSUJEON_CONFIG.stylobateMaxZ) {
      stageTargets.push({ x: 0.0, z: mPortal.rearUpperZ });
      stageTargets.push({ x: 0.0, z: mPortal.rearLowerZ });
    } else {
      const sx = pickNearestFrontStairX(startPos.x);
      stageTargets.push({ x: sx, z: mPortal.upperZ });
      stageTargets.push({ x: sx, z: mPortal.lowerZ });
    }
  }
  if (startOnAnyang && !endOnAnyang) {
    stageTargets.push({ x: 0.0, z: aPortal.upperZ });
    stageTargets.push({ x: 0.0, z: aPortal.lowerZ });
  }
  if (!startOnMuryang && endOnMuryang) {
    if (startPos.z > MURYANGSUJEON_CONFIG.stylobateMaxZ) {
      stageTargets.push({ x: 0.0, z: mPortal.rearLowerZ });
      stageTargets.push({ x: 0.0, z: mPortal.rearUpperZ });
    } else {
      const sx = pickNearestFrontStairX(clampedEnd.x);
      stageTargets.push({ x: sx, z: mPortal.lowerZ });
      stageTargets.push({ x: sx, z: mPortal.upperZ });
    }
  }
  if (!startOnAnyang && endOnAnyang) {
    stageTargets.push({ x: 0.0, z: aPortal.lowerZ });
    stageTargets.push({ x: 0.0, z: aPortal.upperZ });
  }

  stageTargets.push({ x: clampedEnd.x, z: clampedEnd.z });

  const points = [];
  let curX = startPos.x;
  let curZ = startPos.z;

  for (const stage of stageTargets) {
    const subPath = findObstacleFreePath(curX, curZ, stage.x, stage.z, allowedSeats);
    for (const pt of subPath) {
      const y = getGroundHeightAt(pt.x, pt.z);
      points.push(new C_ENGINE.Vector3(pt.x, y, pt.z));
    }
    curX = stage.x;
    curZ = stage.z;
  }

  return points;
}

export function getAnyangruCushionByIndex(seatIndex) {
  if (!Number.isInteger(seatIndex) || seatIndex < 0 || seatIndex >= ANYANGRU_CUSHIONS.length) {
    return null;
  }
  return ANYANGRU_CUSHIONS[seatIndex] || null;
}

// 가운데 앞자리(1줄 중앙 -> 좌우 -> 2줄 중앙 -> 좌우 -> 3줄 중앙 -> 좌우) 우선순위 정렬
const FRONT_CENTER_PRIORITY_CUSHIONS = [...ANYANGRU_CUSHIONS].sort((a, b) => {
  if (a.row !== b.row) return a.row - b.row;
  const distCenterA = Math.abs(a.col - 4);
  const distCenterB = Math.abs(b.col - 4);
  if (distCenterA !== distCenterB) return distCenterA - distCenterB;
  return a.col - b.col;
});

/**
 * 차경루 가운데 앞자리(1줄 중앙)부터 순차적으로 비어 있는 방석을 탐색합니다.
 * - occupiedSeatIndices에 포함된 좌석(다른 나그네 착석/이동 중)은 제외합니다.
 * - 21석이 모두 점유된 경우 { cushion: null, dist: Infinity }를 반환합니다.
 */
export function selectPriorityAnyangruCushion(x, z, occupiedSeatIndices = new Set()) {
  const occupied =
    occupiedSeatIndices instanceof Set
      ? occupiedSeatIndices
      : new Set(occupiedSeatIndices || []);

  for (const c of FRONT_CENTER_PRIORITY_CUSHIONS) {
    if (occupied.has(c.index)) continue;
    return {
      cushion: c,
      dist: Math.hypot(x - c.x, z - c.z)
    };
  }

  return {
    cushion: null,
    dist: Infinity
  };
}

export function findNearestAnyangruCushion(
  x,
  z,
  { occupiedSeatIndices = null } = {}
) {
  if (occupiedSeatIndices) {
    return selectPriorityAnyangruCushion(x, z, occupiedSeatIndices);
  }

  let best = ANYANGRU_CUSHIONS[0];
  let bestDist = Infinity;
  for (const c of ANYANGRU_CUSHIONS) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return { cushion: best, dist: bestDist };
}
