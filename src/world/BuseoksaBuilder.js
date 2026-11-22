/**
 * BuseoksaBuilder — 영주 부석사 무량수전, 안양루, 통일신라 석등, 박석 마당, 스캔 소나무·단풍나무 숲, 소백산맥 원경 및 운해 빌더
 * - worldConfig.js의 단일 원본(SSOT) 수치를 참조하여 3D 건축물과 보행/충돌 좌표계가 항상 일치하도록 구성합니다.
 */

import {
  MURYANGSUJEON_CONFIG,
  ANYANGRU_CONFIG,
  COURTYARD_CONFIG,
  YEONHWAJI_CONFIG
} from '../config/worldConfig.js';
import { TextureFactory } from './TextureFactory.js';
import { buildMuryangsujeonHall } from './MuryangsujeonBuilder.js';
import { buildChagyeongruPavilion } from './ChagyeongruBuilder.js';
import { YeonhwajiBuilder } from './YeonhwajiBuilder.js';
import { WishGardenBuilder } from './WishGardenBuilder.js';
import { CheongpungInteriorBuilder } from './CheongpungInteriorBuilder.js';
import { batchStaticMeshes } from './StaticMeshBatcher.js';

import { SANSA_CORE as C_ENGINE } from '../engine/CoreRuntime.js';

export class BuseoksaBuilder {
  constructor(sceneManager, materials) {
    this.sceneManager = sceneManager;
    this.materials = materials;
    this.buseoksaGroup = sceneManager.buseoksaGroup;

    this.buseoksaGroundMat = null;
    this.sobaeksanVistaMat = null;
    this.sobaeksanVistaMesh = null;
    this.cloudPlanes = [];
    this.buseoksaPineAnchors = [];
    this.scannedSeasonalTwigMats = [];
    this.cushionInteractiveEntries = [];

    // PC와 모바일 동일한 3D 디자인·색감·디테일 유지
    this.yeonhwajiBuilder = new YeonhwajiBuilder(materials, false);
    this.wishGardenBuilder = new WishGardenBuilder(materials, false);
    this.interiorBuilder = new CheongpungInteriorBuilder(materials, false);
  }

