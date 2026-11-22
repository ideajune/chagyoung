/**
 * WishGardenBuilder — 서쪽 소원 연등 정원(所願 蓮燈 庭園), 배흘림기둥·공포 소원정(所願亭), 현수선 연등 회랑, 돌확 수반 및 반딧불이 입자 빌더
 * - worldConfig.js의 WISH_GARDEN_CONFIG 단일 원본을 공유합니다.
 * - 색상별 연등 재질/지오메트리 공유, 반딧불이 InstancedMesh(1 Draw Call) 및 isMobile 자동 경량화를 적용합니다.
 */

import { LANTERN_COLORS, INITIAL_WISHES } from '../config/constants.js';
import { WISH_GARDEN_CONFIG } from '../config/worldConfig.js';
import { buildRealisticPaljakRoof } from './PaljakRoofBuilder.js';
import { TextureFactory } from './TextureFactory.js';

import { SANSA_CORE as C_ENGINE } from '../engine/CoreRuntime.js';

export class WishGardenBuilder {
  constructor(materials, isMobile = false) {
    this.materials = materials;
    this.isMobile = Boolean(isMobile);
    this.swayingLanterns = [];
    this.interactiveEntries = [];
    this.fireflyInst = null;
    this.fireflyData = [];
    this.fireflyDummy = new C_ENGINE.Object3D();
    this._lanternBodyMats = {};
  }

  build(parent) {
    const group = new C_ENGINE.Group();
    group.name = 'WestWishLanternGarden';

    this.buildGardenPathsAndPlaza(group);
    this.buildSowonPavilion(group);
    this.buildLanternPergolaArches(group);
    this.buildCatenaryLanternGarlands(group);
    this.buildGardenStoneLanternsAndBenches(group);
    this.buildLotusStoneBasin(group);
    this.buildFireflyParticlesInstanced(group);

    parent.add(group);
    return group;
  }

