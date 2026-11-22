/**
 * MuryangsujeonBuilder — 청풍사 본전(무량수전 양식) 360° 건축 빌더
 * - 전면 5칸·측면 6칸·후면 5칸, 4면 기단·계단·겹처마·추녀, 현판 및 내부 불단 결합
 */

import { MURYANGSUJEON_CONFIG, COURTYARD_CONFIG } from '../config/worldConfig.js';
import { TextureFactory } from './TextureFactory.js';
import { buildRealisticPaljakRoof } from './PaljakRoofBuilder.js';
import { buildTraditionalStoneStaircase } from './StoneStaircaseBuilder.js';
import { SANSA_CORE as C_ENGINE } from '../engine/CoreRuntime.js';

export function buildMuryangsujeonHall(parent, materials, interiorBuilder) {
    const m = materials;
    const cfg = MURYANGSUJEON_CONFIG;
    const hg = new C_ENGINE.Group();
    hg.name = 'MuryangsujeonHall';

    // 1. 실사 입면 전용 재질 초기화 (UV 보존형)
    const facadeTex = TextureFactory.createMuryangFacadeTextures();

    const ochreWallMat = new C_ENGINE.MeshStandardMaterial({
      map: facadeTex.ochreWallTex,
      roughness: 0.93,
      metalness: 0.01,
      vertexColors: true
    });
    const latticeDoorMat = new C_ENGINE.MeshStandardMaterial({
      map: facadeTex.latticeDoorTex,
      bumpMap: facadeTex.latticeDoorBump,
      bumpScale: 0.035,
      roughness: 0.80,
      metalness: 0.02,
      vertexColors: true
    });
    const whiteShutterMat = new C_ENGINE.MeshStandardMaterial({
      map: facadeTex.whiteShutterTex,
      roughness: 0.86,
      metalness: 0.01,
      vertexColors: true
    });
    const wainscotMat = new C_ENGINE.MeshStandardMaterial({
      map: facadeTex.wainscotTex,
      roughness: 0.84,
      metalness: 0.02,
      vertexColors: true
    });
    const hwabangWallMat = new C_ENGINE.MeshStandardMaterial({
      map: facadeTex.hwabangWallTex,
      roughness: 0.92,
      metalness: 0.02,
      vertexColors: true
    });
    const rafterCapMat = new C_ENGINE.MeshStandardMaterial({
      color: 0xd8d0be,
      roughness: 0.82,
      metalness: 0.02,
      vertexColors: true
    });
    const darkSanctuaryMat = new C_ENGINE.MeshStandardMaterial({
      color: 0x1b130d,
      roughness: 0.95,
      metalness: 0.0,
      side: C_ENGINE.DoubleSide
    });

    // 2. 4면 가구식 화강암 장대석 기단 + 전면 3계단 + 후면 중앙 계단 + 둘레 산책 박석
    const styCenterX = (cfg.stylobateMinX + cfg.stylobateMaxX) * 0.5;
    const styCenterZ = (cfg.stylobateMinZ + cfg.stylobateMaxZ) * 0.5; // 10.60
    const styW = cfg.stylobateMaxX - cfg.stylobateMinX; // 34.0
    const styD = cfg.stylobateMaxZ - cfg.stylobateMinZ; // 10.10
    const topY = cfg.verandaY; // 0.20

    // 지대석 · 면석 · 갑석 3단 화강암 기단
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(styW + 0.38, 0.24, styD + 0.38, 2, 0.035),
      m.matStone,
      hg,
      { pos: [styCenterX, -0.72, styCenterZ], tone: 0.90 }
    );
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(styW - 0.08, 0.72, styD - 0.08, 2, 0.04),
      m.matStone,
      hg,
      { pos: [styCenterX, -0.26, styCenterZ], tone: 0.95 }
    );
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(styW + 0.16, 0.16, styD + 0.16, 2, 0.03),
      m.matStone,
      hg,
      { pos: [styCenterX, topY - 0.08, styCenterZ], tone: 0.99 }
    );

    // 4면 기단 우주석·탱주(수직 동바리돌) 입체 조각
    const frontRearPilasterXs = [-16.85, -14.2, -11.3, -8.4, 8.4, 11.3, 14.2, 16.85];
    for (const px of frontRearPilasterXs) {
      for (const pz of [cfg.stylobateMinZ - 0.01, cfg.stylobateMaxZ + 0.01]) {
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.32, 0.72, 0.14, 2, 0.02),
          m.matStone,
          hg,
          { pos: [px, -0.26, pz], tone: 0.88 }
        );
      }
    }
    const sidePilasterCount = Math.max(6, Math.round((cfg.stylobateMaxZ - cfg.stylobateMinZ) / 2.2) + 1);
    for (let pi = 0; pi < sidePilasterCount; pi++) {
      const pz = cfg.stylobateMinZ + 0.15 + (pi / (sidePilasterCount - 1)) * (cfg.stylobateMaxZ - cfg.stylobateMinZ - 0.3);
      for (const px of [cfg.stylobateMinX - 0.01, cfg.stylobateMaxX + 0.01]) {
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.14, 0.72, 0.32, 2, 0.02),
          m.matStone,
          hg,
          { pos: [px, -0.26, pz], tone: 0.88 }
        );
      }
    }

    // 전면 3개 화강암 돌계단 (어칸 중앙 + 좌·우 협칸: 통돌 디딤석 + 삼각 귀틀 소매돌 일체형)
    cfg.frontStairXs.forEach((sx) => {
      const isCenter = Math.abs(sx) < 0.1;
      buildTraditionalStoneStaircase(hg, {
        x: sx,
        bottomY: -0.82,
        topY,
        startZ: 3.60,
        endZ: cfg.stylobateMinZ + 0.03,
        treadWidth: isCenter ? 4.12 : 2.94,
        cheekWidth: 0.34,
        stepCount: 5
      }, m);
    });

    // 후면 중앙 화강암 돌계단 (통돌 디딤석 + 삼각 귀틀 소매돌 일체형)
    buildTraditionalStoneStaircase(hg, {
      x: 0,
      bottomY: -0.82,
      topY,
      startZ: cfg.rearStepsStartZ,
      endZ: cfg.stylobateMaxZ - 0.03,
      treadWidth: 3.84,
      cheekWidth: 0.34,
      stepCount: 5
    }, m);

    // 무량수전 좌·우·후면 외곽 산책 박석 징검돌 (확장된 기단 길이에 맞춰 동적 배치)
    const sideStepCount = Math.ceil((cfg.stylobateMaxZ + 2.5 - 4.2) / 1.75);
    for (const sideSign of [-1, 1]) {
      for (let i = 0; i < sideStepCount; i++) {
        const sz = 4.2 + i * 1.75;
        const sx = sideSign * (18.4 + Math.sin(i * 0.7) * 0.22);
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(1.18, 0.065, 0.96, 2, 0.02),
          m.matStone,
          hg,
          { pos: [sx, -0.79, sz], rot: [0, sideSign * 0.04 * (i % 3), 0], tone: 0.92 + (i % 3) * 0.03 }
        );
      }
    }
    const rearPathZ = cfg.stylobateMaxZ + 2.6;
    for (let ix = -8; ix <= 8; ix++) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(1.26, 0.065, 0.98, 2, 0.02),
        m.matStone,
        hg,
        {
          pos: [ix * 2.15, -0.79, rearPathZ + Math.cos(ix * 0.6) * 0.16],
          rot: [0, (ix % 2) * 0.03, 0],
          tone: 0.93 + (Math.abs(ix) % 3) * 0.025
        }
      );
    }

    // 전면 기단 툇마루 걸상('무량수전.jpg' 좌우 퇴칸 앞 나무 걸상) 및 어칸·협칸 디딤틀
    for (const benchX of [-11.3, 11.3]) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(3.45, 0.08, 0.42, 2, 0.015),
        m.matDarkTimber,
        hg,
        { pos: [benchX, topY + 0.36, 6.70], tone: 0.92 }
      );
      for (const legDx of [-1.42, 0, 1.42]) {
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.10, 0.34, 0.36, 2, 0.01),
          m.matDarkTimber,
          hg,
          { pos: [benchX + legDx, topY + 0.17, 6.70], tone: 0.86 }
        );
      }
    }
    for (const stepX of [-5.8, 0.0, 5.8]) {
      const stepW = Math.abs(stepX) < 0.1 ? 2.25 : 1.88;
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(stepW, 0.16, 0.34, 2, 0.02),
        m.matDarkTimber,
        hg,
        { pos: [stepX, topY + 0.08, 6.76], tone: 0.90 }
      );
    }

    // 3. 정면 5칸 × 측면 3칸 배흘림기둥 16주 + 주심포 다층 공포 + 4면 수평 가구 부재
    const colXs = cfg.columnXs; // [-14.2, -8.4, -3.2, 3.2, 8.4, 14.2]
    const sideZs = cfg.sideColZs; // [7.0, 9.2, 11.4, 13.6]
    const fZ = cfg.colZ; // 7.0
    const rZ = cfg.rearColZ; // 13.6

    // 국보 부석사 무량수전 특유의 우아한 배흘림(Entasis) 곡선 프로파일
    const entasisPts = [
      new C_ENGINE.Vector2(0.345, 0.0),
      new C_ENGINE.Vector2(0.398, 1.15),
      new C_ENGINE.Vector2(0.418, 1.88),
      new C_ENGINE.Vector2(0.382, 3.25),
      new C_ENGINE.Vector2(0.328, 4.54)
    ];
    const colGeo = new C_ENGINE.LatheGeometry(entasisPts, 24);

    const perimeterCols = [];
    colXs.forEach((x, idx) => {
      const isCorner = idx === 0 || idx === colXs.length - 1;
      perimeterCols.push({
        x,
        z: fZ,
        outZ: -1,
        outX: isCorner ? (idx === 0 ? -1 : 1) : 0
      });
      perimeterCols.push({
        x,
        z: rZ,
        outZ: 1,
        outX: isCorner ? (idx === 0 ? -1 : 1) : 0
      });
    });
    sideZs.slice(1, -1).forEach((z) => {
      perimeterCols.push({ x: colXs[0], z, outZ: 0, outX: -1 });
      perimeterCols.push({ x: colXs[colXs.length - 1], z, outZ: 0, outX: 1 });
    });

    perimeterCols.forEach(({ x, z, outX, outZ }) => {
      // 기단 접지 그림자 및 자연석 덤벙주초 + 주좌
      const cs = new C_ENGINE.Mesh(new C_ENGINE.PlaneGeometry(1.55, 1.55), m.matContactShadow);
      cs.rotation.x = -Math.PI / 2;
      cs.position.set(x, topY + 0.006, z);
      hg.add(cs);

      m.createMesh(
        new C_ENGINE.CylinderGeometry(0.48, 0.56, 0.18, 12),
        m.matStone,
        hg,
        { pos: [x, topY + 0.09, z], tone: 0.90 }
      );
      m.createMesh(
        new C_ENGINE.CylinderGeometry(0.38, 0.44, 0.08, 16),
        m.matStone,
        hg,
        { pos: [x, topY + 0.21, z], tone: 0.96 }
      );

      // 배흘림기둥 본체
      m.createMesh(colGeo.clone(), m.matTimber, hg, {
        pos: [x, topY + 0.24, z],
        tone: 0.98
      });

      // 주심포 주두(柱頭) 및 첨차·출목 살미·소로 다층 결구
      const capY = topY + 4.82; // 5.02
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.84, 0.20, 0.84, 2, 0.025),
        m.matDarkTimber,
        hg,
        { pos: [x, capY, z], tone: 0.90 }
      );

      for (let tier = 0; tier < 4; tier++) {
        const ty = capY + 0.19 + tier * 0.21;
        const alongSpan = 1.18 + tier * 0.36;
        const outReach = 0.96 + tier * 0.34;
        const tierMat = tier === 2 ? m.matDancheongRed : m.matTimber;
        const crossMat = tier === 1 ? m.matDancheongJade : m.matPaleTimber;

        if (outZ !== 0) {
          // 전·후면 벽 방향 첨차 + 외부 돌출 살미
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(alongSpan, 0.15, 0.28, 2, 0.02),
            tierMat,
            hg,
            { pos: [x, ty, z] }
          );
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(0.26, 0.15, outReach, 2, 0.02),
            crossMat,
            hg,
            { pos: [x, ty + 0.02, z + outZ * (outReach * 0.24)] }
          );
        }
        if (outX !== 0) {
          // 좌·우 측면 벽 방향 첨차 + 외부 돌출 살미
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(0.28, 0.15, alongSpan, 2, 0.02),
            tierMat,
            hg,
            { pos: [x, ty, z] }
          );
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(outReach, 0.15, 0.26, 2, 0.02),
            crossMat,
            hg,
            { pos: [x + outX * (outReach * 0.24), ty + 0.02, z] }
          );
        }
        if (outX !== 0 && outZ !== 0) {
          // 4귀 우주(모서리 기둥) 대각선 귀한대 살미
          const diagYaw = Math.atan2(outX, outZ);
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(0.24, 0.15, outReach * 1.15, 2, 0.02),
            m.matPaleTimber,
            hg,
            {
              pos: [x + outX * 0.22, ty + 0.03, z + outZ * 0.22],
              rot: [0, diagYaw, 0]
            }
          );
        }
      }
    });

    // 4면 연속 창방 · 문얼굴 상인방 · 주심도리 · 외목도리 결구
    const totalSpanX = colXs[colXs.length - 1] - colXs[0]; // 28.4
    const totalSpanZ = rZ - fZ; // 6.6
    const midZ = (fZ + rZ) * 0.5; // 10.3

    for (const wz of [fZ, rZ]) {
      const zSign = wz < midZ ? -1 : 1;
      // 하인방/문지방 (전면 열린 3칸 출입구는 바닥과 자연스럽게 이어지는 낮은 문턱으로 처리)
      if (wz === fZ) {
        for (const sideX of [-11.3, 11.3]) {
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(5.9, 0.22, 0.34, 2, 0.02),
            m.matDarkTimber,
            hg,
            { pos: [sideX, topY + 0.28, wz], tone: 0.90 }
          );
        }
        // 전면 중앙 3칸 개방 출입구: 바닥(0.20 -> 0.28)과 자연스럽게 이어지는 낮은 목조 문턱 디딤판
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(16.8, 0.055, 0.42, 2, 0.012),
          m.matDarkTimber,
          hg,
          { pos: [0, topY + 0.045, wz], tone: 0.86 }
        );
      } else {
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(totalSpanX + 0.3, 0.22, 0.34, 2, 0.02),
          m.matDarkTimber,
          hg,
          { pos: [0, topY + 0.28, wz], tone: 0.90 }
        );
      }
      // 문얼굴 상인방 (y = 4.02)
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(totalSpanX + 0.4, 0.22, 0.36, 2, 0.02),
        m.matTimber,
        hg,
        { pos: [0, 4.02, wz], tone: 0.95 }
      );
      // 창방 (y = 4.82, 양 끝 초가지 돌출)
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(totalSpanX + 1.15, 0.30, 0.38, 2, 0.025),
        m.matTimber,
        hg,
        { pos: [0, 4.82, wz], tone: 0.96 }
      );
      // 장여 · 주심도리 (y = 5.64)
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(totalSpanX + 1.4, 0.22, 0.36, 2, 0.02),
        m.matDancheongRed,
        hg,
        { pos: [0, 5.58, wz] }
      );
      // 외목도리 (처마 서까래 받침 도리)
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(totalSpanX + 2.2, 0.26, 0.32, 2, 0.025),
        m.matDarkTimber,
        hg,
        { pos: [0, 5.88, wz + zSign * 0.76], tone: 0.92 }
      );
    }

    for (const wx of [colXs[0], colXs[colXs.length - 1]]) {
      const xSign = wx < 0 ? -1 : 1;
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.34, 0.22, totalSpanZ + 0.3, 2, 0.02),
        m.matDarkTimber,
        hg,
        { pos: [wx, topY + 0.28, midZ], tone: 0.90 }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.36, 0.22, totalSpanZ + 0.4, 2, 0.02),
        m.matTimber,
        hg,
        { pos: [wx, 4.02, midZ], tone: 0.95 }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.38, 0.30, totalSpanZ + 1.15, 2, 0.025),
        m.matTimber,
        hg,
        { pos: [wx, 4.82, midZ], tone: 0.96 }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.36, 0.22, totalSpanZ + 1.4, 2, 0.02),
        m.matDancheongRed,
        hg,
        { pos: [wx, 5.58, midZ] }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.32, 0.26, totalSpanZ + 2.2, 2, 0.025),
        m.matDarkTimber,
        hg,
        { pos: [wx + xSign * 0.76, 5.88, midZ], tone: 0.92 }
      );
    }

    // 4. 무량수전 법당 내부 성소(내진) 및 실사 불단 배경 (열린 전면 3칸 문 너머 입체 감상)
    const sanctGroup = new C_ENGINE.Group();
    // 내진 바닥(짙은 고목 널마루, 은은한 광택), 서까래 노출 우물천장·천창, 회벽+목조 인방 좌우 내벽
    const hallInt = cfg.interior;
    const intFloorY = hallInt.floorY;
    const hallDepth = totalSpanZ - 0.15;

    // 짙은 호두나무 고목 널마루 텍스처 + 요철 범프맵 (반사 없는 자연스러운 전통 마루 질감)
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fCtx = floorCanvas.getContext('2d');
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 512;
    bumpCanvas.height = 512;
    const bCtx = bumpCanvas.getContext('2d');

    fCtx.fillStyle = '#2d2016';
    fCtx.fillRect(0, 0, 512, 512);
    bCtx.fillStyle = '#909090';
    bCtx.fillRect(0, 0, 512, 512);

    const plankRows = 10;
    const rowH = 512 / plankRows;
    for (let r = 0; r < plankRows; r++) {
      const y0 = r * rowH;
      const baseShade = 42 + ((r * 17) % 16);
      fCtx.fillStyle = `rgb(${baseShade + 14}, ${baseShade}, ${baseShade - 13})`;
      fCtx.fillRect(0, y0 + 2, 512, rowH - 3);
      bCtx.fillStyle = '#b8b8b8';
      bCtx.fillRect(0, y0 + 2, 512, rowH - 3);

      // 자연스러운 목재 나뭇결 스트로크
      for (let g = 0; g < 14; g++) {
        const gy = y0 + 4 + ((g * 7 + r * 3) % Math.max(4, Math.floor(rowH - 6)));
        fCtx.fillStyle = g % 2 === 0 ? 'rgba(24, 15, 9, 0.16)' : 'rgba(92, 68, 46, 0.12)';
        fCtx.fillRect(0, gy, 512, 1.5);
      }

      // 널빤지 틈새 홈 (가로 및 엇갈린 세로 이음매)
      fCtx.fillStyle = '#18100a';
      fCtx.fillRect(0, y0, 512, 2.5);
      bCtx.fillStyle = '#252525';
      bCtx.fillRect(0, y0, 512, 2.5);

      const seam1 = ((r * 193 + 80) % 420) + 40;
      fCtx.fillRect(seam1, y0, 2.5, rowH);
      bCtx.fillRect(seam1, y0, 2.5, rowH);
    }
    const hallFloorTex = new C_ENGINE.CanvasTexture(floorCanvas);
    hallFloorTex.colorSpace = C_ENGINE.SRGBColorSpace;
    hallFloorTex.wrapS = C_ENGINE.RepeatWrapping;
    hallFloorTex.wrapT = C_ENGINE.RepeatWrapping;
    hallFloorTex.repeat.set(8, 7);

    const hallFloorBump = new C_ENGINE.CanvasTexture(bumpCanvas);
    hallFloorBump.wrapS = C_ENGINE.RepeatWrapping;
    hallFloorBump.wrapT = C_ENGINE.RepeatWrapping;
    hallFloorBump.repeat.set(8, 7);

    const hallFloorMat = new C_ENGINE.MeshStandardMaterial({
      map: hallFloorTex,
      bumpMap: hallFloorBump,
      bumpScale: 0.028,
      roughness: 0.91,
      metalness: 0.0,
      envMapIntensity: 0.12
    });
    const hallFloorMesh = new C_ENGINE.Mesh(
      new C_ENGINE.BoxGeometry(27.8, 0.14, hallDepth),
      hallFloorMat
    );
    hallFloorMesh.position.set(0, intFloorY - 0.07, midZ);
    hallFloorMesh.receiveShadow = true;
    sanctGroup.add(hallFloorMesh);

    // 천장 4면 패널 (기존 대비 약 30% 상향된 중앙 8.95m 연등천장 + 중앙 6.6m × 6.6m 천창 우물 개구부)
    const skyHalf = 3.3;
    const outerCeilY = 7.45;
    const centerCeilY = 8.95;
    const sideCeilW = (27.8 - skyHalf * 2) * 0.5;
    const slopeAngle = Math.atan2(centerCeilY - outerCeilY, sideCeilW);
    const slopedLen = Math.hypot(sideCeilW, centerCeilY - outerCeilY);

    for (const xSign of [-1, 1]) {
      const ceilGeo = new C_ENGINE.PlaneGeometry(slopedLen + 0.2, hallDepth + 0.2);
      ceilGeo.rotateX(Math.PI / 2);
      const cPanel = new C_ENGINE.Mesh(ceilGeo, darkSanctuaryMat);
      // 좌·우 경사 천장이 서까래(ceilRafterInst)와 동일한 Z축 경사각(-/+slopeAngle)으로 밀착되도록 수정
      cPanel.rotation.z = xSign > 0 ? -slopeAngle : slopeAngle;
      cPanel.position.set(
        xSign * (skyHalf + sideCeilW * 0.5),
        (outerCeilY + centerCeilY) * 0.5,
        midZ
      );
      sanctGroup.add(cPanel);
    }
    const fbCeilD = (hallDepth - skyHalf * 2) * 0.5;
    for (const zSign of [-1, 1]) {
      const cPanel = new C_ENGINE.Mesh(
        new C_ENGINE.PlaneGeometry(skyHalf * 2 + 0.04, fbCeilD),
        darkSanctuaryMat
      );
      cPanel.rotation.x = Math.PI / 2;
      cPanel.position.set(0, centerCeilY + 0.02, midZ + zSign * (skyHalf + fbCeilD * 0.5));
      sanctGroup.add(cPanel);
    }

    // 천장 노출 대들보(천창 좌·우 굵은 원목 대들보 2주 + 외곽 보 2주 — 서까래·가로보와 완전 비간섭 배치)
    for (const bx of [-10.8, -3.45, 3.45, 10.8]) {
      const isMain = Math.abs(bx) < 5;
      const beamY = isMain ? centerCeilY - 0.40 : outerCeilY + 0.02;
      m.createMesh(
        new C_ENGINE.CylinderGeometry(isMain ? 0.32 : 0.22, isMain ? 0.34 : 0.24, hallDepth - 0.5, 14),
        m.matDarkTimber,
        sanctGroup,
        { pos: [bx, beamY, midZ], rot: [Math.PI * 0.5, 0, 0], castShadow: false, tone: 0.58 }
      );
    }
    for (const bz of [midZ - 3.45, midZ + 3.45]) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(skyHalf * 2 - 0.12, 0.34, 0.34, 2, 0.03),
        m.matDarkTimber,
        sanctGroup,
        { pos: [0, centerCeilY - 0.22, bz], castShadow: false, tone: 0.60 }
      );
    }

    // 좌·우 경사 천장 평행 서까래 띠 (중앙 천창을 향해 자연스럽게 솟아오름, InstancedMesh 1 Draw Call)
    const ceilRafterRows = 26;
    const sideRafterLen = slopedLen - 0.15;
    const ceilRafterGeo = new C_ENGINE.CylinderGeometry(0.072, 0.072, sideRafterLen, 6);
    ceilRafterGeo.rotateZ(Math.PI * 0.5);
    const ceilRafterInst = new C_ENGINE.InstancedMesh(ceilRafterGeo, m.matDarkTimber, ceilRafterRows * 2);
    const rDummy = new C_ENGINE.Object3D();
    let rIdx = 0;
    for (let i = 0; i < ceilRafterRows; i++) {
      const rz = fZ + 0.55 + (i / (ceilRafterRows - 1)) * (hallDepth - 1.1);
      for (const xSign of [-1, 1]) {
        rDummy.position.set(
          xSign * (skyHalf + sideCeilW * 0.5),
          (outerCeilY + centerCeilY) * 0.5 - 0.14,
          rz
        );
        rDummy.rotation.set(0, 0, xSign > 0 ? -slopeAngle : slopeAngle);
        rDummy.updateMatrix();
        ceilRafterInst.setMatrixAt(rIdx++, rDummy.matrix);
      }
    }
    ceilRafterInst.instanceMatrix.needsUpdate = true;
    sanctGroup.add(ceilRafterInst);

    // 실제 3D 입체 우물천창 — '청광사 내부 이미지.jpg'의 고색 바랜 단청 천창 텍스처 직접 투영
    const cofferCanvas = document.createElement('canvas');
    cofferCanvas.width = 512;
    cofferCanvas.height = 256;
    const cCtx = cofferCanvas.getContext('2d');
    const cGrad = cCtx.createLinearGradient(0, 0, 0, 256);
    cGrad.addColorStop(0, '#4a3d31');
    cGrad.addColorStop(0.5, '#3b3229');
    cGrad.addColorStop(1, '#2a221b');
    cCtx.fillStyle = cGrad;
    cCtx.fillRect(0, 0, 512, 256);
    cCtx.fillStyle = 'rgba(84, 110, 96, 0.42)';
    cCtx.fillRect(0, 48, 512, 34);
    cCtx.fillStyle = 'rgba(130, 74, 62, 0.36)';
    cCtx.fillRect(0, 108, 512, 28);
    cCtx.fillStyle = 'rgba(84, 110, 96, 0.38)';
    cCtx.fillRect(0, 162, 512, 34);

    const cofferDancheongTex = new C_ENGINE.CanvasTexture(cofferCanvas);
    cofferDancheongTex.colorSpace = C_ENGINE.SRGBColorSpace;
    try {
      const refCo = new Image();
      refCo.crossOrigin = 'anonymous';
      refCo.onload = () => {
        const iw = refCo.naturalWidth || refCo.width;
        const ih = refCo.naturalHeight || refCo.height;
        if (!iw || !ih) return;
        cCtx.clearRect(0, 0, 512, 256);
        cCtx.drawImage(refCo, iw * 0.41, ih * 0.045, iw * 0.18, ih * 0.13, 0, 0, 512, 256);
        cofferDancheongTex.needsUpdate = true;
      };
      refCo.src = encodeURI('청광사 내부 이미지.jpg');
    } catch {
      // 폴백 유지
    }

    const cofferWallMat = new C_ENGINE.MeshStandardMaterial({
      map: cofferDancheongTex,
      emissive: new C_ENGINE.Color(0x524432),
      emissiveMap: cofferDancheongTex,
      emissiveIntensity: 0.32,
      roughness: 0.86
    });

    const cofferH = 1.65;
    const cofferCenterY = centerCeilY + cofferH * 0.5;
    for (const zSign of [-1, 1]) {
      const cw = new C_ENGINE.Mesh(new C_ENGINE.PlaneGeometry(skyHalf * 2, cofferH), cofferWallMat);
      cw.position.set(0, cofferCenterY, midZ + zSign * skyHalf);
      cw.rotation.y = zSign > 0 ? Math.PI : 0;
      sanctGroup.add(cw);
    }
    for (const xSign of [-1, 1]) {
      const cw = new C_ENGINE.Mesh(new C_ENGINE.PlaneGeometry(skyHalf * 2, cofferH), cofferWallMat);
      cw.position.set(xSign * skyHalf, cofferCenterY, midZ);
      cw.rotation.y = xSign > 0 ? -Math.PI / 2 : Math.PI / 2;
      sanctGroup.add(cw);
    }
    const cofferTopY = centerCeilY + cofferH;
    // 천창 우물반자 가로·세로 살대 Y 높이 분리(교차점 Z-fighting 0%)
    for (const offset of [-1.65, 0, 1.65]) {
      m.createMesh(
        new C_ENGINE.BoxGeometry(skyHalf * 2 - 0.06, 0.14, 0.16),
        m.matDarkTimber,
        sanctGroup,
        { pos: [0, cofferTopY - 0.15, midZ + offset], castShadow: false, tone: 0.62 }
      );
      m.createMesh(
        new C_ENGINE.BoxGeometry(0.16, 0.14, skyHalf * 2 - 0.06),
        m.matDarkTimber,
        sanctGroup,
        { pos: [offset, cofferTopY - 0.23, midZ], castShadow: false, tone: 0.62 }
      );
    }
    const skylightTopMat = new C_ENGINE.MeshBasicMaterial({
      color: 0xfff0d0,
      transparent: true,
      opacity: 0.86
    });
    const skylightTop = new C_ENGINE.Mesh(new C_ENGINE.PlaneGeometry(skyHalf * 2, skyHalf * 2), skylightTopMat);
    skylightTop.rotation.x = Math.PI / 2;
    skylightTop.position.set(0, cofferTopY - 0.02, midZ);
    sanctGroup.add(skylightTop);

    // 좌·우 내벽 및 천장-벽면 전통 결구부 (창방 · 평방 · 주심도리 · 기둥 상부 공포 포작)
    const intPlasterMat = new C_ENGINE.MeshStandardMaterial({
      color: 0x9b9589,
      roughness: 0.94,
      metalness: 0.01
    });
    const sideWallH = outerCeilY - intFloorY + 0.15;
    const sideWallCenterY = intFloorY + sideWallH * 0.5;
    for (const sx of [-13.82, 13.82]) {
      const sWall = new C_ENGINE.Mesh(new C_ENGINE.PlaneGeometry(hallDepth, sideWallH), intPlasterMat);
      sWall.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
      sWall.position.set(sx, sideWallCenterY, midZ);
      sanctGroup.add(sWall);
      const inward = sx < 0 ? 1 : -1;
      // 회벽(sx) 앞쪽으로 완전히 이격해 모든 벽면 목재가 회벽과 Z-fighting 없이 입체 돌출
      const barX = sx + inward * 0.09;
      const colX = sx + inward * 0.13;

      // 하부 걸레받이 · 중인방 · 상인방 (측면 양 끝 0.70m 여유 확보)
      const sideTrimLen = hallDepth - 0.70;
      for (const barY of [0.85, 2.75, 4.95, outerCeilY - 0.76]) {
        m.createMesh(
          new C_ENGINE.BoxGeometry(0.14, barY === 0.85 ? 1.1 : 0.18, sideTrimLen),
          m.matDarkTimber,
          sanctGroup,
          { pos: [barX, barY, midZ], castShadow: false, tone: 0.60 }
        );
      }
      // 천장-벽면 경계 주심도리 및 고색 단청 반자띠 (세 부재 높이·깊이 완전 분리)
      m.createMesh(
        new C_ENGINE.CylinderGeometry(0.16, 0.16, sideTrimLen, 10),
        m.matDarkTimber,
        sanctGroup,
        { pos: [sx + inward * 0.28, outerCeilY - 0.22, midZ], rot: [Math.PI * 0.5, 0, 0], castShadow: false, tone: 0.55 }
      );
      m.createMesh(
        new C_ENGINE.BoxGeometry(0.14, 0.18, sideTrimLen),
        m.matDancheongJade,
        sanctGroup,
        { pos: [sx + inward * 0.11, outerCeilY - 0.50, midZ], castShadow: false, tone: 0.52 }
      );

      // 수직 내벽 기둥 및 천장 결구 공포(주두 · 첨차 · 소로 모두 서로 다른 높이·돌출량으로 Z-fighting 0%)
      for (const pz of sideZs) {
        if (Math.abs(pz - fZ) < 0.25 || Math.abs(pz - rZ) < 0.25) continue;
        m.createMesh(
          new C_ENGINE.BoxGeometry(0.22, sideWallH - 0.2, 0.26),
          m.matDarkTimber,
          sanctGroup,
          { pos: [colX, sideWallCenterY - 0.08, pz], castShadow: false, tone: 0.62 }
        );
        // 기둥 머리 주두 (반자띠보다 안쪽으로 뚜렷하게 돌출)
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.42, 0.24, 0.42, 2, 0.015),
          m.matDancheongJade,
          sanctGroup,
          { pos: [sx + inward * 0.25, outerCeilY - 0.50, pz], castShadow: false, tone: 0.58 }
        );
        // 상부 첨차 (주두 위, 별도 높이)
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.64, 0.14, 0.22, 2, 0.015),
          m.matDancheongRed,
          sanctGroup,
          { pos: [sx + inward * 0.36, outerCeilY - 0.30, pz], castShadow: false, tone: 0.58 }
        );
        // 교차 소로 (첨차 아래로 0.05m 분리해 상·하면 공면 0%)
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.28, 0.10, 0.68, 2, 0.015),
          m.matDarkTimber,
          sanctGroup,
          { pos: [sx + inward * 0.24, outerCeilY - 0.17, pz], castShadow: false, tone: 0.60 }
        );
      }
    }

    // 후면 벽체 및 후면 상단 천장-벽면 결구(창방 + 주심도리 + 공포)
    const backWallH = centerCeilY - intFloorY + 0.2;
    const sanctBackBacking = new C_ENGINE.Mesh(
      new C_ENGINE.PlaneGeometry(27.8, backWallH),
      darkSanctuaryMat
    );
    sanctBackBacking.rotation.y = Math.PI;
    sanctBackBacking.position.set(0, intFloorY + backWallH * 0.5, rZ - 0.16);
    sanctGroup.add(sanctBackBacking);

    m.createMesh(
      new C_ENGINE.BoxGeometry(27.0, 0.32, 0.30),
      m.matDarkTimber,
      sanctGroup,
      { pos: [0, outerCeilY - 0.38, rZ - 0.30], castShadow: false, tone: 0.58 }
    );

    // 전면 출입문 상부 실내 회벽 및 목조 인방 마감 (y = 4.02 ~ 천장 8.95 빈 공간 밀폐)
    // 외부 화반(최대 fZ+0.05)과 공포 첨차 내측면(fZ+0.14) 사이의 안전 구간 fZ + 0.11에 배치해 모든 부재와 Z-fighting 완전 제거
    const frontUpperH = centerCeilY - 4.02 + 0.15;
    const frontUpperWall = new C_ENGINE.Mesh(
      new C_ENGINE.PlaneGeometry(27.6, frontUpperH),
      intPlasterMat
    );
    frontUpperWall.position.set(0, 4.02 + frontUpperH * 0.5, fZ + 0.11);
    sanctGroup.add(frontUpperWall);
    for (const fBarY of [4.16, 5.65, outerCeilY - 0.42]) {
      m.createMesh(
        new C_ENGINE.BoxGeometry(27.0, 0.22, 0.18),
        m.matDarkTimber,
        sanctGroup,
        { pos: [0, fBarY, fZ + 0.29], castShadow: false, tone: 0.60 }
      );
    }

    // 내부 고주(高柱) 4주 및 상부 공포 결구
    const innerColH = outerCeilY + 0.42 - intFloorY;
    for (const [gx, gz] of hallInt.innerColumns) {
      m.createMesh(
        new C_ENGINE.CylinderGeometry(0.30, 0.34, innerColH, 16),
        m.matDarkTimber,
        sanctGroup,
        { pos: [gx, intFloorY + innerColH * 0.5, gz], castShadow: false, tone: 0.65 }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.74, 0.22, 0.74, 2, 0.02),
        m.matDancheongJade,
        sanctGroup,
        { pos: [gx, outerCeilY + 0.18, gz], castShadow: false, tone: 0.58 }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(1.12, 0.18, 0.36, 2, 0.02),
        m.matDancheongRed,
        sanctGroup,
        { pos: [gx, outerCeilY + 0.36, gz], castShadow: false, tone: 0.58 }
      );
    }

    // 청풍사 대형 내부 현대 선(禪) 아트 공간 — 「청풍수경(淸風水鏡) · 먹빛 차경」
    interiorBuilder?.build(sanctGroup, intFloorY);

    hg.add(sanctGroup);

    // 5. 전면 5칸 실사 입면 ('무량수전.jpg': 황토 포벽 + 열린 어칸·협칸 흰색 한지 덧문 + 퇴칸 정자살 분합창)
    const buildOchreUpperWall = (w, h, pos, rotY = 0) => {
      m.createMesh(
        new C_ENGINE.PlaneGeometry(w, h),
        ochreWallMat,
        hg,
        {
          pos,
          rot: [0, rotY, 0],
          preserveUvs: true,
          castShadow: false,
          tone: 0.99
        }
      );
    };

    for (let b = 0; b < 5; b++) {
      const x0 = colXs[b];
      const x1 = colXs[b + 1];
      const bayCenter = (x0 + x1) * 0.5;
      const bayClearW = x1 - x0 - 0.68;
      const isCentralThree = b >= 1 && b <= 3;

      // 상부 황토 포벽 (y: 4.10 -> 5.56) 및 화반 동자주
      buildOchreUpperWall(bayClearW, 1.48, [bayCenter, 4.83, fZ + 0.06], Math.PI);
      if (b !== 2) {
        // 좌우 칸 포벽 중앙 화반(花盤) 받침 (외부 장식 부재: 실내 회벽 fZ+0.11과 6cm 이격)
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.38, 0.56, 0.22, 2, 0.02),
          m.matTimber,
          hg,
          { pos: [bayCenter, 5.22, fZ - 0.06], tone: 0.94 }
        );
      }

      if (isCentralThree) {
        // 중앙 3칸(좌협칸·어칸·우협칸): 열린 법당 출입구 + 좌우로 접혀 열린 흰색 한지 사분합 덧문 + 정자살 문짝
        const isMainBay = b === 2;
        const openW = isMainBay ? 2.16 : 1.80;
        const sideSpan = (bayClearW - openW) * 0.5;
        const shutterW = Math.min(1.06, sideSpan * 0.62);
        const outerLatticeW = Math.max(0.32, sideSpan - shutterW);

        // 출입구 좌·우 문설주(문선 기둥) — 바닥 문턱(0.26)부터 상인방(3.98)까지 빈 공간 없이 밀착
        for (const sSign of [-1, 1]) {
          const jambX = bayCenter + sSign * (openW * 0.5 + 0.06);
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(0.13, 3.74, 0.26, 2, 0.015),
            m.matDarkTimber,
            hg,
            { pos: [jambX, 2.13, fZ], tone: 0.90 }
          );

          // 열린 출입구 양옆으로 젖혀 고정된 흰색 한지 사분합 덧문 (바닥 문턱까지 빈틈없이 연장)
          const shutCenterX = bayCenter + sSign * (openW * 0.5 + 0.12 + shutterW * 0.5);
          m.createMesh(
            new C_ENGINE.BoxGeometry(shutterW, 3.70, 0.055),
            whiteShutterMat,
            hg,
            {
              pos: [shutCenterX, 2.13, fZ - 0.10],
              preserveUvs: true,
              tone: 1.0
            }
          );

          // 기둥 쪽 외곽 정자살 분합문 + 하부 궁판 벽체 (바닥 문턱까지 빈틈없이 연장)
          const latCenterX =
            bayCenter + sSign * (openW * 0.5 + 0.12 + shutterW + outerLatticeW * 0.5);
          m.createMesh(
            new C_ENGINE.BoxGeometry(outerLatticeW, 3.70, 0.08),
            latticeDoorMat,
            hg,
            {
              pos: [latCenterX, 2.13, fZ + 0.03],
              preserveUvs: true,
              tone: 0.96
            }
          );
        }
      } else {
        // 좌·우 퇴칸(양 끝 칸): 하부 고목 머름·궁판 + 4짝 정자살 분합창
        m.createMesh(
          new C_ENGINE.BoxGeometry(bayClearW, 0.86, 0.16),
          wainscotMat,
          hg,
          {
            pos: [bayCenter, 0.98, fZ + 0.04],
            preserveUvs: true,
            tone: 0.96
          }
        );
        // 중방 (머름 상단 수평재)
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(bayClearW + 0.08, 0.14, 0.26, 2, 0.015),
          m.matTimber,
          hg,
          { pos: [bayCenter, 1.44, fZ], tone: 0.94 }
        );

        const leafCount = 4;
        const leafW = (bayClearW - 0.12) / leafCount;
        for (let lf = 0; lf < leafCount; lf++) {
          const lx = bayCenter - bayClearW * 0.5 + 0.06 + (lf + 0.5) * leafW;
          m.createMesh(
            new C_ENGINE.BoxGeometry(leafW - 0.03, 2.42, 0.08),
            latticeDoorMat,
            hg,
            {
              pos: [lx, 2.71, fZ + 0.04],
              preserveUvs: true,
              tone: 0.98
            }
          );
          // 짝 사이 입체 목조 문선
          if (lf > 0) {
            const mx = bayCenter - bayClearW * 0.5 + 0.06 + lf * leafW;
            m.createMesh(
              new C_ENGINE.BoxGeometry(0.05, 2.44, 0.13),
              m.matDarkTimber,
              hg,
              { pos: [mx, 2.71, fZ + 0.01], tone: 0.88 }
            );
          }
        }
      }
    }

    // 6. '淸 風 明 月' (청풍명월) 본전 전통 가로 대편액 현판 (좌→우 정방향)
    const plaqueTex = TextureFactory.createMainHallPlaqueTexture(cfg.hanja || '淸 風 明 月', {
      rtl: false
    });
    const plaqueGroup = new C_ENGINE.Group();
    plaqueGroup.name = 'CheongpungsaPlaqueGroup';
    // 어칸 창방 중앙(y = 4.80, z = 6.46)에 걸고 마당 시선을 향해 자연스럽게 숙여(-0.075 rad) 3글자 완전 노출
    plaqueGroup.position.set(0, 4.80, 6.46);
    plaqueGroup.rotation.set(-0.075, Math.PI, 0);

    const plaqueFrameMat = new C_ENGINE.MeshStandardMaterial({
      color: 0x241d17,
      roughness: 0.80,
      metalness: 0.06
    });
    const plaqueBackMesh = new C_ENGINE.Mesh(
      new C_ENGINE.RoundedBoxGeometry(3.84, 1.36, 0.13, 2, 0.025),
      plaqueFrameMat
    );
    plaqueBackMesh.position.set(0, 0, 0);
    plaqueBackMesh.castShadow = true;
    plaqueGroup.add(plaqueBackMesh);

    // 외곽 테두리 액자 몰딩 (글자·문양 판면 바깥 가장자리에만 배치하여 가림 0%)
    const rimBarThick = 0.09;
    for (const ry of [-0.635, 0.635]) {
      const bar = new C_ENGINE.Mesh(
        new C_ENGINE.BoxGeometry(3.84, rimBarThick, 0.045),
        plaqueFrameMat
      );
      bar.position.set(0, ry, 0.082);
      plaqueGroup.add(bar);
    }
    for (const rx of [-1.875, 1.875]) {
      const bar = new C_ENGINE.Mesh(
        new C_ENGINE.BoxGeometry(rimBarThick, 1.18, 0.045),
        plaqueFrameMat
      );
      bar.position.set(rx, 0, 0.082);
      plaqueGroup.add(bar);
    }

    const plaqueFaceMat = new C_ENGINE.MeshStandardMaterial({
      map: plaqueTex,
      roughness: 0.54,
      metalness: 0.12,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const plaqueFaceMesh = new C_ENGINE.Mesh(
      new C_ENGINE.PlaneGeometry(3.66, 1.18),
      plaqueFaceMat
    );
    plaqueFaceMesh.position.set(0, 0, 0.076);
    plaqueGroup.add(plaqueFaceMesh);
    hg.add(plaqueGroup);

    // 7. 좌·우 측면 전체 칸 입면 (x = ±14.2: 화방벽 + 회벽/판벽 + 정자살 창호 + 황토 포벽)
    for (const sideSign of [-1, 1]) {
      const sx = sideSign * 14.2;
      const wallInsetX = sx - sideSign * 0.05;
      const sideRotY = sideSign > 0 ? Math.PI / 2 : -Math.PI / 2;
      const sideBayCount = sideZs.length - 1;

      for (let sb = 0; sb < sideBayCount; sb++) {
        const z0 = sideZs[sb];
        const z1 = sideZs[sb + 1];
        const bz = (z0 + z1) * 0.5;
        const clearD = z1 - z0 - 0.56; // ~1.64m

        // 하부 전통 화방벽 (y: 0.44 -> 1.66) 및 중방
        m.createMesh(
          new C_ENGINE.BoxGeometry(0.16, 1.22, clearD),
          hwabangWallMat,
          hg,
          {
            pos: [wallInsetX, 1.05, bz],
            preserveUvs: true,
            tone: 0.97
          }
        );
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.26, 0.14, clearD + 0.1, 2, 0.015),
          m.matTimber,
          hg,
          { pos: [sx, 1.70, bz], tone: 0.94 }
        );

        const isSideWindowBay = sb === 1 || sb === sideBayCount - 2;
        if (isSideWindowBay) {
          // 측면 중앙 칸: 정자살 2짝 측면 창호/출입문
          m.createMesh(
            new C_ENGINE.BoxGeometry(0.10, 2.18, clearD),
            latticeDoorMat,
            hg,
            {
              pos: [wallInsetX, 2.84, bz],
              preserveUvs: true,
              tone: 0.96
            }
          );
          m.createMesh(
            new C_ENGINE.BoxGeometry(0.15, 2.20, 0.06),
            m.matDarkTimber,
            hg,
            { pos: [sx + sideSign * 0.02, 2.84, bz], tone: 0.88 }
          );
        } else {
          // 측면 전·후 협칸: 단정한 회벽 + 중인방 목조 가구선
          m.createMesh(
            new C_ENGINE.BoxGeometry(0.14, 2.18, clearD),
            m.matPlaster,
            hg,
            { pos: [wallInsetX, 2.84, bz], tone: 0.96 }
          );
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(0.22, 0.12, clearD + 0.08, 2, 0.015),
            m.matTimber,
            hg,
            { pos: [sx, 2.84, bz], tone: 0.93 }
          );
        }

        // 상부 황토 포벽 (y: 4.10 -> 5.54) 및 화반
        buildOchreUpperWall(clearD, 1.46, [wallInsetX, 4.82, bz], sideRotY);
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.22, 0.54, 0.34, 2, 0.02),
          m.matTimber,
          hg,
          { pos: [sx + sideSign * 0.02, 5.22, bz], tone: 0.94 }
        );
      }

      // 팔작지붕 측면 날개 지붕 밑(y: 5.90 -> 8.02) 상부 가구 벽체(대들보·중도리·동자주·회벽 마감)
      m.createMesh(
        new C_ENGINE.BoxGeometry(0.20, 2.12, totalSpanZ - 0.12),
        m.matPlaster,
        hg,
        { pos: [sx - sideSign * 0.12, 6.96, midZ], castShadow: false, tone: 0.93 }
      );
      // 측면 대들보(보머리) · 종량 · 동자주 목부재 입체 표현
      for (const beamY of [6.36, 7.18, 7.92]) {
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.28, 0.20, totalSpanZ + 0.3, 2, 0.02),
          m.matDarkTimber,
          hg,
          { pos: [sx - sideSign * 0.08, beamY, midZ], tone: 0.90 }
        );
      }
      const sidePostCount = Math.max(5, sideZs.length);
      for (let pi = 0; pi < sidePostCount; pi++) {
        const postZ = fZ + 0.15 + (pi / (sidePostCount - 1)) * (totalSpanZ - 0.3);
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.24, 2.08, 0.20, 2, 0.02),
          m.matTimber,
          hg,
          { pos: [sx - sideSign * 0.06, 6.96, postZ], tone: 0.92 }
        );
      }
    }

    // 8. 후면 5칸 입면 (z = 13.6: 중앙 어칸 정자살 분합문 + 협칸 정자살 광창 + 화방벽 + 상부 황토 포벽)
    for (let b = 0; b < 5; b++) {
      const x0 = colXs[b];
      const x1 = colXs[b + 1];
      const bayCenter = (x0 + x1) * 0.5;
      const bayClearW = x1 - x0 - 0.68;

      // 후면 상부 황토 포벽 및 화반
      buildOchreUpperWall(bayClearW, 1.48, [bayCenter, 4.83, rZ - 0.06], 0);
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.38, 0.56, 0.22, 2, 0.02),
        m.matTimber,
        hg,
        { pos: [bayCenter, 5.22, rZ + 0.02], tone: 0.94 }
      );

      if (b === 2) {
        // 후면 중앙 어칸(후면 돌계단 정면): 고목 궁판 벽 + 중앙 4짝 정자살 뒷문
        const rearDoorTotalW = 3.56;
        const sidePanelW = (bayClearW - rearDoorTotalW) * 0.5;

        for (const sSign of [-1, 1]) {
          const px = bayCenter + sSign * (rearDoorTotalW * 0.5 + sidePanelW * 0.5);
          m.createMesh(
            new C_ENGINE.BoxGeometry(sidePanelW, 3.36, 0.14),
            wainscotMat,
            hg,
            { pos: [px, 2.24, rZ - 0.04], preserveUvs: true, tone: 0.94 }
          );
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(0.14, 3.40, 0.26, 2, 0.015),
            m.matDarkTimber,
            hg,
            { pos: [bayCenter + sSign * (rearDoorTotalW * 0.5 + 0.04), 2.24, rZ], tone: 0.90 }
          );
        }

        const rLeafW = rearDoorTotalW / 4;
        for (let lf = 0; lf < 4; lf++) {
          const lx = bayCenter - rearDoorTotalW * 0.5 + (lf + 0.5) * rLeafW;
          m.createMesh(
            new C_ENGINE.BoxGeometry(rLeafW - 0.03, 3.32, 0.09),
            latticeDoorMat,
            hg,
            { pos: [lx, 2.24, rZ - 0.02], preserveUvs: true, tone: 0.97 }
          );
          if (lf > 0) {
            const mx = bayCenter - rearDoorTotalW * 0.5 + lf * rLeafW;
            m.createMesh(
              new C_ENGINE.BoxGeometry(0.05, 3.34, 0.15),
              m.matDarkTimber,
              hg,
              { pos: [mx, 2.24, rZ + 0.02], tone: 0.88 }
            );
          }
        }
      } else {
        // 후면 협칸(b = 1, 3) 및 퇴칸(b = 0, 4): 하부 화방벽 + 상부 회벽 + 협칸 정자살 광창
        m.createMesh(
          new C_ENGINE.BoxGeometry(bayClearW, 1.22, 0.16),
          hwabangWallMat,
          hg,
          { pos: [bayCenter, 1.05, rZ - 0.05], preserveUvs: true, tone: 0.97 }
        );
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(bayClearW + 0.08, 0.14, 0.26, 2, 0.015),
          m.matTimber,
          hg,
          { pos: [bayCenter, 1.70, rZ], tone: 0.94 }
        );
        m.createMesh(
          new C_ENGINE.BoxGeometry(bayClearW, 2.18, 0.14),
          m.matPlaster,
          hg,
          { pos: [bayCenter, 2.84, rZ - 0.05], tone: 0.96 }
        );
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(bayClearW + 0.08, 0.12, 0.22, 2, 0.015),
          m.matTimber,
          hg,
          { pos: [bayCenter, 2.84, rZ], tone: 0.92 }
        );

        if (b === 1 || b === 3) {
          // 좌·우 협칸 후면 정자살 고창(광창)
          const winW = 2.05;
          m.createMesh(
            new C_ENGINE.BoxGeometry(winW, 1.66, 0.12),
            latticeDoorMat,
            hg,
            { pos: [bayCenter, 2.98, rZ - 0.01], preserveUvs: true, tone: 0.98 }
          );
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(winW + 0.18, 0.12, 0.24, 2, 0.015),
            m.matDarkTimber,
            hg,
            { pos: [bayCenter, 2.12, rZ + 0.02], tone: 0.90 }
          );
        }
      }
    }

    // 9. 4면 겹처마(연목 + 부연 + 마구리) + 4귀 추녀·사래 + 실사 팔작지붕
    const roofSpec = cfg.roof;
    const roofZ = roofSpec.z;
    const roofHalfD = roofSpec.depth * 0.5;
    const eaveBaseY = roofSpec.baseY; // 6.12

    // 전·후면(zSign = -1 전면, +1 후면) 겹처마 서까래 56열 × 2면
    const fbRafterCount = 56;
    for (let i = 0; i < fbRafterCount; i++) {
      const u = (i / (fbRafterCount - 1)) * 2 - 1;
      const absU = Math.abs(u);
      const rx = u * 18.2;
      const cornerLift = Math.pow(absU, 2.6) * 1.12;
      const anheori = Math.pow(absU, 2.2) * 0.42;

      for (const zSign of [-1, 1]) {
        // 원형 연목(서까래) 곡선 (외벽선 fZ/rZ 바깥에서만 시작해 실내 천장 관통 방지)
        const rCurve = new C_ENGINE.CatmullRomCurve3([
          new C_ENGINE.Vector3(rx * 0.95, eaveBaseY + 0.84 + cornerLift * 0.30, roofZ + zSign * (roofHalfD - 3.25)),
          new C_ENGINE.Vector3(
            rx * 0.985,
            eaveBaseY + 0.36 + cornerLift * 0.68,
            roofZ + zSign * (roofHalfD - 2.55 + anheori * 0.5)
          ),
          new C_ENGINE.Vector3(
            rx * 1.015,
            eaveBaseY - 0.02 + cornerLift,
            roofZ + zSign * (roofHalfD - 1.02 + anheori * 0.85)
          )
        ]);
        m.createMesh(
          new C_ENGINE.TubeGeometry(rCurve, 7, 0.076, 8, false),
          m.matTimber,
          hg,
          { castShadow: false, tone: 0.96 }
        );
        // 연목 끝 흰 회칠 마구리
        m.createMesh(
          new C_ENGINE.CylinderGeometry(0.075, 0.075, 0.04, 10),
          rafterCapMat,
          hg,
          {
            pos: [
              rx * 1.016,
              eaveBaseY - 0.03 + cornerLift,
              roofZ + zSign * (roofHalfD - 1.0 + anheori * 0.85)
            ],
            rot: [Math.PI * 0.5 + zSign * 0.18, 0, 0],
            castShadow: false
          }
        );

        // 각형 부연(겹처마 끝 짧은 서까래)
        m.createMesh(
          new C_ENGINE.BoxGeometry(0.11, 0.095, 1.05),
          m.matPaleTimber,
          hg,
          {
            pos: [
              rx * 1.03,
              eaveBaseY + 0.05 + cornerLift * 1.08,
              roofZ + zSign * (roofHalfD - 0.54 + anheori)
            ],
            rot: [zSign * 0.16, 0, 0],
            castShadow: false,
            tone: 0.98
          }
        );
        m.createMesh(
          new C_ENGINE.BoxGeometry(0.11, 0.095, 0.035),
          rafterCapMat,
          hg,
          {
            pos: [
              rx * 1.032,
              eaveBaseY - 0.03 + cornerLift * 1.08,
              roofZ + zSign * (roofHalfD - 0.02 + anheori)
            ],
            rot: [zSign * 0.16, 0, 0],
            castShadow: false
          }
        );
      }
    }

    // 좌·우 측면(xSign = -1 좌측, +1 우측) 팔작 날개 처마 서까래 (깊이에 맞춰 동적 확장)
    const sideRafterCount = 34;
    const sideRafterHalfZ = roofHalfD - 0.85;
    for (let i = 0; i < sideRafterCount; i++) {
      const w = (i / (sideRafterCount - 1)) * 2 - 1;
      const absW = Math.abs(w);
      const rz = roofZ + w * sideRafterHalfZ;
      const cornerLift = Math.pow(absW, 2.4) * 0.72;
      const anheoriX = Math.pow(absW, 2.0) * 0.35;

      for (const xSign of [-1, 1]) {
        const sCurve = new C_ENGINE.CatmullRomCurve3([
          new C_ENGINE.Vector3(xSign * 14.05, eaveBaseY + 1.62, rz * 0.98 + roofZ * 0.02),
          new C_ENGINE.Vector3(
            xSign * (16.25 + anheoriX * 0.5),
            eaveBaseY + 0.68 + cornerLift * 0.55,
            rz
          ),
          new C_ENGINE.Vector3(
            xSign * (18.15 + anheoriX * 0.85),
            eaveBaseY - 0.02 + cornerLift,
            rz + w * 0.25
          )
        ]);
        m.createMesh(
          new C_ENGINE.TubeGeometry(sCurve, 7, 0.074, 8, false),
          m.matTimber,
          hg,
          { castShadow: false, tone: 0.95 }
        );
        m.createMesh(
          new C_ENGINE.BoxGeometry(0.96, 0.095, 0.11),
          m.matPaleTimber,
          hg,
          {
            pos: [
              xSign * (18.58 + anheoriX),
              eaveBaseY + 0.04 + cornerLift * 1.06,
              rz + w * 0.30
            ],
            rot: [0, 0, -xSign * 0.22],
            castShadow: false,
            tone: 0.98
          }
        );
      }
    }

    // 4귀 대각선 추녀(Chunyeo) 및 사래(Sarae) 부재 (roofHalfD 기반 동적 정합)
    for (const xSign of [-1, 1]) {
      for (const zSign of [-1, 1]) {
        const startV = new C_ENGINE.Vector3(xSign * 13.8, eaveBaseY + 0.32, roofZ + zSign * Math.max(3.1, roofHalfD - 4.4));
        const midV = new C_ENGINE.Vector3(xSign * 16.8, eaveBaseY + 0.48, roofZ + zSign * (roofHalfD - 2.0));
        const endV = new C_ENGINE.Vector3(xSign * 19.35, eaveBaseY + 0.98, roofZ + zSign * (roofHalfD + 0.05));
        const hipCurve = new C_ENGINE.CatmullRomCurve3([startV, midV, endV]);
        m.createMesh(
          new C_ENGINE.TubeGeometry(hipCurve, 10, 0.16, 8, false),
          m.matDarkTimber,
          hg,
          { scale: [1.0, 1.22, 1.0], tone: 0.92 }
        );
      }
    }

    // 인터랙티브 풍경종(COURTYARD_CONFIG.windBellPos) 상단과 처마 서까래를 잇는 청동 달대 사슬
    const [bellX, bellY, bellZ] = COURTYARD_CONFIG.windBellPos;
    const hangerH = Math.max(0.2, eaveBaseY + 0.05 - bellY);
    const bellHanger = new C_ENGINE.Mesh(
      new C_ENGINE.CylinderGeometry(0.014, 0.014, hangerH, 8),
      m.matBronze
    );
    bellHanger.position.set(bellX, bellY + hangerH * 0.5, bellZ);
    hg.add(bellHanger);

    // 10. 한국 전통 실사 기와 팔작지붕 결합
    buildRealisticPaljakRoof(hg, roofSpec, m);

    parent.add(hg);
}