  build() {
    const g = this.buseoksaGroup;
    const m = this.materials;

    // 1. 360° 마당 및 산자락 지형 메쉬 (동쪽 연화지·서쪽 소원 연등 정원 테라스 및 연못 분지 포함)
    this.buseoksaGroundMat = m.matGround.clone();
    const groundGeo = new C_ENGINE.PlaneGeometry(340, 320, 112, 108);
    groundGeo.rotateX(-Math.PI / 2);
    const gPos = groundGeo.getAttribute('position');
    const pond = YEONHWAJI_CONFIG;
    for (let i = 0; i < gPos.count; i++) {
      const x = gPos.getX(i);
      const z = gPos.getZ(i);
      let y = -0.82;
      if (z < -25.0) {
        const d = -25.0 - z;
        y = -0.82 - Math.min(5.2, d * 0.2) + Math.sin(x * 0.07) * Math.min(1.4, d * 0.035);
      } else {
        // 동·서쪽 연화지/정원 구간(z ∈ [-16, 8])은 |x|=40.5까지 평탄화, 그 외 구간은 |x|=22부터 산자락 상승
        const wingBlend =
          z >= -16.5 && z <= 8.5
            ? 1.0
            : z < -16.5
              ? Math.max(0, 1 - (-16.5 - z) / 5.0)
              : Math.max(0, 1 - (z - 8.5) / 6.0);
        const flatHalfX = 22.0 + wingBlend * 18.5;
        const sideDist = Math.max(0, Math.abs(x) - flatHalfX);
        const sideLift = Math.min(7.5, Math.pow(sideDist * 0.075, 1.35) * 4.4);
        y = -0.82 + sideLift + Math.sin(x * 0.2 + z * 0.18) * 0.025;

        // 동쪽 연화지 연못 분지 깊이 굴착
        const pnx = (x - pond.cx) / pond.rx;
        const pnz = (z - pond.cz) / pond.rz;
        const pDistSq = pnx * pnx + pnz * pnz;
        if (pDistSq < 1.12) {
          const depthFactor = Math.max(0, Math.min(1, (1.12 - pDistSq) / 0.35));
          y = y * (1 - depthFactor) + -2.18 * depthFactor;
        }
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
    buildMuryangsujeonHall(g, m, this.interiorBuilder);

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

    // 9. 안양루 누각 및 21개 명상 방석
    this.cushionInteractiveEntries = buildChagyeongruPavilion(g, ANYANGRU_CONFIG, m);

    // 9-1. 동쪽 연화지(청풍교 · 비단잉어 · 연꽃) 및 서쪽 소원 연등 정원(소원정 · 등가 아치)
    this.yeonhwajiBuilder.build(g);
    this.wishGardenBuilder.build(g);

    // 10. 수목 앵커 구성 (기존 실사 스캔 소나무·단풍나무 pine.glb 원복)
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

    // 12-1. 정적 건축·조경 메쉬 재질별 통합 배칭 (Draw Call 및 초기 PBR UV 투영 비용 대폭 절감)
    batchStaticMeshes(g, m);

    // 13. 스캔 소나무·단풍나무 GLB 비동기 로드 및 배치
    this.loadAndPopulatePines();

    return this.buseoksaGroundMat;
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

    // 석등 화사창 자체 발광(matWarmHanji) + 바닥 글로우(groundGlow)로 표현 (PointLight 절감)

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
    const arcSpan = Math.PI * 0.94;
    const radius = 145;
    const centerZ = -4.0;

    for (let i = 0; i < vPos.count; i++) {
      const u = vPos.getX(i) + 0.5;
      const v = vPos.getY(i) + 0.5;
      const angle = (u - 0.5) * arcSpan;
      const wx = Math.sin(angle) * radius;
      const wz = centerZ - Math.cos(angle) * radius;
      const wy = -18.0 + v * 84.0;
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

    // 첫 프레임 렌더링을 먼저 완료한 뒤 대용량 pine.glb를 비동기 로드하여 초기 체감 로딩 속도 개선
    const startLoad = () => {
      const loader = new C_ENGINE.GLTFLoader().setMeshoptDecoder(C_ENGINE.MeshoptDecoder);
      loader
        .loadAsync('assets/models/pine.glb')
        .then((gltf) => {
          this.populateScannedPines(gltf);
        })
        .catch((err) => console.warn('Pine GLB fallback:', err));
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(startLoad, { timeout: 350 });
    } else {
      setTimeout(startLoad, 120);
    }
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
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          let isTwigMesh = false;
          mats.forEach((m) => {
            if (!m) return;
            if (m.name && m.name.includes('twig')) {
              isTwigMesh = true;
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
          // 알파 테스트 양면 나뭇잎(twig)만 그림자 제외, 줄기 그림자는 PC·모바일 동일 적용
          child.castShadow = !isTwigMesh;
          child.receiveShadow = false;
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
      // 3중 복제 대신 풍성한 단일 수관 비율(1.16)로 드로우콜·폴리곤 부하 약 65% 절감
      const widthBoost = (spec.widthScale || defaultWidth) * 1.16;
      primary.scale.set(mainScale * widthBoost, mainScale, mainScale * widthBoost);
      applyTwigMaterial(primary, chooseTwigMat(0));

      // 마당 외곽·계곡 원경 나무는 그림자 패스에서 제외
      const isDistantTree = spec.z < -24 || Math.abs(spec.x) > 22 || spec.z > 18;
      if (isDistantTree) {
        primary.traverse((child) => {
          if (child.isMesh) child.castShadow = false;
        });
      }

      treeGroup.add(primary);

      treeGroup.rotation.y = spec.yaw ?? idx * 1.7;
      treeGroup.position.set(spec.x, spec.y, spec.z);
      targetGroup.add(treeGroup);
    };

    this.buseoksaPineAnchors.forEach((spec, idx) =>
      placePineAt(spec, idx, this.buseoksaGroup)
    );
  }

  getGardenLanternTargets() {
    return this.wishGardenBuilder ? this.wishGardenBuilder.interactiveEntries : [];
  }

  getIndoorCushionEntries() {
    return this.interiorBuilder ? this.interiorBuilder.indoorCushionEntries : [];
  }

  update(elapsed, dt) {
    this.updateClouds(elapsed);
    this.yeonhwajiBuilder?.update(elapsed, dt);
    this.wishGardenBuilder?.update(elapsed, dt);
    this.interiorBuilder?.update(elapsed, dt);
  }

  updateClouds(elapsed) {
    for (const c of this.cloudPlanes) {
      c.mesh.position.x = c.baseX + Math.sin(elapsed * 0.08 * c.speed + c.phase) * 14;
      c.mesh.position.y = c.baseY + Math.cos(elapsed * 0.22 + c.phase) * 0.35;
    }
  }
}
