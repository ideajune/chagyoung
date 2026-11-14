/**
 * BuseoksaBuilder — 영주 부석사 무량수전, 안양루, 통일신라 석등, 박석 마당, 스캔 소나무·단풍나무 숲, 소백산맥 원경 및 운해 빌더
 * - worldConfig.js의 단일 원본(SSOT) 수치를 참조하여 3D 건축물과 보행/충돌 좌표계가 항상 일치하도록 구성합니다.
 */

import {
  MURYANGSUJEON_CONFIG,
  ANYANGRU_CONFIG,
  COURTYARD_CONFIG
} from '../config/worldConfig.js';
import { TextureFactory } from './TextureFactory.js';
import { buildRealisticPaljakRoof } from './PaljakRoofBuilder.js';

const C_ENGINE = window.SANSA_CORE;

export class BuseoksaBuilder {
  constructor(sceneManager, materials) {
    this.sceneManager = sceneManager;
    this.materials = materials;
    this.buseoksaGroup = sceneManager.buseoksaGroup;

    this.buseoksaGroundMat = null;
    this.stoneLanternLight = null;
    this.sobaeksanVistaMat = null;
    this.sobaeksanVistaMesh = null;
    this.cloudPlanes = [];
    this.buseoksaPineAnchors = [];
    this.scannedSeasonalTwigMats = [];
  }

