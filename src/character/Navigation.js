/**
 * Navigation — 지형 높이 계산, 원형·사각 장애물 충돌 해소, 2D 그리드 A* 길찾기 및 돌계단 경유 경로 생성
 * - worldConfig.js의 단일 원본(SSOT) 수치를 직접 참조합니다.
 */

import {
  MURYANGSUJEON_CONFIG,
  ANYANGRU_CONFIG,
  COURTYARD_CONFIG,
  ANYANGRU_CUSHIONS,
  SPACE_OBSTACLES
} from '../config/worldConfig.js';

const C_ENGINE = window.SANSA_CORE;

export function getGroundHeightAt(x, z) {
  const groundY = COURTYARD_CONFIG.groundY;

  // 1. 무량수전 화강암 기단 상면 및 4면 둘레 회랑
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

  // 3. 안양루 우물마루 및 14개 좌선 방석 (z <= -15.55)
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

  // 5. 앞마당 및 박석길
  return groundY;
}

export function isPointBlocked(x, z, extraMargin = 0) {
  const { minX, maxX, minZ, maxZ } = COURTYARD_CONFIG.walkBounds.block;
  if (x < minX || x > maxX || z < minZ || z > maxZ) return true;

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

  return false;
}

export function hasLineOfSight(x0, z0, x1, z1, extraMargin = 0.04) {
  const dist = Math.hypot(x1 - x0, z1 - z0);
  if (dist < 0.05) return true;
  const steps = Math.max(4, Math.ceil(dist / 0.24));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const sx = x0 + (x1 - x0) * t;
    const sz = z0 + (z1 - z0) * t;
    if (isPointBlocked(sx, sz, extraMargin)) return false;
  }
  return true;
}

export function clampWalkableXZ(x, z, prevX = null, prevZ = null) {
  const { clamp, anyangruMaxZ, anyangruHalfX } = COURTYARD_CONFIG.walkBounds;
  const { minX, maxX, minZ, maxZ } = clamp;

  let cx = Math.max(minX, Math.min(maxX, x));
  let cz = Math.max(minZ, Math.min(maxZ, z));

  if (cz < anyangruMaxZ) {
    cx = Math.max(-anyangruHalfX, Math.min(anyangruHalfX, cx));
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

    cx = Math.max(minX, Math.min(maxX, cx));
    cz = Math.max(minZ, Math.min(maxZ, cz));
  }

  return { x: cx, z: cz };
}

export function findObstacleFreePath(startX, startZ, goalX, goalZ) {
  if (hasLineOfSight(startX, startZ, goalX, goalZ, 0.05)) {
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

  while (open.length > 0 && iterations < 4500) {
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
      if (nKey !== goalKey && isPointBlocked(wPos.x, wPos.z, 0.05)) {
        continue;
      }

      if (dx !== 0 && dz !== 0) {
        const sideA = toWorld(current.gx + dx, current.gz);
        const sideB = toWorld(current.gx, current.gz + dz);
        if (isPointBlocked(sideA.x, sideA.z, 0.02) || isPointBlocked(sideB.x, sideB.z, 0.02)) {
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
          0.04
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

export function buildWalkPath(startPos, endPos) {
  const clampedEnd = clampWalkableXZ(endPos.x, endPos.z, startPos.x, startPos.z);

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
    const subPath = findObstacleFreePath(curX, curZ, stage.x, stage.z);
    for (const pt of subPath) {
      const y = getGroundHeightAt(pt.x, pt.z);
      points.push(new C_ENGINE.Vector3(pt.x, y, pt.z));
    }
    curX = stage.x;
    curZ = stage.z;
  }

  return points;
}

export function findNearestAnyangruCushion(x, z, { frontRowOnly = false } = {}) {
  let candidates = ANYANGRU_CUSHIONS;
  if (frontRowOnly) {
    const frontRowZ = Math.min(...ANYANGRU_CUSHIONS.map((c) => c.z));
    const filtered = ANYANGRU_CUSHIONS.filter((c) => Math.abs(c.z - frontRowZ) < 0.05);
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }

  let best = candidates[0];
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return { cushion: best, dist: bestDist };
}
