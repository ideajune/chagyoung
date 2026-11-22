/**
 * ChagyeongruBuilder — 차경루(안양루 양식) 누각 3D 및 21석 좌선 방석 빌더
 */

import { TextureFactory } from './TextureFactory.js';
import { buildRealisticPaljakRoof } from './PaljakRoofBuilder.js';
import { buildTraditionalStoneStaircase } from './StoneStaircaseBuilder.js';
import { SANSA_CORE as C_ENGINE } from '../engine/CoreRuntime.js';

export function buildChagyeongruPavilion(parent, spec, materials) {
    const m = materials;
    const cushionInteractiveEntries = [];
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

    buildTraditionalStoneStaircase(pg, {
      x: 0,
      bottomY: -0.05,
      topY: 0.80,
      startZ: 5.76,
      endZ: 4.24,
      treadWidth: 4.38,
      cheekWidth: 0.34,
      stepCount: 5
    }, m);

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

    // 4. 차경루 좌횡서 현판 (借 景 樓)
    const plaqueTex = TextureFactory.createPlaqueTexture(spec.hanja, { rtl: false });
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

    // 6. 차경루 21개 단일 디자인 미니멀 명상 좌복 (단정한 린넨 방석 + 소박한 돗자리 자리)
    const cushionHitGeo = new C_ENGINE.CylinderGeometry(0.66, 0.66, 0.34, 16);
    const cushionHitMat = new C_ENGINE.MeshBasicMaterial({ visible: false });
    const cushionRingGeo = new C_ENGINE.RingGeometry(0.50, 0.58, 36);

    // 소박한 베이지 돗자리 텍스처 (단일 통일 디자인)
    const makeSimpleMatTex = () => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#c9bfa8';
      ctx.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y += 3) {
        ctx.fillStyle = y % 6 === 0 ? 'rgba(130,115,92,0.16)' : 'rgba(240,232,214,0.14)';
        ctx.fillRect(0, y, 128, 1.5);
      }
      ctx.strokeStyle = '#474f4d';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, 120, 120);
      const tex = new C_ENGINE.CanvasTexture(c);
      tex.colorSpace = C_ENGINE.SRGBColorSpace;
      return tex;
    };

    // 차분한 먹청·회빛 천연 린넨 좌복 텍스처 (단일 통일 디자인)
    const makeSimpleLinenTex = () => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
      g.addColorStop(0, '#4d5b59');
      g.addColorStop(0.75, '#3b4746');
      g.addColorStop(1, '#2b3433');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 128; i += 3) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(128, i);
        ctx.stroke();
      }
      const tex = new C_ENGINE.CanvasTexture(c);
      tex.colorSpace = C_ENGINE.SRGBColorSpace;
      return tex;
    };

    const simpleMatMaterial = new C_ENGINE.MeshStandardMaterial({
      map: makeSimpleMatTex(),
      roughness: 0.9,
      metalness: 0.01
    });
    const simpleCushionMat = new C_ENGINE.MeshStandardMaterial({
      map: makeSimpleLinenTex(),
      roughness: 0.88,
      metalness: 0.02
    });
    const simpleDimpleMat = new C_ENGINE.MeshStandardMaterial({
      color: 0x2a3332,
      roughness: 0.92,
      metalness: 0.01
    });

    // 간결하고 단아한 원형 명상 방석 프로필
    const puffPts = [
      new C_ENGINE.Vector2(0.0, 0.0),
      new C_ENGINE.Vector2(0.41, 0.004),
      new C_ENGINE.Vector2(0.455, 0.035),
      new C_ENGINE.Vector2(0.46, 0.082),
      new C_ENGINE.Vector2(0.42, 0.12),
      new C_ENGINE.Vector2(0.30, 0.134),
      new C_ENGINE.Vector2(0.12, 0.128),
      new C_ENGINE.Vector2(0.0, 0.118)
    ];
    const puffGeo = new C_ENGINE.LatheGeometry(puffPts, 28);
    const matBaseGeo = new C_ENGINE.RoundedBoxGeometry(1.04, 0.02, 1.04, 2, 0.01);
    const buttonGeo = new C_ENGINE.SphereGeometry(0.038, 10, 6);

    spec.cushionLocalCoords.forEach(([cx, cz], idx) => {
      const cushionGroup = new C_ENGINE.Group();
      cushionGroup.position.set(cx, deckY + 0.06, cz);

      const matMesh = new C_ENGINE.Mesh(matBaseGeo, simpleMatMaterial);
      matMesh.position.set(0, 0.01, 0);
      matMesh.receiveShadow = true;
      matMesh.castShadow = true;
      cushionGroup.add(matMesh);

      const silkMesh = new C_ENGINE.Mesh(puffGeo, simpleCushionMat);
      silkMesh.position.set(0, 0.018, 0);
      silkMesh.castShadow = true;
      silkMesh.receiveShadow = true;
      cushionGroup.add(silkMesh);

      const topPadMesh = new C_ENGINE.Mesh(buttonGeo, simpleDimpleMat);
      topPadMesh.position.set(0, 0.135, 0);
      topPadMesh.scale.set(1.1, 0.35, 1.1);
      cushionGroup.add(topPadMesh);

      const cushionData = { type: 'cushion', seatIndex: idx };
      matMesh.userData = cushionData;
      silkMesh.userData = cushionData;
      topPadMesh.userData = cushionData;

      const hitMesh = new C_ENGINE.Mesh(cushionHitGeo, cushionHitMat);
      hitMesh.position.set(0, 0.14, 0);
      hitMesh.userData = cushionData;
      cushionGroup.add(hitMesh);

      const ringMat = new C_ENGINE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: C_ENGINE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const ringMesh = new C_ENGINE.Mesh(cushionRingGeo, ringMat);
      ringMesh.rotation.x = -Math.PI * 0.5;
      ringMesh.position.set(0, 0.032, 0);
      ringMesh.visible = false;
      ringMesh.raycast = () => {};
      cushionGroup.add(ringMesh);

      cushionInteractiveEntries.push({
        seatIndex: idx,
        group: cushionGroup,
        hitMesh,
        ringMesh,
        ringMat
      });

      pg.add(cushionGroup);
    });

    // 차경루 처마 빛은 SceneManager의 eaveFillLight와 연등 자체 발광으로 통합 (PointLight 절감)
    parent.add(pg);
    return cushionInteractiveEntries;
}