  build() {
    const g = this.buseoksaGroup;
    const m = this.materials;

    // 1. 360° 마당 및 산자락 지형 메쉬
    this.buseoksaGroundMat = m.matGround.clone();
    const groundGeo = new C_ENGINE.PlaneGeometry(340, 320, 84, 84);
    groundGeo.rotateX(-Math.PI / 2);
    const gPos = groundGeo.getAttribute('position');
    for (let i = 0; i < gPos.count; i++) {
      const x = gPos.getX(i);
      const z = gPos.getZ(i);
      let y = -0.82;
      if (z < -25.0) {
        const d = -25.0 - z;
        y = -0.82 - Math.min(5.2, d * 0.2) + Math.sin(x * 0.07) * Math.min(1.4, d * 0.035);
      } else {
        const sideDist = Math.max(0, Math.abs(x) - 22.0);
        const sideLift = Math.min(7.5, Math.pow(sideDist * 0.075, 1.35) * 4.4);
        y = -0.82 + sideLift + Math.sin(x * 0.2 + z * 0.18) * 0.025;
      }
      gPos.setY(i, y);
    }
    groundGeo.computeVertexNormals();
    m.createMesh(groundGeo, this.buseoksaGroundMat, g, {
      castShadow: false,
      receiveShadow: true,
      tone: 0.98,
      variance: 0.04
    });

    // 2~6. 국보 부석사 무량수전 본전 (실사 기반 전면 5칸·측면 3칸·후면 5칸·4면 처마·현판·내부 불단 완성형)
    this.buildMuryangsujeonHall(g);

    // 7. 마당 박석길, 석축 단 및 자연 이끼 바위
    for (let i = 0; i < 24; i++) {
      const fz = 3.2 - i * 0.72;
      const fx = Math.sin(i * 0.38) * 0.16;
      const fw = 2.45 + (i % 3) * 0.24;
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(fw, 0.08, 0.64, 2, 0.025),
        m.matStone,
        g,
        {
          pos: [fx, -0.79, fz],
          rot: [0, (i % 2 === 0 ? 1 : -1) * 0.02, 0],
          tone: 0.92 + (i % 4) * 0.04
        }
      );
    }
    for (let ix = -7; ix <= 7; ix++) {
      if (Math.abs(ix) <= 1) continue;
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(1.35, 0.075, 1.55, 2, 0.025),
        m.matStone,
        g,
        {
          pos: [ix * 1.65, -0.795, -5.8 + Math.cos(ix) * 0.14],
          rot: [0, (ix % 2) * 0.02, 0],
          tone: 0.93 + (Math.abs(ix) % 3) * 0.03
        }
      );
    }

    for (let tier = 0; tier < 3; tier++) {
      for (let bx = -28; bx <= 28; bx += 1.85) {
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(1.78, 0.52, 1.05, 2, 0.07),
          m.matStone,
          g,
          {
            pos: [bx + (tier % 2) * 0.35, -1.65 + tier * 0.48, -24.6 + tier * 0.18],
            tone: 0.88 + ((Math.abs(bx) + tier) % 4) * 0.05
          }
        );
      }
    }

    COURTYARD_CONFIG.boulders.forEach(({ pos, scale }, idx) => {
      m.createMesh(
        new C_ENGINE.SphereGeometry(1, 18, 14),
        idx % 3 === 0 ? m.matMoss : m.matRock,
        g,
        { pos, scale, rot: [0, idx * 1.1, 0], tone: 0.94 }
      );
    });

    // 8. 통일신라 부석사 무량수전 앞 석등
    const { stoneLantern } = COURTYARD_CONFIG;
    this.buildBuseoksaStoneLantern(g, stoneLantern.x, stoneLantern.y, stoneLantern.z);

    // 9. 안양루 누각 및 14개 명상 방석
    this.buildPavilion3D(g, ANYANGRU_CONFIG);

    // 10. 수목 앵커 구성 (스캔 소나무 및 단풍나무)
    this.buseoksaPineAnchors = COURTYARD_CONFIG.scannedTreeAnchors.map((spec) => ({ ...spec }));
    COURTYARD_CONFIG.innerSeasonalTrees.forEach(({ x, y, z, scale }) => {
      this.buildSeasonalTree(g, x, y, z, scale);
    });
    COURTYARD_CONFIG.outerGreenTrees.forEach(({ x, y, z, scale }) => {
      this.buildGreenForestTree(g, x, y, z, scale);
    });

    // 11. 소백산맥 실사 원경 파노라마 메쉬
    this.buildSobaeksanMountainRidges(g);

    // 12. 운해 및 상층 구름
    this.buildSeaOfClouds(g);

    // 13. 스캔 소나무·단풍나무 GLB 비동기 로드 및 배치
    this.loadAndPopulatePines();

    return this.buseoksaGroundMat;
  }

  /**
   * 국보 영주 부석사 무량수전 본전 360° 완성형 3D 빌더
   * - 전면('무량수전.jpg' 실사 기반 황토 포벽, 열린 3칸 어칸·협칸 흰색 한지 사분합 덧문, 정자살 분합창, 내부 불단)
   * - '無量壽殿' 사각 현판 단일 그룹 일체화로 4글자(無·量·壽·殿) 100% 무가림 노출 보장
   * - 좌·우 측면 3칸 및 후면 5칸(화방벽, 정자살 창호, 측면 상부 박공 하부 벽체, 4면 기단·계단·겹처마·추녀) 완성
   */
  buildMuryangsujeonHall(parent) {
    const m = this.materials;
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
    for (const pz of [5.7, 7.8, 9.7, 11.5, 13.4, 15.5]) {
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
      this.buildTraditionalStoneStaircase(hg, {
        x: sx,
        bottomY: -0.82,
        topY,
        startZ: 3.60,
        endZ: cfg.stylobateMinZ + 0.03,
        treadWidth: isCenter ? 4.12 : 2.94,
        cheekWidth: 0.34,
        stepCount: 5
      });
    });

    // 후면 중앙 화강암 돌계단 (통돌 디딤석 + 삼각 귀틀 소매돌 일체형)
    this.buildTraditionalStoneStaircase(hg, {
      x: 0,
      bottomY: -0.82,
      topY,
      startZ: 17.32,
      endZ: cfg.stylobateMaxZ - 0.03,
      treadWidth: 3.84,
      cheekWidth: 0.34,
      stepCount: 5
    });

    // 무량수전 좌·우·후면 외곽 산책 박석 징검돌
    for (const sideSign of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const sz = 4.2 + i * 1.65;
        const sx = sideSign * (18.4 + Math.sin(i * 0.7) * 0.22);
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(1.18, 0.065, 0.96, 2, 0.02),
          m.matStone,
          hg,
          { pos: [sx, -0.79, sz], rot: [0, sideSign * 0.04 * (i % 3), 0], tone: 0.92 + (i % 3) * 0.03 }
        );
      }
    }
    for (let ix = -8; ix <= 8; ix++) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(1.26, 0.065, 0.98, 2, 0.02),
        m.matStone,
        hg,
        {
          pos: [ix * 2.15, -0.79, 18.25 + Math.cos(ix * 0.6) * 0.16],
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
      // 하인방/문지방 (전·후면 통재)
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(totalSpanX + 0.3, 0.22, 0.34, 2, 0.02),
        m.matDarkTimber,
        hg,
        { pos: [0, topY + 0.28, wz], tone: 0.90 }
      );
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
    // 내진 바닥(전돌 마루), 우물천장, 좌우 어두운 내벽
    m.createMesh(
      new C_ENGINE.BoxGeometry(17.8, 0.14, 4.4),
      m.matDarkTimber,
      sanctGroup,
      { pos: [0, topY + 0.22, 9.25], castShadow: false, tone: 0.65 }
    );
    const sanctCeil = new C_ENGINE.Mesh(
      new C_ENGINE.PlaneGeometry(17.8, 4.4),
      darkSanctuaryMat
    );
    sanctCeil.rotation.x = Math.PI / 2;
    sanctCeil.position.set(0, 5.45, 9.25);
    sanctGroup.add(sanctCeil);

    for (const sx of [-8.75, 8.75]) {
      const sWall = new C_ENGINE.Mesh(new C_ENGINE.PlaneGeometry(4.4, 5.1), darkSanctuaryMat);
      sWall.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
      sWall.position.set(sx, 2.90, 9.25);
      sanctGroup.add(sWall);
    }
    const sanctBackBacking = new C_ENGINE.Mesh(
      new C_ENGINE.PlaneGeometry(17.8, 5.1),
      darkSanctuaryMat
    );
    sanctBackBacking.rotation.y = Math.PI;
    sanctBackBacking.position.set(0, 2.90, 11.35);
    sanctGroup.add(sanctBackBacking);

    // 내부 고주(高柱) 4주
    for (const gx of [-3.2, 3.2]) {
      for (const gz of [8.85, 10.95]) {
        m.createMesh(
          new C_ENGINE.CylinderGeometry(0.30, 0.34, 5.0, 16),
          m.matDarkTimber,
          sanctGroup,
          { pos: [gx, 2.90, gz], castShadow: false, tone: 0.78 }
        );
      }
    }

    // 내진 후불벽 실사 이미지 ('assets/altar-wall-calm-20261102.jpg') 및 수미단 불단
    const altarWallMat = new C_ENGINE.MeshStandardMaterial({
      color: 0xc99c68,
      emissive: new C_ENGINE.Color(0xffb866),
      emissiveIntensity: 0.22,
      roughness: 0.78,
      metalness: 0.04
    });
    const texLoader = new C_ENGINE.TextureLoader();
    texLoader.load(
      'assets/altar-wall-calm-20261102.jpg',
      (tex) => {
        tex.colorSpace = C_ENGINE.SRGBColorSpace;
        altarWallMat.map = tex;
        altarWallMat.emissiveMap = tex;
        altarWallMat.color.setHex(0xffffff);
        altarWallMat.needsUpdate = true;
      },
      undefined,
      () => {}
    );
    const altarMuralMesh = new C_ENGINE.Mesh(
      new C_ENGINE.PlaneGeometry(13.6, 4.15),
      altarWallMat
    );
    altarMuralMesh.rotation.y = Math.PI;
    altarMuralMesh.position.set(0, 2.82, 11.18);
    sanctGroup.add(altarMuralMesh);

    // 수미단(조각 불단) + 청동 향로·촛대 + 서쪽 동향 소조아미타여래좌상 광배 실루엣
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(7.2, 0.88, 1.35, 2, 0.04),
      m.matDarkTimber,
      sanctGroup,
      { pos: [0, 0.86, 10.32], castShadow: false, tone: 0.82 }
    );
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(7.45, 0.14, 1.52, 2, 0.025),
      m.matDancheongRed,
      sanctGroup,
      { pos: [0, 1.34, 10.32], castShadow: false }
    );
    const censerMesh = new C_ENGINE.Mesh(
      new C_ENGINE.CylinderGeometry(0.18, 0.14, 0.26, 14),
      m.matBronze
    );
    censerMesh.position.set(0, 1.54, 9.92);
    sanctGroup.add(censerMesh);
    for (const candleX of [-1.45, 1.45]) {
      const flame = new C_ENGINE.Mesh(
        new C_ENGINE.SphereGeometry(0.065, 10, 10),
        m.matWarmHanji
      );
      flame.position.set(candleX, 1.66, 9.95);
      sanctGroup.add(flame);
    }

    // 서쪽(좌측 내진) 동향 아미타여래좌상 금빛 광배 및 좌대
    const westHalo = new C_ENGINE.Mesh(
      new C_ENGINE.CylinderGeometry(0.95, 0.82, 0.08, 20),
      m.matBronze
    );
    westHalo.rotation.z = Math.PI / 2;
    westHalo.position.set(-8.15, 2.35, 9.25);
    sanctGroup.add(westHalo);
    const westBuddhaBody = new C_ENGINE.Mesh(
      new C_ENGINE.ConeGeometry(0.52, 1.28, 16),
      m.matBronze
    );
    westBuddhaBody.position.set(-7.88, 2.02, 9.25);
    sanctGroup.add(westBuddhaBody);
    const westBuddhaHead = new C_ENGINE.Mesh(
      new C_ENGINE.SphereGeometry(0.24, 14, 14),
      m.matBronze
    );
    westBuddhaHead.position.set(-7.88, 2.76, 9.25);
    sanctGroup.add(westBuddhaHead);

    // 법당 내부 은은한 성소 조명
    const sanctuaryLight = new C_ENGINE.PointLight(0xffb85e, 1.05, 10.5, 1.6);
    sanctuaryLight.position.set(0, 3.05, 9.25);
    sanctGroup.add(sanctuaryLight);

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
        // 좌우 칸 포벽 중앙 화반(花盤) 받침 (어칸 중앙은 현판 자리)
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.38, 0.56, 0.22, 2, 0.02),
          m.matTimber,
          hg,
          { pos: [bayCenter, 5.22, fZ - 0.02], tone: 0.94 }
        );
      }

      if (isCentralThree) {
        // 중앙 3칸(좌협칸·어칸·우협칸): 열린 법당 출입구 + 좌우로 접혀 열린 흰색 한지 사분합 덧문 + 정자살 문짝
        const isMainBay = b === 2;
        const openW = isMainBay ? 2.16 : 1.80;
        const sideSpan = (bayClearW - openW) * 0.5;
        const shutterW = Math.min(1.06, sideSpan * 0.62);
        const outerLatticeW = Math.max(0.32, sideSpan - shutterW);

        // 출입구 좌·우 문설주(문선 기둥)
        for (const sSign of [-1, 1]) {
          const jambX = bayCenter + sSign * (openW * 0.5 + 0.06);
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(0.13, 3.36, 0.26, 2, 0.015),
            m.matDarkTimber,
            hg,
            { pos: [jambX, 2.24, fZ], tone: 0.90 }
          );

          // 열린 출입구 양옆으로 젖혀 고정된 흰색 한지 사분합 덧문 ('무량수전.jpg' 핵심 시각 포인트)
          const shutCenterX = bayCenter + sSign * (openW * 0.5 + 0.12 + shutterW * 0.5);
          m.createMesh(
            new C_ENGINE.BoxGeometry(shutterW, 3.32, 0.055),
            whiteShutterMat,
            hg,
            {
              pos: [shutCenterX, 2.24, fZ - 0.10],
              preserveUvs: true,
              tone: 1.0
            }
          );

          // 기둥 쪽 외곽 정자살 분합문 + 하부 궁판 벽체
          const latCenterX =
            bayCenter + sSign * (openW * 0.5 + 0.12 + shutterW + outerLatticeW * 0.5);
          m.createMesh(
            new C_ENGINE.BoxGeometry(outerLatticeW, 3.32, 0.08),
            latticeDoorMat,
            hg,
            {
              pos: [latCenterX, 2.24, fZ + 0.03],
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

    // 6. '淸 風 寺' (청풍사) 본전 전통 가로 대편액 현판 (단일 Group 일체화로 뒤판 간섭·처마 가림 원천 차단)
    const plaqueTex = TextureFactory.createMainHallPlaqueTexture(cfg.hanja || '淸 風 寺', {
      rtl: true
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

    this.muryangPlaqueGroup = plaqueGroup;
    this.muryangPlaqueBack = plaqueBackMesh;
    this.muryangPlaqueFace = plaqueFaceMesh;
    hg.add(plaqueGroup);

    // 7. 좌·우 측면 3칸 입면 (x = ±14.2: 화방벽 + 회벽/판벽 + 중앙 정자살 창호 + 황토 포벽 + 상부 팔작 합각 하부 벽체)
    for (const sideSign of [-1, 1]) {
      const sx = sideSign * 14.2;
      const wallInsetX = sx - sideSign * 0.05;
      const sideRotY = sideSign > 0 ? Math.PI / 2 : -Math.PI / 2;

      for (let sb = 0; sb < 3; sb++) {
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

        if (sb === 1) {
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
      for (const postZ of [7.15, 8.7, 10.3, 11.9, 13.45]) {
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
    const roofSpec = cfg.roof; // { x: 0, z: 10.3, baseY: 6.12, width: 38.2, depth: 14.8, ... }
    const roofZ = roofSpec.z;
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
        // 원형 연목(서까래) 곡선
        const rCurve = new C_ENGINE.CatmullRomCurve3([
          new C_ENGINE.Vector3(rx * 0.95, eaveBaseY + 0.88 + cornerLift * 0.30, roofZ + zSign * 3.05),
          new C_ENGINE.Vector3(
            rx * 0.985,
            eaveBaseY + 0.36 + cornerLift * 0.68,
            roofZ + zSign * (4.85 + anheori * 0.5)
          ),
          new C_ENGINE.Vector3(
            rx * 1.015,
            eaveBaseY - 0.02 + cornerLift,
            roofZ + zSign * (6.38 + anheori * 0.85)
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
              roofZ + zSign * (6.40 + anheori * 0.85)
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
              roofZ + zSign * (6.86 + anheori)
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
              roofZ + zSign * (7.38 + anheori)
            ],
            rot: [zSign * 0.16, 0, 0],
            castShadow: false
          }
        );
      }
    }

    // 좌·우 측면(xSign = -1 좌측, +1 우측) 팔작 날개 처마 서까래 22열 × 2면
    const sideRafterCount = 22;
    for (let i = 0; i < sideRafterCount; i++) {
      const w = (i / (sideRafterCount - 1)) * 2 - 1;
      const absW = Math.abs(w);
      const rz = roofZ + w * 6.55;
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

    // 4귀 대각선 추녀(Chunyeo) 및 사래(Sarae) 부재
    for (const xSign of [-1, 1]) {
      for (const zSign of [-1, 1]) {
        const startV = new C_ENGINE.Vector3(xSign * 13.8, eaveBaseY + 0.32, roofZ + zSign * 3.1);
        const midV = new C_ENGINE.Vector3(xSign * 16.8, eaveBaseY + 0.48, roofZ + zSign * 5.5);
        const endV = new C_ENGINE.Vector3(xSign * 19.35, eaveBaseY + 0.98, roofZ + zSign * 7.55);
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

  /**
   * 전통 사찰 화강암 돌계단(통돌 계단 디딤석 + 수평 지대석 + 사다리꼴 귀틀 소매돌) 빌더
   * - 기울어진 직육면체 대신 바닥은 수평 지면에 완전히 밀착되고 뒷면은 기단 수직 벽에 빈틈없이 맞물리는
   *   한국 전통 사찰 소매돌(우석·북석·윗어깨단·빗면 모접기) 단면을 ExtrudeGeometry로 조형합니다.
   */
  buildTraditionalStoneStaircase(parent, opts) {
    const m = this.materials;
    const {
      x = 0,
      bottomY = -0.82,
      topY = 0.20,
      startZ = 3.60,
      endZ = 5.58,
      treadWidth = 4.0,
      cheekWidth = 0.34,
      stepCount = 5
    } = opts;

    const rise = Math.max(0.3, topY - bottomY);
    const run = Math.max(0.8, Math.abs(endZ - startZ));
    const dirZ = endZ >= startZ ? 1 : -1;

    const sg = new C_ENGINE.Group();
    sg.position.set(x, bottomY, startZ);
    // local +Z가 항상 계단 하단(0)에서 기단 상단(run)을 향하도록 정렬
    if (dirZ < 0) {
      sg.rotation.y = Math.PI;
    }

    // 1. 계단 하부 자연 접지 그림자 및 수평 화강암 지대석(기초석)
    const cs = new C_ENGINE.Mesh(
      new C_ENGINE.PlaneGeometry(treadWidth + cheekWidth * 2 + 1.1, run + 0.9),
      m.matContactShadow
    );
    cs.rotation.x = -Math.PI / 2;
    cs.position.set(0, 0.015, run * 0.46);
    sg.add(cs);

    const totalOuterW = treadWidth + cheekWidth * 2;
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(totalOuterW + 0.14, 0.10, run + 0.24, 2, 0.025),
      m.matStone,
      sg,
      { pos: [0, 0.035, run * 0.5 - 0.02], tone: 0.88 }
    );
    // 계단 앞 디딤 박석
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(treadWidth * 0.86, 0.055, 0.40, 2, 0.02),
      m.matStone,
      sg,
      { pos: [0, 0.02, -0.24], tone: 0.94 }
    );

    // 2. 속이 꽉 찬 통돌 화강암 계단석 (아랫면 빈 구멍 없이 바닥 지대석부터 기단 안쪽까지 일체 결구)
    const stepDepth = run / stepCount;
    for (let s = 0; s < stepCount; s++) {
      const stepTopY = ((s + 1) / (stepCount + 0.18)) * rise;
      const frontZ = s * stepDepth;
      const solidDepth = run + 0.10 - frontZ;
      const solidH = Math.max(0.10, stepTopY - 0.04);

      // 하부 통돌 몸체 (챌면 및 측면 하부 빈틈 완전 차단)
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(treadWidth + 0.02, solidH, solidDepth, 2, 0.02),
        m.matStone,
        sg,
        {
          pos: [0, 0.04 + solidH * 0.5, frontZ + solidDepth * 0.5],
          tone: 0.91 + (s % 2) * 0.025
        }
      );

      // 상단 장대석 디딤판 (살짝 내민 물끊기 코 몰딩)
      const capDepth = Math.min(solidDepth + 0.03, stepDepth + 0.12);
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(treadWidth + 0.03, 0.072, capDepth, 2, 0.022),
        m.matStone,
        sg,
        {
          pos: [0, stepTopY - 0.028, frontZ - 0.02 + capDepth * 0.5],
          tone: 0.96 + (s % 3) * 0.02
        }
      );
    }

    // 3. 좌·우 전통 삼각·사다리꼴 귀틀 소매돌 (수평 바닥 + 수직 뒷면 + 윗어깨단 + 완만한 빗면 + 앞코 북석)
    const shoulderLen = Math.min(0.32, run * 0.17);
    const topCrestY = rise + 0.095;
    const noseTopY = Math.max(0.21, rise * 0.23);

    const cheekShape = new C_ENGINE.Shape();
    cheekShape.moveTo(-0.06, 0.02); // 앞쪽 바닥 모서리 (수평 지대석 밀착)
    cheekShape.lineTo(run + 0.10, 0.02); // 기단 안쪽 바닥 모서리 (수평)
    cheekShape.lineTo(run + 0.10, topCrestY); // 기단 맞물림 수직 뒷면
    cheekShape.lineTo(run - shoulderLen, topCrestY); // 기단 갑석에서 이어지는 수평 윗어깨단
    // 부드러운 곡선으로 꺾여 내려오는 전통 화강암 소매돌 빗면
    cheekShape.quadraticCurveTo(
      run - shoulderLen - 0.12,
      topCrestY - 0.01,
      run * 0.45,
      noseTopY + (topCrestY - noseTopY) * 0.46
    );
    cheekShape.quadraticCurveTo(0.22, noseTopY + 0.03, 0.04, noseTopY);
    // 앞코(북석) 둥근 이마와 수직 앞면
    cheekShape.quadraticCurveTo(-0.06, noseTopY - 0.005, -0.06, noseTopY - 0.07);
    cheekShape.lineTo(-0.06, 0.02);

    const extrudeDepth = Math.max(0.16, cheekWidth - 0.044);
    const baseCheekGeo = new C_ENGINE.ExtrudeGeometry(cheekShape, {
      depth: extrudeDepth,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.020,
      bevelSegments: 3,
      curveSegments: 10
    });
    // X축 두께 중심 정렬 후 +X(shape) -> +Z(local), +Y(shape) -> +Y(local) 회전
    baseCheekGeo.translate(0, 0, -extrudeDepth * 0.5);
    baseCheekGeo.rotateY(-Math.PI * 0.5);
    baseCheekGeo.computeVertexNormals();

    // 소매돌 하단 고임 귀틀석 및 본체 좌·우 대칭 배치
    const cheekCenterX = treadWidth * 0.5 + cheekWidth * 0.5 - 0.01;
    for (const sideSign of [-1, 1]) {
      const cx = sideSign * cheekCenterX;
      m.createMesh(baseCheekGeo.clone(), m.matStone, sg, {
        pos: [cx, 0, 0],
        tone: 0.92 + (sideSign > 0 ? 0.015 : 0)
      });

      // 소매돌 바깥쪽 하단 자연 풍화 지대 받침돌 디테일
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(cheekWidth + 0.05, 0.12, run + 0.22, 2, 0.025),
        m.matStone,
        sg,
        { pos: [cx, 0.055, run * 0.5 + 0.01], tone: 0.85 }
      );
    }

    parent.add(sg);
  }

  buildBuseoksaStoneLantern(parent, x, y, z) {
    const m = this.materials;
    const lg = new C_ENGINE.Group();
    lg.position.set(x, y, z);

    const cs = new C_ENGINE.Mesh(new C_ENGINE.PlaneGeometry(2.6, 2.6), m.matContactShadow);
    cs.rotation.x = -Math.PI / 2;
    cs.position.y = 0.02;
    lg.add(cs);

    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(1.48, 0.22, 1.48, 2, 0.04),
      m.matStone,
      lg,
      { pos: [0, 0.11, 0] }
    );
    m.createMesh(
      new C_ENGINE.CylinderGeometry(0.56, 0.68, 0.34, 8),
      m.matStone,
      lg,
      { pos: [0, 0.38, 0] }
    );
    m.createMesh(
      new C_ENGINE.CylinderGeometry(0.22, 0.24, 1.08, 8),
      m.matStone,
      lg,
      { pos: [0, 1.06, 0] }
    );
    m.createMesh(
      new C_ENGINE.CylinderGeometry(0.58, 0.38, 0.24, 8),
      m.matStone,
      lg,
      { pos: [0, 1.7, 0] }
    );

    const chamberCore = new C_ENGINE.Mesh(
      new C_ENGINE.CylinderGeometry(0.34, 0.34, 0.62, 8),
      m.matWarmHanji
    );
    chamberCore.position.set(0, 2.12, 0);
    lg.add(chamberCore);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.09, 0.66, 0.09, 2, 0.015),
        m.matStone,
        lg,
        { pos: [Math.cos(a) * 0.39, 2.12, Math.sin(a) * 0.39], rot: [0, -a, 0] }
      );
    }

    const roofPts = [
      new C_ENGINE.Vector2(0.0, 0.52),
      new C_ENGINE.Vector2(0.14, 0.44),
      new C_ENGINE.Vector2(0.11, 0.32),
      new C_ENGINE.Vector2(0.32, 0.24),
      new C_ENGINE.Vector2(0.78, 0.06),
      new C_ENGINE.Vector2(0.84, 0.0),
      new C_ENGINE.Vector2(0.0, 0.0)
    ];
    m.createMesh(new C_ENGINE.LatheGeometry(roofPts, 8), m.matStone, lg, {
      pos: [0, 2.42, 0],
      tone: 0.92
    });

    // 아침·낮 산사 기준 석등 점광원 강도 (1.6)
    this.stoneLanternLight = new C_ENGINE.PointLight(0xffaa44, 1.6, 14, 1.6);
    this.stoneLanternLight.position.set(0, 2.15, 0);
    lg.add(this.stoneLanternLight);

    const groundGlowMat = new C_ENGINE.MeshBasicMaterial({
      map: m.glowTex,
      color: 0xffb35c,
      transparent: true,
      opacity: 0.38,
      blending: C_ENGINE.AdditiveBlending,
      depthWrite: false
    });
    const groundGlow = new C_ENGINE.Mesh(new C_ENGINE.PlaneGeometry(4.2, 4.2), groundGlowMat);
    groundGlow.rotation.x = -Math.PI / 2;
    groundGlow.position.y = 0.03;
    lg.add(groundGlow);

    parent.add(lg);
  }

  buildPavilion3D(parent, spec) {
    const m = this.materials;
    const pg = new C_ENGINE.Group();
    pg.position.set(spec.x, spec.y, spec.z);
    pg.rotation.y = spec.yaw || 0;

    // 1. 화강암 기단 및 중앙 돌계단 (통돌 디딤석 + 삼각 귀틀 소매돌 일체형)
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(34.4, 0.84, 8.6, 2, 0.06),
      m.matStone,
      pg,
      { pos: [0, 0.36, 0], tone: 0.94 }
    );

    this.buildTraditionalStoneStaircase(pg, {
      x: 0,
      bottomY: -0.05,
      topY: 0.80,
      startZ: 5.76,
      endZ: 4.24,
      treadWidth: 4.38,
      cheekWidth: 0.34,
      stepCount: 5
    });

    // 2. 안양루 우물마루 바닥 (world y = 0.08)
    const deckY = spec.deckLocalY;
    const plankCountX = 72;
    const deckW = 32.8;
    const plankW = deckW / plankCountX - 0.01;
    for (let row = 0; row < 2; row++) {
      const rowZ = -1.95 + row * 3.9;
      for (let i = 0; i < plankCountX; i++) {
        const px = -deckW * 0.5 + (i + 0.5) * (deckW / plankCountX);
        const tone = 0.95 + ((i * 5 + row * 11) % 7) * 0.014;
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(plankW, 0.12, 3.82, 2, 0.01),
          m.matFloorWood,
          pg,
          { pos: [px, deckY, rowZ], tone }
        );
      }
    }
    for (const zBeam of [-3.95, 0, 3.95]) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(33.2, 0.16, 0.24, 2, 0.02),
        m.matDarkTimber,
        pg,
        { pos: [0, deckY + 0.01, zBeam], tone: 0.9 }
      );
    }

    // 계자난간
    for (const sideX of [-16.1, 16.1]) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.14, 0.1, 8.0, 2, 0.015),
        m.matDancheongRed,
        pg,
        { pos: [sideX, deckY + 0.48, 0] }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.1, 0.08, 7.9, 2, 0.015),
        m.matDancheongJade,
        pg,
        { pos: [sideX, deckY + 0.26, 0] }
      );
    }
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(32.4, 0.1, 0.14, 2, 0.015),
      m.matDancheongRed,
      pg,
      { pos: [0, deckY + 0.42, -3.98] }
    );
    for (const frontSegX of [-9.35, 9.35]) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(13.5, 0.1, 0.14, 2, 0.015),
        m.matDancheongRed,
        pg,
        { pos: [frontSegX, deckY + 0.48, 3.98] }
      );
    }

    // 3. 누각 배흘림기둥 16주 및 공포
    const pXs = spec.columnXs;
    const pZs = spec.columnLocalZs;
    const colEntasisPts = [
      new C_ENGINE.Vector2(0.30, 0.0),
      new C_ENGINE.Vector2(0.34, 1.2),
      new C_ENGINE.Vector2(0.35, 2.4),
      new C_ENGINE.Vector2(0.31, 4.1),
      new C_ENGINE.Vector2(0.28, 4.95)
    ];
    for (const px of pXs) {
      for (const pz of pZs) {
        m.createMesh(
          new C_ENGINE.CylinderGeometry(0.31, 0.34, 2.6, 18),
          m.matTimber,
          pg,
          { pos: [px, -0.45, pz], tone: 0.94 }
        );
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.84, 0.16, 0.84, 2, 0.04),
          m.matStone,
          pg,
          { pos: [px, deckY + 0.08, pz] }
        );
        m.createMesh(
          new C_ENGINE.LatheGeometry(colEntasisPts, 22),
          m.matTimber,
          pg,
          { pos: [px, deckY + 0.14, pz], tone: 0.98 }
        );
        for (let tier = 0; tier < 3; tier++) {
          const ty = deckY + 5.15 + tier * 0.22;
          const span = 1.15 + tier * 0.34;
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(span, 0.15, 0.3, 2, 0.02),
            tier === 1 ? m.matDancheongJade : m.matDarkTimber,
            pg,
            { pos: [px, ty, pz] }
          );
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(0.3, 0.15, span, 2, 0.02),
            tier === 1 ? m.matDancheongRed : m.matPaleTimber,
            pg,
            { pos: [px, ty + 0.03, pz] }
          );
        }
      }
    }

    for (const bz of pZs) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(31.6, 0.32, 0.38, 2, 0.03),
        m.matTimber,
        pg,
        { pos: [0, deckY + 4.95, bz] }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(32.0, 0.22, 0.44, 2, 0.025),
        m.matDancheongJade,
        pg,
        { pos: [0, deckY + 5.22, bz] }
      );
    }
    for (const bx of pXs) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.36, 0.3, 7.4, 2, 0.03),
        m.matDarkTimber,
        pg,
        { pos: [bx, deckY + 5.18, 0] }
      );
    }

    // 4. 차경루 우횡서 현판 (借景樓)
    const plaqueTex = TextureFactory.createPlaqueTexture(spec.hanja, { rtl: true });
    const pavPlaqueGroup = new C_ENGINE.Group();
    pavPlaqueGroup.name = 'ChagyeongruPlaqueGroup';
    pavPlaqueGroup.position.set(0, deckY + 4.30, 3.52);
    pavPlaqueGroup.rotation.x = 0.08;

    const anyangFrameMat = new C_ENGINE.MeshStandardMaterial({
      color: 0x3b2618,
      roughness: 0.82,
      metalness: 0.05
    });
    const pavBackMesh = new C_ENGINE.Mesh(
      new C_ENGINE.RoundedBoxGeometry(3.88, 1.36, 0.15, 2, 0.03),
      anyangFrameMat
    );
    pavBackMesh.castShadow = true;
    pavPlaqueGroup.add(pavBackMesh);

    const pavRimThick = 0.085;
    for (const ry of [-0.635, 0.635]) {
      const bar = new C_ENGINE.Mesh(
        new C_ENGINE.BoxGeometry(3.88, pavRimThick, 0.042),
        anyangFrameMat
      );
      bar.position.set(0, ry, 0.088);
      pavPlaqueGroup.add(bar);
    }
    for (const rx of [-1.895, 1.895]) {
      const bar = new C_ENGINE.Mesh(
        new C_ENGINE.BoxGeometry(pavRimThick, 1.19, 0.042),
        anyangFrameMat
      );
      bar.position.set(rx, 0, 0.088);
      pavPlaqueGroup.add(bar);
    }

    const plaqueMesh = new C_ENGINE.Mesh(
      new C_ENGINE.PlaneGeometry(3.70, 1.19),
      new C_ENGINE.MeshStandardMaterial({
        map: plaqueTex,
        roughness: 0.58,
        metalness: 0.10,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      })
    );
    plaqueMesh.position.set(0, 0, 0.082);
    pavPlaqueGroup.add(plaqueMesh);
    pg.add(pavPlaqueGroup);

    // 5. 다포계 주간포, 겹처마 서까래·부연 및 팔작지붕
    for (const icx of spec.interColumnXs) {
      for (const pz of pZs) {
        for (let tier = 0; tier < 3; tier++) {
          const ty = deckY + 5.18 + tier * 0.20;
          const span = 0.92 + tier * 0.28;
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(span, 0.14, 0.28, 2, 0.02),
            tier === 1 ? m.matDancheongJade : m.matDarkTimber,
            pg,
            { pos: [icx, ty, pz] }
          );
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(0.28, 0.14, span, 2, 0.02),
            tier === 1 ? m.matDancheongRed : m.matPaleTimber,
            pg,
            { pos: [icx, ty + 0.03, pz] }
          );
        }
      }
    }

    const anyangWhiteCapMat = new C_ENGINE.MeshStandardMaterial({
      color: 0x4e5459,
      roughness: 0.84
    });
    const anyangRafterCount = 58;
    for (let i = 0; i < anyangRafterCount; i++) {
      const t = i / (anyangRafterCount - 1) - 0.5;
      const absU = Math.abs(t) * 2;
      const rx = t * 36.8;
      const cornerLift = Math.pow(absU, 2.6) * 1.15;
      const anheori = Math.pow(absU, 2.2) * 0.36;

      for (const zSign of [-1, 1]) {
        const rCurve = new C_ENGINE.CatmullRomCurve3([
          new C_ENGINE.Vector3(rx * 0.96, deckY + 6.32 + cornerLift * 0.28, zSign * 2.5),
          new C_ENGINE.Vector3(
            rx * 0.99,
            deckY + 5.75 + cornerLift * 0.65,
            zSign * (4.1 + anheori * 0.5)
          ),
          new C_ENGINE.Vector3(rx * 1.02, deckY + 5.34 + cornerLift, zSign * (5.65 + anheori))
        ]);
        m.createMesh(
          new C_ENGINE.TubeGeometry(rCurve, 8, 0.078, 8, false),
          m.matTimber,
          pg,
          { tone: 0.95 }
        );

        m.createMesh(
          new C_ENGINE.CylinderGeometry(0.076, 0.076, 0.04, 10),
          anyangWhiteCapMat,
          pg,
          {
            pos: [rx * 1.022, deckY + 5.33 + cornerLift, zSign * (5.69 + anheori)],
            rot: [Math.PI * 0.5 - zSign * 0.26, 0, 0],
            castShadow: false
          }
        );
      }
    }

    buildRealisticPaljakRoof(pg, spec.roof, m);

    // 6. 안양루 14개 전통 비단 명상 방석 (ANYANGRU_CONFIG.cushionLocalCoords 단일 원본 공유)
    spec.cushionLocalCoords.forEach(([cx, cz], idx) => {
      const cushionGroup = new C_ENGINE.Group();
      cushionGroup.position.set(cx, deckY + 0.06, cz);

      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(1.16, 0.03, 1.16, 2, 0.01),
        m.matPaleTimber,
        cushionGroup,
        { pos: [0, 0.015, 0], tone: 1.04 + (idx % 3) * 0.02 }
      );
      m.createMesh(
        new C_ENGINE.CylinderGeometry(0.44, 0.48, 0.13, 28),
        idx % 2 === 0 ? m.matDancheongRed : m.matDancheongJade,
        cushionGroup,
        { pos: [0, 0.075, 0], tone: 1.04 }
      );
      m.createMesh(
        new C_ENGINE.CylinderGeometry(0.28, 0.30, 0.14, 24),
        m.matWarmHanji,
        cushionGroup,
        { pos: [0, 0.082, 0] }
      );
      pg.add(cushionGroup);
    });

    const anyangLight = new C_ENGINE.PointLight(0xffb86c, 1.8, 18, 1.5);
    anyangLight.position.set(0, deckY + 4.6, 0);
    pg.add(anyangLight);

    parent.add(pg);
  }

  buildSeasonalTree(_parent, x, y, z, scale = 1.0) {
    this.buseoksaPineAnchors.push({
      x,
      y,
      z,
      height: 6.6 * scale,
      widthScale: 1.28,
      yaw: (x * 1.37 + z * 0.93) % (Math.PI * 2),
      cluster: true,
      role: 'maple'
    });
  }

  buildGreenForestTree(_parent, x, y, z, scale = 1.0) {
    this.buseoksaPineAnchors.push({
      x,
      y,
      z,
      height: 6.8 * scale,
      widthScale: 1.28,
      yaw: (x * 0.89 - z * 1.41) % (Math.PI * 2),
      cluster: true,
      role: 'pine'
    });
  }

  buildSobaeksanMountainRidges(parent) {
    const vistaSegX = 96;
    const vistaSegY = 32;
    const vistaGeo = new C_ENGINE.PlaneGeometry(1, 1, vistaSegX, vistaSegY);
    const vPos = vistaGeo.getAttribute('position');
    const arcSpan = Math.PI * 0.62;
    const radius = 142;
    const centerZ = -4.0;

    for (let i = 0; i < vPos.count; i++) {
      const u = vPos.getX(i) + 0.5;
      const v = vPos.getY(i) + 0.5;
      const angle = (u - 0.5) * arcSpan;
      const wx = Math.sin(angle) * radius;
      const wz = centerZ - Math.cos(angle) * radius;
      const wy = -18.0 + v * 74.0;
      vPos.setXYZ(i, wx, wy, wz);
    }
    vistaGeo.computeVertexNormals();

    this.sobaeksanVistaMat = new C_ENGINE.MeshBasicMaterial({
      map: this.materials.sobaeksanVistaTex,
      color: 0xffffff,
      side: C_ENGINE.DoubleSide,
      transparent: true,
      fog: false,
      depthWrite: false
    });
    this.sobaeksanVistaMesh = new C_ENGINE.Mesh(vistaGeo, this.sobaeksanVistaMat);
    this.sobaeksanVistaMesh.renderOrder = -10;
    parent.add(this.sobaeksanVistaMesh);
  }

  buildSeaOfClouds(parent) {
    this.cloudPlanes = [];
    const cloudGeo = new C_ENGINE.PlaneGeometry(38, 13);
    for (let i = 0; i < 24; i++) {
      const isHighCumulus = i < 10;
      const baseAlpha = isHighCumulus
        ? 0.22 + Math.random() * 0.14
        : 0.10 + Math.random() * 0.08;
      const mat = new C_ENGINE.MeshBasicMaterial({
        map: this.materials.cloudTex,
        color: 0xf4f8fa,
        transparent: true,
        opacity: baseAlpha,
        depthWrite: false,
        fog: false
      });
      const mesh = new C_ENGINE.Mesh(cloudGeo, mat);
      const x = (Math.random() - 0.5) * 155;
      const y = isHighCumulus ? 24.0 + Math.random() * 14.0 : -5.8 + Math.random() * 2.4;
      const z = isHighCumulus ? -115 - Math.random() * 32 : -26 - Math.random() * 55;
      mesh.position.set(x, y, z);
      mesh.scale.set(
        (isHighCumulus ? 1.35 : 0.85) + Math.random() * 0.9,
        (isHighCumulus ? 0.85 : 0.45) + Math.random() * 0.4,
        1
      );
      parent.add(mesh);
      this.cloudPlanes.push({
        mesh,
        mat,
        baseX: x,
        baseY: y,
        speed: (isHighCumulus ? 0.22 : 0.38) + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        baseAlpha
      });
    }
  }

  loadAndPopulatePines() {
    if (!C_ENGINE.GLTFLoader || !C_ENGINE.MeshoptDecoder) return;

    const loader = new C_ENGINE.GLTFLoader().setMeshoptDecoder(C_ENGINE.MeshoptDecoder);
    loader
      .loadAsync('assets/models/pine.glb')
      .then((gltf) => {
        this.populateScannedPines(gltf);
      })
      .catch((err) => console.warn('Pine GLB fallback:', err));
  }

  populateScannedPines(gltf) {
    const candidates = gltf.scene.children.filter((c) => c.name.startsWith('pine_sapling_small'));
    const rawTemplates = candidates.length > 0 ? candidates : [gltf.scene];
    const isMobile = this.sceneManager.isMobile;

    let baseTwigMat = null;
    let baseBarkMat = null;

    const normalizedTemplates = rawTemplates.map((tpl) => {
      const clone = tpl.clone(true);
      clone.position.set(0, 0, 0);
      clone.rotation.set(0, 0, 0);
      clone.scale.set(1, 1, 1);

      const holder = new C_ENGINE.Group();
      holder.add(clone);
      holder.updateMatrixWorld(true);

      const box = new C_ENGINE.Box3().setFromObject(holder);
      const center = box.getCenter(new C_ENGINE.Vector3());
      const rawHeight = Math.max(0.5, box.max.y - box.min.y);

      clone.position.set(-center.x, -box.min.y, -center.z);
      holder.updateMatrixWorld(true);

      clone.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = !isMobile;
          child.receiveShadow = !isMobile;
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            if (!m) return;
            if (m.name && m.name.includes('twig')) {
              m.alphaTest = 0.42;
              m.side = C_ENGINE.DoubleSide;
              m.roughness = 0.88;
              m.envMapIntensity = 0.32;
              this.materials.attachWindSwayShader(m, 0.008);
              if (!baseTwigMat) baseTwigMat = m;
            } else if (m.name && m.name.includes('bark')) {
              m.roughness = 0.92;
              m.envMapIntensity = 0.25;
              if (!baseBarkMat) baseBarkMat = m;
            }
          });
        }
      });

      return { node: holder, rawHeight };
    });

    const pineTintPalette = [0xffffff, 0xe8f4e0, 0xd6ebd0, 0xc8e2c2];
    const pineTwigMats = pineTintPalette.map((hex) => {
      if (!baseTwigMat) return null;
      const m = baseTwigMat.clone();
      m.color.setHex(hex);
      this.materials.attachWindSwayShader(m, 0.008);
      return m;
    });

    this.scannedSeasonalTwigMats = [0xffffff, 0xffffff, 0xffffff, 0xffffff].map((hex, vIdx) => {
      if (!baseTwigMat) return null;
      const m = baseTwigMat.clone();
      m.color.setHex(hex);
      this.materials.attachMapleFoliageShader(m, 0.009, vIdx);
      return m;
    });

    const applyTwigMaterial = (rootObj, twigMat) => {
      if (!twigMat) return;
      rootObj.traverse((child) => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((m) =>
              m && m.name && m.name.includes('twig') ? twigMat : m
            );
          } else if (child.material.name && child.material.name.includes('twig')) {
            child.material = twigMat;
          }
        }
      });
    };

    const placePineAt = (spec, idx, targetGroup) => {
      const treeGroup = new C_ENGINE.Group();
      const mainTpl = normalizedTemplates[idx % normalizedTemplates.length];
      const mainScale = spec.height / mainTpl.rawHeight;

      const isMaple = spec.role === 'maple' || spec.role === 'seasonal';
      const chooseTwigMat = (subIdx) => {
        if (isMaple && this.scannedSeasonalTwigMats.length > 0) {
          return this.scannedSeasonalTwigMats[(idx + subIdx) % this.scannedSeasonalTwigMats.length];
        }
        return pineTwigMats[(idx + subIdx) % pineTwigMats.length];
      };

      const primary = mainTpl.node.clone(true);
      const defaultWidth = isMaple ? 1.28 : 1.12;
      const widthBoost = (spec.widthScale || defaultWidth) * (isMobile ? 1.16 : 1.0);
      primary.scale.set(mainScale * widthBoost, mainScale, mainScale * widthBoost);
      applyTwigMaterial(primary, chooseTwigMat(0));
      treeGroup.add(primary);

      if (spec.cluster !== false && !isMobile) {
        const subSpecs = [
          { dx: -0.22, dz: -0.12, hMul: 0.86, wMul: 1.15, yaw: 1.15, tiltX: 0.04, tiltZ: -0.05 },
          { dx: 0.24, dz: -0.15, hMul: 0.91, wMul: 1.12, yaw: 2.55, tiltX: -0.03, tiltZ: 0.04 }
        ];
        subSpecs.forEach((sub, sIdx) => {
          const subTpl = normalizedTemplates[(idx + sIdx + 1) % normalizedTemplates.length];
          const subScale = (spec.height * sub.hMul) / subTpl.rawHeight;
          const subNode = subTpl.node.clone(true);
          subNode.scale.set(subScale * sub.wMul, subScale, subScale * sub.wMul);
          subNode.rotation.set(sub.tiltX, sub.yaw, sub.tiltZ);
          subNode.position.set(sub.dx * (spec.height * 0.12), 0, sub.dz * (spec.height * 0.12));
          applyTwigMaterial(subNode, chooseTwigMat(sIdx + 1));
          treeGroup.add(subNode);
        });
      }

      treeGroup.rotation.y = spec.yaw ?? idx * 1.7;
      treeGroup.position.set(spec.x, spec.y, spec.z);
      targetGroup.add(treeGroup);
    };

    this.buseoksaPineAnchors.forEach((spec, idx) =>
      placePineAt(spec, idx, this.buseoksaGroup)
    );
  }

  updateClouds(elapsed) {
    for (const c of this.cloudPlanes) {
      c.mesh.position.x = c.baseX + Math.sin(elapsed * 0.08 * c.speed + c.phase) * 14;
      c.mesh.position.y = c.baseY + Math.cos(elapsed * 0.22 + c.phase) * 0.35;
    }
  }
}