  createEntasisColumnGeo(height = 3.05) {
    if (!this._entasisColGeo) {
      const pts = [];
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const y = t * height;
        // 한국 전통 배흘림 비율: 하단 1/3 지점이 가장 풍만하고 상단으로 갈수록 우아하게 가늘어짐
        const belly = Math.sin(Math.pow(t, 0.72) * Math.PI) * 0.038;
        const taper = 0.215 - t * 0.032;
        pts.push(new C_ENGINE.Vector2(taper + belly, y));
      }
      this._entasisColGeo = new C_ENGINE.LatheGeometry(pts, this.isMobile ? 12 : 18);
    }
    return this._entasisColGeo;
  }

  createPlinthTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#aba69a';
    ctx.fillRect(0, 0, 256, 256);

    const cells = 4;
    const step = 256 / cells;
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        const shade = 166 + ((r * 7 + c * 13) % 5) * 4;
        ctx.fillStyle = `rgb(${shade}, ${shade - 4}, ${shade - 12})`;
        ctx.fillRect(c * step + 2, r * step + 2, step - 4, step - 4);
      }
    }
    ctx.strokeStyle = 'rgba(72, 68, 60, 0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= cells; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(256, i * step);
      ctx.stroke();
    }
    const tex = new C_ENGINE.CanvasTexture(canvas);
    tex.colorSpace = C_ENGINE.SRGBColorSpace;
    tex.wrapS = C_ENGINE.RepeatWrapping;
    tex.wrapT = C_ENGINE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  }

  buildGardenPathsAndPlaza(group) {
    const m = this.materials;
    const { cx, cz } = WISH_GARDEN_CONFIG;

    // 1. 중앙 마당(x=-16.6) -> 서쪽 정원 입구(x=-21.8) 연결 박석길
    for (let i = 0; i < 8; i++) {
      const px = -16.6 - i * 0.72;
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.64, 0.075, 2.25 + (i % 2) * 0.18, 2, 0.02),
        m.matStone,
        group,
        { pos: [px, -0.795, cz], tone: 0.92 + (i % 3) * 0.03 }
      );
    }

    // 2. 사방 십자 박석 산책로
    for (let i = -5; i <= 5; i++) {
      if (Math.abs(i) <= 2) continue;
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(1.18, 0.07, 1.48, 2, 0.02),
        m.matStone,
        group,
        { pos: [cx + i * 1.45, -0.795, cz], tone: 0.93 }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(1.48, 0.07, 1.18, 2, 0.02),
        m.matStone,
        group,
        { pos: [cx, -0.795, cz + i * 1.45], tone: 0.93 }
      );
    }

    // 3. 대각선 둘레 둥근 징검돌 12개
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + Math.PI / 12;
      const px = cx + Math.cos(ang) * 7.6;
      const pz = cz + Math.sin(ang) * 7.6;
      m.createMesh(
        new C_ENGINE.CylinderGeometry(0.58, 0.64, 0.075, 12),
        m.matStone,
        group,
        { pos: [px, -0.795, pz], tone: 0.9 + (i % 4) * 0.03 }
      );
    }
  }

  buildSowonPavilion(group) {
    const m = this.materials;
    const wg = WISH_GARDEN_CONFIG;
    const pg = new C_ENGINE.Group();
    pg.position.set(wg.cx, 0, wg.cz);

    // 1. 화강암 장대석 기단 + 전돌 상면 (7.2m x 7.2m, 상면 y = -0.52)
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(wg.plinthHalfW * 2, 0.32, wg.plinthHalfD * 2, 2, 0.04),
      m.matStone,
      pg,
      { pos: [0, -0.7, 0], tone: 0.95 }
    );
    const tileMat = new C_ENGINE.MeshStandardMaterial({
      map: this.createPlinthTileTexture(),
      roughness: 0.88,
      metalness: 0.02
    });
    const tileTop = new C_ENGINE.Mesh(
      new C_ENGINE.PlaneGeometry(wg.plinthHalfW * 1.92, wg.plinthHalfD * 1.92),
      tileMat
    );
    tileTop.rotation.x = -Math.PI / 2;
    tileTop.position.y = wg.plinthY + 0.005;
    tileTop.receiveShadow = true;
    pg.add(tileTop);

    // 사방 2단 돌계단 디딤석
    const stepOffsets = [
      { pos: [wg.plinthHalfW + 0.36, -0.72, 0], size: [0.72, 0.18, 2.55] },
      { pos: [-wg.plinthHalfW - 0.36, -0.72, 0], size: [0.72, 0.18, 2.55] },
      { pos: [0, -0.72, wg.plinthHalfD + 0.36], size: [2.55, 0.18, 0.72] },
      { pos: [0, -0.72, -wg.plinthHalfD - 0.36], size: [2.55, 0.18, 0.72] }
    ];
    for (const st of stepOffsets) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(st.size[0], st.size[1], st.size[2], 2, 0.025),
        m.matStone,
        pg,
        { pos: st.pos, tone: 0.92 }
      );
    }

    // 2. 주춧돌 · 배흘림기둥 8주 · 기둥 머리 주두/공포(포작)
    const colBottom = wg.plinthY;
    const colH = 3.05;
    const colTop = colBottom + colH;
    const colGeo = this.createEntasisColumnGeo(colH);

    for (const [lx, lz] of wg.pavilionColumns) {
      m.createMesh(
        new C_ENGINE.CylinderGeometry(0.29, 0.36, 0.16, 12),
        m.matStone,
        pg,
        { pos: [lx, colBottom + 0.07, lz], tone: 0.9 }
      );
      const colMesh = new C_ENGINE.Mesh(colGeo, m.matTimber);
      colMesh.position.set(lx, colBottom + 0.12, lz);
      colMesh.castShadow = true;
      colMesh.receiveShadow = true;
      pg.add(colMesh);

      // 주두(기둥 머리 받침) + 첨차 공포(단청 옥빛·주홍)
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.48, 0.14, 0.48, 2, 0.015),
        m.matDancheongJade,
        pg,
        { pos: [lx, colTop + 0.08, lz] }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.76, 0.11, 0.24, 2, 0.012),
        m.matDancheongRed,
        pg,
        { pos: [lx, colTop + 0.19, lz] }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.24, 0.11, 0.76, 2, 0.012),
        m.matDancheongRed,
        pg,
        { pos: [lx, colTop + 0.19, lz] }
      );
    }

    // 3. 상부 창방·도리 및 단청 보
    for (const zSide of [-3.1, 3.1]) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(6.9, 0.24, 0.24, 2, 0.02),
        m.matDancheongRed,
        pg,
        { pos: [0, colTop, zSide] }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(7.35, 0.18, 0.22, 2, 0.02),
        m.matDancheongJade,
        pg,
        { pos: [0, colTop + 0.25, zSide] }
      );
    }
    for (const xSide of [-3.1, 3.1]) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.24, 0.24, 6.9, 2, 0.02),
        m.matDancheongRed,
        pg,
        { pos: [xSide, colTop, 0] }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.22, 0.18, 7.35, 2, 0.02),
        m.matDancheongJade,
        pg,
        { pos: [xSide, colTop + 0.25, 0] }
      );
    }

    // 4. 내부 소원 연등 시렁 (천장 우물격자 목조 프레임)
    for (const offset of [-1.7, 0, 1.7]) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(6.0, 0.1, 0.1, 2, 0.01),
        m.matDarkTimber,
        pg,
        { pos: [0, colTop - 0.14, offset] }
      );
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.1, 0.1, 6.0, 2, 0.01),
        m.matDarkTimber,
        pg,
        { pos: [offset, colTop - 0.14, 0] }
      );
    }

    // 5. 조화로운 팔작지붕 (청풍사·차경루보다 아담한 규모로 위계 조화)
    buildRealisticPaljakRoof(
      pg,
      {
        style: 'anyangru',
        x: 0,
        z: 0,
        baseY: colTop + 0.38,
        width: 9.8,
        depth: 8.6,
        ridgeHeight: 2.25,
        ridgeLength: 5.4,
        tileRepeatX: 5,
        tileRepeatZ: 4,
        ridgeCurveLift: 0.16,
        cornerLiftRatio: 0.24,
        gableSplit: 0.44
      },
      m
    );

    // 6. 소원정(所 願 亭) 현판 (동측 정면 입구 방향)
    const plaqueTex = this.createPlaqueTexture('所 願 亭');
    const plaqueMat = new C_ENGINE.MeshStandardMaterial({
      map: plaqueTex,
      roughness: 0.55,
      metalness: 0.06
    });
    const plaqueMesh = new C_ENGINE.Mesh(
      new C_ENGINE.RoundedBoxGeometry(0.1, 0.52, 1.8, 2, 0.02),
      plaqueMat
    );
    plaqueMesh.position.set(3.26, colTop + 0.04, 0);
    pg.add(plaqueMesh);

    // 7. 소원정 내부 따뜻한 분위기는 연등 자체 발광(emissive) 및 반딧불이로 표현 (PointLight 절감)

    // 8. 소원정 내부·처마 소원 연등 12기 매달기
    const colorKeys = Object.keys(LANTERN_COLORS);
    const pavilionLanternCoords = [
      [-1.7, -1.7], [0, -1.7], [1.7, -1.7],
      [-1.7, 0],               [1.7, 0],
      [-1.7, 1.7],  [0, 1.7],  [1.7, 1.7],
      [-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]
    ];
    pavilionLanternCoords.forEach(([lx, lz], idx) => {
      const colorKey = colorKeys[idx % colorKeys.length];
      const wish = INITIAL_WISHES[idx % INITIAL_WISHES.length];
      this.spawnGardenLantern(pg, {
        x: lx,
        y: colTop - 0.16,
        z: lz,
        worldBaseX: wg.cx + lx,
        worldBaseZ: wg.cz + lz,
        cordLen: 0.42 + (idx % 3) * 0.14,
        colorKey,
        wish,
        phase: idx * 0.95,
        scale: idx >= 8 ? 1.12 : 0.96
      });
    });

    group.add(pg);
  }

  buildLanternPergolaArches(group) {
    const m = this.materials;
    const colorKeys = Object.keys(LANTERN_COLORS);

    WISH_GARDEN_CONFIG.arches.forEach((arch, aIdx) => {
      const ag = new C_ENGINE.Group();
      ag.position.set(arch.x, -0.78, arch.z);
      ag.rotation.y = arch.yaw;

      const pillarH = 3.05;
      for (const sideX of [-1.45, 1.45]) {
        m.createMesh(
          new C_ENGINE.CylinderGeometry(0.21, 0.25, 0.16, 10),
          m.matStone,
          ag,
          { pos: [sideX, 0.08, 0] }
        );
        m.createMesh(
          new C_ENGINE.CylinderGeometry(0.14, 0.165, pillarH, 12),
          m.matDarkTimber,
          ag,
          { pos: [sideX, pillarH * 0.5 + 0.08, 0] }
        );
        // 기둥 상단 주두 장식
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.32, 0.1, 0.32, 2, 0.01),
          m.matDancheongJade,
          ag,
          { pos: [sideX, pillarH + 0.04, 0] }
        );
      }

      // 상단 이중 단청 들보 + 전통 맞배 기와지붕 갓
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(3.65, 0.18, 0.22, 2, 0.02),
        m.matDancheongRed,
        ag,
        { pos: [0, pillarH + 0.12, 0] }
      );
      for (const zSlope of [-1, 1]) {
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(4.05, 0.09, 0.56, 2, 0.015),
          m.matRealisticGiwa,
          ag,
          {
            pos: [0, pillarH + 0.34, zSlope * 0.24],
            rot: [zSlope * 0.36, 0, 0]
          }
        );
      }
      // 용마루
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(4.12, 0.12, 0.14, 2, 0.02),
        m.matStone,
        ag,
        { pos: [0, pillarH + 0.48, 0], tone: 0.72 }
      );

      // 아치 아래 5개 소원 연등 걸기
      for (let i = 0; i < 5; i++) {
        const lx = -1.0 + i * 0.5;
        const globalIdx = 12 + aIdx * 5 + i;
        const colorKey = colorKeys[globalIdx % colorKeys.length];
        const wish = INITIAL_WISHES[globalIdx % INITIAL_WISHES.length];
        const cosY = Math.cos(arch.yaw);
        const sinY = Math.sin(arch.yaw);
        this.spawnGardenLantern(ag, {
          x: lx,
          y: pillarH + 0.02,
          z: 0,
          worldBaseX: arch.x + lx * cosY,
          worldBaseZ: arch.z - lx * sinY,
          cordLen: 0.34 + (i % 2) * 0.16,
          colorKey,
          wish,
          phase: globalIdx * 0.75,
          scale: i === 2 ? 1.08 : 0.92
        });
      }

      group.add(ag);
    });
  }

  buildCatenaryLanternGarlands(group) {
    const { cx, cz } = WISH_GARDEN_CONFIG;
    const colorKeys = Object.keys(LANTERN_COLORS);
    const ropeMat = this.materials.matDarkTimber;

    // 소원정 4면 처마 끝과 사방 등가 아치를 잇는 우아한 현수선(Catenary) 연등줄 4선
    const spans = [
      { p0: [cx + 3.2, 2.55, cz], p1: [cx + 6.7, 2.38, cz] },
      { p0: [cx - 3.2, 2.55, cz], p1: [cx - 6.7, 2.38, cz] },
      { p0: [cx, 2.55, cz + 3.2], p1: [cx, 2.38, cz + 6.3] },
      { p0: [cx, 2.55, cz - 3.2], p1: [cx, 2.38, cz - 6.3] }
    ];

    spans.forEach((sp, sIdx) => {
      const a = new C_ENGINE.Vector3(sp.p0[0], sp.p0[1], sp.p0[2]);
      const b = new C_ENGINE.Vector3(sp.p1[0], sp.p1[1], sp.p1[2]);
      const mid = a.clone().lerp(b, 0.5);
      mid.y -= 0.34; // 자연스러운 처짐(현수선)

      const curve = new C_ENGINE.CatmullRomCurve3([a, mid, b]);
      const ropeGeo = new C_ENGINE.TubeGeometry(curve, 14, 0.016, 6, false);
      const ropeMesh = new C_ENGINE.Mesh(ropeGeo, ropeMat);
      group.add(ropeMesh);

      // 각 등줄마다 3개의 다층 한지 연등 매달기
      for (const t of [0.28, 0.5, 0.72]) {
        const pt = curve.getPoint(t);
        const idx = 32 + sIdx * 3 + Math.round(t * 4);
        const colorKey = colorKeys[idx % colorKeys.length];
        const wish = INITIAL_WISHES[idx % INITIAL_WISHES.length];
        this.spawnGardenLantern(group, {
          x: pt.x,
          y: pt.y,
          z: pt.z,
          worldBaseX: pt.x,
          worldBaseZ: pt.z,
          cordLen: 0.22 + (t === 0.5 ? 0.12 : 0),
          colorKey,
          wish,
          phase: idx * 0.85,
          scale: t === 0.5 ? 0.95 : 0.82
        });
      }
    });
  }

  buildLotusStoneBasin(group) {
    const m = this.materials;
    // 정원 동남측 화단(보행 동선 외곽 x=-23.5, z=-7.6)에 돌확 연꽃 수반과 대나무 물홈통
    const bg = new C_ENGINE.Group();
    bg.position.set(-23.5, -0.78, -7.6);

    // 화강암 받침돌 + 둥근 돌확 수반
    m.createMesh(new C_ENGINE.CylinderGeometry(0.55, 0.68, 0.28, 12), m.matStone, bg, {
      pos: [0, 0.14, 0],
      tone: 0.9
    });
    m.createMesh(new C_ENGINE.CylinderGeometry(0.76, 0.58, 0.44, 16), m.matStone, bg, {
      pos: [0, 0.46, 0],
      tone: 0.95
    });
    // 수반 안 맑은 물
    const waterMesh = new C_ENGINE.Mesh(
      new C_ENGINE.CircleGeometry(0.62, 18),
      new C_ENGINE.MeshStandardMaterial({
        color: 0x3b8c82,
        roughness: 0.12,
        metalness: 0.25,
        transparent: true,
        opacity: 0.85
      })
    );
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.66;
    bg.add(waterMesh);

    // 대나무 물홈통(시시오도시 스타일)
    const bambooMat = new C_ENGINE.MeshStandardMaterial({
      color: 0x6b8c4e,
      roughness: 0.65,
      metalness: 0.04
    });
    const post = new C_ENGINE.Mesh(new C_ENGINE.CylinderGeometry(0.045, 0.052, 0.96, 8), bambooMat);
    post.position.set(-0.62, 0.48, 0);
    bg.add(post);

    const spout = new C_ENGINE.Mesh(new C_ENGINE.CylinderGeometry(0.036, 0.042, 0.72, 8), bambooMat);
    spout.position.set(-0.34, 0.84, 0);
    spout.rotation.z = -1.25;
    bg.add(spout);

    // 떨어지는 맑은 물줄기
    const streamMat = new C_ENGINE.MeshBasicMaterial({
      color: 0xdff7f4,
      transparent: true,
      opacity: 0.58
    });
    const stream = new C_ENGINE.Mesh(new C_ENGINE.CylinderGeometry(0.012, 0.018, 0.18, 6), streamMat);
    stream.position.set(-0.04, 0.72, 0);
    bg.add(stream);

    group.add(bg);
  }

  buildGardenStoneLanternsAndBenches(group) {
    const m = this.materials;

    // 1. 정원 사방 석등롱 4기
    for (const sl of WISH_GARDEN_CONFIG.stoneLanterns) {
      const lg = new C_ENGINE.Group();
      lg.position.set(sl.x, -0.78, sl.z);

      m.createMesh(new C_ENGINE.CylinderGeometry(0.42, 0.48, 0.16, 6), m.matStone, lg, {
        pos: [0, 0.08, 0]
      });
      m.createMesh(new C_ENGINE.CylinderGeometry(0.14, 0.17, 0.72, 6), m.matStone, lg, {
        pos: [0, 0.52, 0]
      });
      m.createMesh(new C_ENGINE.CylinderGeometry(0.28, 0.22, 0.14, 6), m.matStone, lg, {
        pos: [0, 0.94, 0]
      });
      m.createMesh(new C_ENGINE.CylinderGeometry(0.22, 0.22, 0.32, 6), m.matWarmHanji, lg, {
        pos: [0, 1.16, 0],
        castShadow: false
      });
      m.createMesh(new C_ENGINE.ConeGeometry(0.44, 0.26, 6), m.matStone, lg, {
        pos: [0, 1.45, 0]
      });
      group.add(lg);
    }

    // 2. 서쪽 정원 이끼 바위 & 목조 벤치
    const gardenBoulders = [
      { pos: [-23.0, -0.76, -1.8], scale: [1.05, 0.54, 0.88] },
      { pos: [-34.2, -0.75, -7.2], scale: [1.18, 0.58, 0.94] },
      { pos: [-25.5, -0.78, 3.2], scale: [0.95, 0.48, 0.82] }
    ];
    gardenBoulders.forEach((b, idx) => {
      m.createMesh(
        new C_ENGINE.SphereGeometry(1, 14, 10),
        idx % 2 === 0 ? m.matMoss : m.matRock,
        group,
        { pos: b.pos, scale: b.scale, rot: [0, idx * 1.1, 0], tone: 0.94 }
      );
    });

    const benches = [
      { x: -34.2, z: 2.2, rotY: 0.45 },
      { x: -22.8, z: -11.4, rotY: 0.45 }
    ];
    benches.forEach((bn) => {
      const bg = new C_ENGINE.Group();
      bg.position.set(bn.x, -0.78, bn.z);
      bg.rotation.y = bn.rotY;
      m.createMesh(new C_ENGINE.RoundedBoxGeometry(2.1, 0.08, 0.56, 2, 0.02), m.matTimber, bg, {
        pos: [0, 0.42, 0]
      });
      for (const dx of [-0.78, 0.78]) {
        m.createMesh(new C_ENGINE.RoundedBoxGeometry(0.14, 0.4, 0.48, 2, 0.015), m.matStone, bg, {
          pos: [dx, 0.2, 0]
        });
      }
      group.add(bg);
    });
  }

  buildFireflyParticlesInstanced(group) {
    const { cx, cz } = WISH_GARDEN_CONFIG;
    const count = this.isMobile ? 18 : 38;
    const geo = new C_ENGINE.SphereGeometry(0.045, 6, 6);
    const mat = new C_ENGINE.MeshBasicMaterial({
      color: 0xffe49e,
      transparent: true,
      opacity: 0.85,
      blending: C_ENGINE.AdditiveBlending,
      depthWrite: false
    });
    this.fireflyInst = new C_ENGINE.InstancedMesh(geo, mat, count);
    this.fireflyInst.raycast = () => {};

    const palette = [
      new C_ENGINE.Color(0xffe082),
      new C_ENGINE.Color(0xf9a8d4),
      new C_ENGINE.Color(0xfef08a),
      new C_ENGINE.Color(0x6ee7b7)
    ];

    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const rad = 1.6 + ((i * 29) % 62) / 10;
      this.fireflyInst.setColorAt(i, palette[i % palette.length]);
      this.fireflyData.push({
        baseX: cx + Math.cos(ang) * rad,
        baseY: 0.4 + (i % 7) * 0.36,
        baseZ: cz + Math.sin(ang) * rad,
        phase: i * 1.37,
        speed: 0.55 + (i % 4) * 0.16,
        ampX: 0.35 + (i % 3) * 0.2,
        ampY: 0.22 + (i % 4) * 0.08
      });
    }
    if (this.fireflyInst.instanceColor) this.fireflyInst.instanceColor.needsUpdate = true;
    group.add(this.fireflyInst);
  }

  getSharedLanternBodyMat(colorKey) {
    if (!this._lanternBodyMats[colorKey]) {
      const pal = LANTERN_COLORS[colorKey] || LANTERN_COLORS.amber;
      const lanternTex =
        this.materials.lanternTextures[colorKey] || this.materials.lanternTextures.amber;
      this._lanternBodyMats[colorKey] = new C_ENGINE.MeshStandardMaterial({
        map: lanternTex,
        emissive: new C_ENGINE.Color(pal.hex),
        emissiveMap: lanternTex,
        emissiveIntensity: 0.42,
        roughness: 0.6
      });
    }
    return this._lanternBodyMats[colorKey];
  }

  spawnGardenLantern(
    parent,
    { x, y, z, worldBaseX, worldBaseZ, cordLen, colorKey, wish, phase, scale = 1.0 }
  ) {
    const pivot = new C_ENGINE.Group();
    pivot.position.set(x, y, z);
    pivot.userData.dynamic = true;

    const cord = new C_ENGINE.Mesh(
      new C_ENGINE.CylinderGeometry(0.008, 0.008, cordLen, 6),
      this.materials.matBronze
    );
    cord.position.y = -cordLen * 0.5;
    pivot.add(cord);

    const centerY = -cordLen - 0.25 * scale;
    const bodyGeo = this.getSharedLanternBodyGeo();
    const bodyMat = this.getSharedLanternBodyMat(colorKey);

    const userData = {
      type: 'lantern',
      wishId: wish.id,
      wish,
      worldPos: new C_ENGINE.Vector3(worldBaseX, y + centerY, worldBaseZ)
    };

    const bodyMesh = new C_ENGINE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = centerY;
    bodyMesh.scale.setScalar(scale);
    bodyMesh.userData = userData;
    pivot.add(bodyMesh);

    const capGeo = this.getSharedCapGeo();
    const capMat = this.getSharedCapMat();
    const topCap = new C_ENGINE.Mesh(capGeo, capMat);
    topCap.position.y = centerY + 0.25 * scale;
    topCap.scale.setScalar(scale);
    pivot.add(topCap);
    const botCap = new C_ENGINE.Mesh(capGeo, capMat);
    botCap.position.y = centerY - 0.25 * scale;
    botCap.scale.setScalar(scale);
    pivot.add(botCap);

    const tagMesh = new C_ENGINE.Mesh(this.getSharedTagGeo(), this.getSharedTagMat());
    tagMesh.position.y = centerY - 0.45 * scale;
    tagMesh.scale.setScalar(scale);
    tagMesh.userData = userData;
    pivot.add(tagMesh);

    parent.add(pivot);

    this.swayingLanterns.push({
      pivot,
      tagMesh,
      phase,
      speed: 1.05 + (Math.floor(phase * 10) % 3) * 0.22
    });
    this.interactiveEntries.push(bodyMesh, tagMesh);
  }

  getSharedLanternBodyGeo() {
    if (!this._bodyGeo) {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const y = (t - 0.5) * 0.5;
        const r = 0.075 + Math.sin(t * Math.PI) * 0.175;
        pts.push(new C_ENGINE.Vector2(r, y));
      }
      this._bodyGeo = new C_ENGINE.LatheGeometry(pts, 16);
    }
    return this._bodyGeo;
  }

  getSharedCapGeo() {
    if (!this._capGeo) {
      this._capGeo = new C_ENGINE.CylinderGeometry(0.11, 0.11, 0.036, 10);
    }
    return this._capGeo;
  }

  getSharedCapMat() {
    if (!this._capMat) {
      this._capMat = new C_ENGINE.MeshStandardMaterial({ color: 0x3b281e, roughness: 0.8 });
    }
    return this._capMat;
  }

  getSharedTagGeo() {
    if (!this._tagGeo) {
      this._tagGeo = new C_ENGINE.PlaneGeometry(0.095, 0.3);
    }
    return this._tagGeo;
  }

  getSharedTagMat() {
    if (!this._tagMat) {
      this._tagMat = new C_ENGINE.MeshBasicMaterial({
        color: 0xf5efe2,
        side: C_ENGINE.DoubleSide
      });
    }
    return this._tagMat;
  }

  createPlaqueTexture(text) {
    return TextureFactory.createSimplePlaqueTexture(text);
  }

  update(elapsed, _dt) {
    for (const l of this.swayingLanterns) {
      l.pivot.rotation.z = Math.sin(elapsed * l.speed + l.phase) * 0.05;
      l.pivot.rotation.x = Math.cos(elapsed * l.speed * 0.8 + l.phase) * 0.03;
      l.tagMesh.rotation.z = Math.sin(elapsed * 2.2 + l.phase) * 0.14;
      l.tagMesh.rotation.y = Math.cos(elapsed * 1.6 + l.phase) * 0.22;
    }

    if (this.fireflyInst) {
      for (let i = 0; i < this.fireflyData.length; i++) {
        const d = this.fireflyData[i];
        const t = elapsed * d.speed + d.phase;
        const pulse = 0.55 + 0.55 * Math.sin(elapsed * 2.4 + d.phase);
        this.fireflyDummy.position.set(
          d.baseX + Math.sin(t) * d.ampX,
          d.baseY + Math.cos(t * 1.3) * d.ampY,
          d.baseZ + Math.cos(t * 0.9) * d.ampX
        );
        this.fireflyDummy.scale.setScalar(pulse);
        this.fireflyDummy.updateMatrix();
        this.fireflyInst.setMatrixAt(i, this.fireflyDummy.matrix);
      }
      this.fireflyInst.instanceMatrix.needsUpdate = true;
    }
  }
}
