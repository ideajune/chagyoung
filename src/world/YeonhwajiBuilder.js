/**
 * YeonhwajiBuilder — 동쪽 연화지(蓮花池), 아치형 목교 청풍교(淸風橋), 코이 비단잉어, 실시간 물결 셰이더, 연꽃·수초 빌더
 * - worldConfig.js의 YEONHWAJI_CONFIG 및 getCheongpungBridgeY(x) 단일 원본을 공유합니다.
 * - InstancedMesh, 지오메트리/재질 공유, 경량 GPU 수면 셰이더 및 isMobile 자동 경량화를 적용합니다.
 */

import { YEONHWAJI_CONFIG, getCheongpungBridgeY } from '../config/worldConfig.js';

const C_ENGINE = window.SANSA_CORE;

export class YeonhwajiBuilder {
  constructor(materials, isMobile = false) {
    this.materials = materials;
    this.isMobile = Boolean(isMobile);
    this.fishList = [];
    this.ripples = [];
    this.lotusPads = [];
    this.waterTimeUniform = { value: 0 };
  }

  build(parent) {
    const group = new C_ENGINE.Group();
    group.name = 'EastYeonhwaji';

    this.buildPondBasinAndWater(group);
    this.buildShoreReedsInstanced(group);
    this.buildLotusClusters(group);
    this.buildCheongpungBridge(group);
    this.buildSwimmingFish(group);
    this.buildLakesidePathsAndBench(group);

    parent.add(group);
    return group;
  }

  createPondBedTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 128);
    grad.addColorStop(0, '#5a6355');
    grad.addColorStop(0.65, '#6c7260');
    grad.addColorStop(1, '#7c7b67');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // 자갈·모래 질감 점묘
    for (let i = 0; i < 420; i++) {
      const x = (i * 73) % 256;
      const y = (i * 137) % 256;
      const r = 1.2 + (i % 4) * 0.9;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(185,180,158,0.28)' : 'rgba(58,64,52,0.28)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new C_ENGINE.CanvasTexture(canvas);
    tex.colorSpace = C_ENGINE.SRGBColorSpace;
    return tex;
  }

  createLotusPadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, '#6a9e52');
    grad.addColorStop(0.55, '#3e7441');
    grad.addColorStop(1, '#2b5530');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    // 방사형 잎맥
    ctx.strokeStyle = 'rgba(154, 206, 122, 0.38)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(64, 64);
      ctx.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60);
      ctx.stroke();
    }

    const tex = new C_ENGINE.CanvasTexture(canvas);
    tex.colorSpace = C_ENGINE.SRGBColorSpace;
    return tex;
  }

  createKoiTexture(variantIdx) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const variants = [
      { base: '#fcf8f2', spots: ['#ea381a', '#f25124'], accent: '#1f2937' }, // 홍백/삼색 코이
      { base: '#f7b727', spots: ['#fde047', '#d97706'], accent: null },      // 황금 야마부키
      { base: '#f4511e', spots: ['#fff7ed', '#ff8a65'], accent: null },      // 주홍 비단잉어
      { base: '#f8fafc', spots: ['#ef4444', '#fb7185'], accent: '#1e293b' }  // 대정삼색
    ];
    const v = variants[variantIdx % variants.length];
    ctx.fillStyle = v.base;
    ctx.fillRect(0, 0, 128, 128);

    // 등무늬 얼룩
    ctx.fillStyle = v.spots[0];
    ctx.beginPath();
    ctx.ellipse(64, 42, 26, 22, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = v.spots[1];
    ctx.beginPath();
    ctx.ellipse(58, 86, 20, 18, -0.3, 0, Math.PI * 2);
    ctx.fill();

    if (v.accent) {
      ctx.fillStyle = v.accent;
      ctx.beginPath();
      ctx.ellipse(76, 66, 9, 12, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new C_ENGINE.CanvasTexture(canvas);
    tex.colorSpace = C_ENGINE.SRGBColorSpace;
    return tex;
  }

  buildPondBasinAndWater(group) {
    const m = this.materials;
    const { cx, cz, rx, rz, waterY, bedY } = YEONHWAJI_CONFIG;

    // 1. 질감이 살아있는 연못 바닥
    const bedGeo = new C_ENGINE.CircleGeometry(1, this.isMobile ? 40 : 56);
    bedGeo.rotateX(-Math.PI / 2);
    const bedMat = new C_ENGINE.MeshStandardMaterial({
      map: this.createPondBedTexture(),
      roughness: 0.94,
      metalness: 0.02
    });
    const bedMesh = new C_ENGINE.Mesh(bedGeo, bedMat);
    bedMesh.position.set(cx, bedY, cz);
    bedMesh.scale.set(rx * 0.96, 1, rz * 0.96);
    bedMesh.receiveShadow = true;
    group.add(bedMesh);

    // 2. 수중 조약돌 (InstancedMesh — 단일 Draw Call)
    const pebbleCount = this.isMobile ? 24 : 46;
    const pebbleGeo = new C_ENGINE.SphereGeometry(1, 8, 6);
    const pebbleMat = new C_ENGINE.MeshStandardMaterial({
      color: 0x9b9888,
      roughness: 0.9,
      metalness: 0.02
    });
    const pebbleInst = new C_ENGINE.InstancedMesh(pebbleGeo, pebbleMat, pebbleCount);
    const dummy = new C_ENGINE.Object3D();
    const toneColor = new C_ENGINE.Color();
    for (let i = 0; i < pebbleCount; i++) {
      const ang = i * 2.39996;
      const rad = 0.14 + ((i * 17) % 72) / 100;
      const px = cx + Math.cos(ang) * rx * rad;
      const pz = cz + Math.sin(ang) * rz * rad;
      const s = 0.16 + (i % 4) * 0.085;
      dummy.position.set(px, bedY + 0.03, pz);
      dummy.rotation.set(0, ang, 0);
      dummy.scale.set(s * 1.28, s * 0.44, s);
      dummy.updateMatrix();
      pebbleInst.setMatrixAt(i, dummy.matrix);
      toneColor.setHSL(0.12, 0.08, 0.46 + (i % 5) * 0.05);
      pebbleInst.setColorAt(i, toneColor);
    }
    pebbleInst.instanceMatrix.needsUpdate = true;
    if (pebbleInst.instanceColor) pebbleInst.instanceColor.needsUpdate = true;
    pebbleInst.receiveShadow = true;
    group.add(pebbleInst);

    // 3. 연못 둘레 자연 화강암 호안석 및 이끼 바위 (청풍교 접속부 개방, 충돌 타원 내측 정렬)
    const rockCount = this.isMobile ? 28 : 38;
    for (let i = 0; i < rockCount; i++) {
      const ang = (i / rockCount) * Math.PI * 2;
      const jitter = Math.sin(i * 2.7) * 0.08;
      const px = cx + Math.cos(ang) * (rx + 0.04 + jitter);
      const pz = cz + Math.sin(ang) * (rz + 0.02 + jitter);
      if (Math.abs(pz - YEONHWAJI_CONFIG.bridge.centerZ) < 1.95) continue;

      const sx = 0.56 + (i % 3) * 0.16;
      const sy = 0.34 + (i % 4) * 0.09;
      const sz = 0.54 + ((i + 1) % 3) * 0.15;
      m.createMesh(
        new C_ENGINE.SphereGeometry(1, 12, 9),
        i % 3 === 0 ? m.matMoss : i % 2 === 0 ? m.matRock : m.matStone,
        group,
        {
          pos: [px, -0.84, pz],
          scale: [sx, sy, sz],
          rot: [0, ang + 0.4, 0],
          tone: 0.88 + (i % 4) * 0.035,
          castShadow: !this.isMobile
        }
      );
    }

    // 4. 경량 GPU 잔물결·수심 그라데이션 수면 셰이더 (단일 Draw Call)
    const waterGeo = new C_ENGINE.CircleGeometry(1, this.isMobile ? 44 : 64);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new C_ENGINE.MeshStandardMaterial({
      color: 0x2c7d76,
      emissive: new C_ENGINE.Color(0x0b2c2a),
      emissiveIntensity: 0.24,
      transparent: true,
      opacity: 0.56,
      roughness: 0.09,
      metalness: 0.26,
      depthWrite: false
    });
    waterMat.onBeforeCompile = (shader) => {
      shader.uniforms.uWaterTime = this.waterTimeUniform;
      shader.vertexShader =
        `varying vec2 vPondUv;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\n vPondUv = uv;`
        );
      shader.fragmentShader =
        `uniform float uWaterTime;\nvarying vec2 vPondUv;\n` +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           vec2 pCentered = (vPondUv - 0.5) * 2.0;
           float radial = clamp(length(pCentered), 0.0, 1.0);
           float w1 = sin(pCentered.x * 16.0 + uWaterTime * 1.65) * cos(pCentered.y * 14.0 - uWaterTime * 1.25);
           float w2 = sin((pCentered.x - pCentered.y) * 22.0 + uWaterTime * 2.1);
           float shimmer = smoothstep(0.45, 0.98, 0.5 + 0.35 * w1 + 0.25 * w2);
           vec3 deepCol = vec3(0.11, 0.36, 0.35);
           vec3 shallowCol = vec3(0.24, 0.56, 0.50);
           diffuseColor.rgb = mix(deepCol, shallowCol, smoothstep(0.45, 1.0, radial));
           diffuseColor.rgb += vec3(0.26, 0.34, 0.30) * shimmer * 0.42;
           diffuseColor.a = mix(0.50, 0.68, smoothstep(0.2, 1.0, radial)) + shimmer * 0.08;`
        );
    };
    waterMat.customProgramCacheKey = () => 'yeonhwaji-water-ripple-v1';

    const waterMesh = new C_ENGINE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(cx, waterY, cz);
    waterMesh.scale.set(rx * 0.99, 1, rz * 0.99);
    waterMesh.receiveShadow = true;
    waterMesh.renderOrder = 2;
    group.add(waterMesh);

    // 5. 잔잔한 수면 파문 링
    const rippleCenters = [
      [cx - 1.9, cz + 3.1],
      [cx + 2.2, cz - 3.5],
      [cx - 2.3, cz - 2.6],
      [cx + 1.5, cz + 4.0]
    ];
    rippleCenters.forEach(([rxPos, rzPos], idx) => {
      const rGeo = new C_ENGINE.RingGeometry(0.16, 0.22, 28);
      rGeo.rotateX(-Math.PI / 2);
      const rMat = new C_ENGINE.MeshBasicMaterial({
        color: 0xe6faf7,
        transparent: true,
        opacity: 0.34,
        depthWrite: false
      });
      const rMesh = new C_ENGINE.Mesh(rGeo, rMat);
      rMesh.position.set(rxPos, waterY + 0.012, rzPos);
      rMesh.renderOrder = 3;
      rMesh.userData.dynamic = true;
      group.add(rMesh);
      this.ripples.push({
        mesh: rMesh,
        mat: rMat,
        phase: idx * 1.45,
        speed: 0.55 + (idx % 2) * 0.14
      });
    });
  }

  buildShoreReedsInstanced(group) {
    const { cx, cz, rx, rz, waterY } = YEONHWAJI_CONFIG;
    const reedCount = this.isMobile ? 36 : 72;
    const bladeGeo = new C_ENGINE.ConeGeometry(0.032, 0.85, 4);
    bladeGeo.translate(0, 0.425, 0);
    const bladeMat = new C_ENGINE.MeshStandardMaterial({
      color: 0x5c7c46,
      roughness: 0.84,
      metalness: 0.02
    });
    const inst = new C_ENGINE.InstancedMesh(bladeGeo, bladeMat, reedCount);
    const dummy = new C_ENGINE.Object3D();
    const col = new C_ENGINE.Color();

    let placed = 0;
    const clusters = [
      { ang: 0.72, spread: 0.24 },
      { ang: 2.38, spread: 0.24 },
      { ang: 3.92, spread: 0.24 },
      { ang: 5.55, spread: 0.24 }
    ];
    for (let i = 0; i < reedCount; i++) {
      const cl = clusters[i % clusters.length];
      const ang = cl.ang + (((i * 31) % 100) / 100 - 0.5) * cl.spread;
      const radMul = 0.94 + ((i * 13) % 10) * 0.008;
      const px = cx + Math.cos(ang) * rx * radMul;
      const pz = cz + Math.sin(ang) * rz * radMul;
      const hScale = 0.65 + (i % 5) * 0.18;
      dummy.position.set(px, waterY - 0.05, pz);
      dummy.rotation.set(
        Math.sin(i * 1.7) * 0.18,
        i * 0.9,
        Math.cos(i * 2.1) * 0.18
      );
      dummy.scale.set(1, hScale, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(placed, dummy.matrix);
      col.setHSL(0.24 + (i % 3) * 0.02, 0.32, 0.34 + (i % 4) * 0.04);
      inst.setColorAt(placed, col);
      placed++;
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    group.add(inst);
  }

  buildLotusClusters(group) {
    const { cx, cz, waterY } = YEONHWAJI_CONFIG;

    // 잎맥 텍스처가 적용된 V자 홈 연잎 (CircleGeometry thetaStart / thetaLength 활용)
    const padGeo = new C_ENGINE.CircleGeometry(1, 24, 0.22, Math.PI * 2 - 0.44);
    padGeo.rotateX(-Math.PI / 2);
    const padTex = this.createLotusPadTexture();

    const padMat = new C_ENGINE.MeshStandardMaterial({
      map: padTex,
      color: 0xdff2d8,
      roughness: 0.68,
      metalness: 0.02,
      side: C_ENGINE.DoubleSide
    });
    const padMatLight = new C_ENGINE.MeshStandardMaterial({
      map: padTex,
      color: 0xeef8e2,
      roughness: 0.66,
      metalness: 0.02,
      side: C_ENGINE.DoubleSide
    });

    const padSpecs = [
      // 북서 군락
      { x: cx - 3.6, z: cz + 4.4, r: 0.54, rot: 0.4, flower: 'pink' },
      { x: cx - 2.6, z: cz + 5.1, r: 0.44, rot: 1.8 },
      { x: cx - 4.2, z: cz + 3.2, r: 0.48, rot: 2.9, flower: 'white' },
      { x: cx - 3.1, z: cz + 3.8, r: 0.36, rot: 4.1 },
      { x: cx - 2.0, z: cz + 5.8, r: 0.42, rot: 0.9, flower: 'pink' },
      // 북동 군락
      { x: cx + 2.8, z: cz + 4.8, r: 0.54, rot: 2.2, flower: 'white' },
      { x: cx + 3.8, z: cz + 3.9, r: 0.46, rot: 5.1 },
      { x: cx + 2.1, z: cz + 5.7, r: 0.4, rot: 1.1, flower: 'pink' },
      { x: cx + 4.3, z: cz + 2.6, r: 0.45, rot: 3.4 },
      { x: cx + 1.4, z: cz + 6.3, r: 0.38, rot: 0.6 },
      // 남서 군락
      { x: cx - 3.4, z: cz - 4.5, r: 0.52, rot: 1.5, flower: 'pink' },
      { x: cx - 2.4, z: cz - 5.4, r: 0.43, rot: 3.7 },
      { x: cx - 4.2, z: cz - 3.3, r: 0.47, rot: 0.2, flower: 'white' },
      { x: cx - 1.7, z: cz - 6.1, r: 0.39, rot: 2.6 },
      // 남동 군락
      { x: cx + 3.1, z: cz - 4.7, r: 0.52, rot: 4.4, flower: 'pink' },
      { x: cx + 4.0, z: cz - 3.7, r: 0.44, rot: 0.8, flower: 'white' },
      { x: cx + 2.2, z: cz - 5.8, r: 0.42, rot: 2.1 },
      { x: cx + 1.2, z: cz - 6.4, r: 0.36, rot: 5.5, flower: 'pink' }
    ];

    const pinkPetalMat = new C_ENGINE.MeshStandardMaterial({
      color: 0xf698b8,
      emissive: new C_ENGINE.Color(0x6e1a3a),
      emissiveIntensity: 0.2,
      roughness: 0.46,
      side: C_ENGINE.DoubleSide
    });
    const whitePetalMat = new C_ENGINE.MeshStandardMaterial({
      color: 0xfff9fa,
      emissive: new C_ENGINE.Color(0x524246),
      emissiveIntensity: 0.16,
      roughness: 0.45,
      side: C_ENGINE.DoubleSide
    });
    const stamenMat = new C_ENGINE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: new C_ENGINE.Color(0xd97706),
      emissiveIntensity: 0.3,
      roughness: 0.5
    });
    const petalGeo = new C_ENGINE.ConeGeometry(0.088, 0.25, 6);
    const stamenGeo = new C_ENGINE.SphereGeometry(0.068, 8, 6);

    padSpecs.forEach((spec, idx) => {
      const padGroup = new C_ENGINE.Group();
      padGroup.position.set(spec.x, waterY + 0.016, spec.z);
      padGroup.rotation.y = spec.rot;
      padGroup.userData.dynamic = true;

      const padMesh = new C_ENGINE.Mesh(padGeo, idx % 2 === 0 ? padMat : padMatLight);
      padMesh.scale.setScalar(spec.r);
      padMesh.receiveShadow = true;
      padGroup.add(padMesh);

      if (spec.flower) {
        const flowerGroup = new C_ENGINE.Group();
        flowerGroup.position.set(spec.r * 0.2, 0.04, 0);
        const pMat = spec.flower === 'pink' ? pinkPetalMat : whitePetalMat;

        for (let ring = 0; ring < 2; ring++) {
          const count = ring === 0 ? 8 : 6;
          const tilt = ring === 0 ? 0.94 : 0.5;
          const dist = ring === 0 ? 0.115 : 0.06;
          for (let p = 0; p < count; p++) {
            const a = (p / count) * Math.PI * 2 + ring * 0.38;
            const petal = new C_ENGINE.Mesh(petalGeo, pMat);
            petal.position.set(Math.cos(a) * dist, 0.06, Math.sin(a) * dist);
            petal.rotation.order = 'YXZ';
            petal.rotation.y = -a + Math.PI * 0.5;
            petal.rotation.x = tilt;
            flowerGroup.add(petal);
          }
        }
        const center = new C_ENGINE.Mesh(stamenGeo, stamenMat);
        center.position.y = 0.095;
        flowerGroup.add(center);
        padGroup.add(flowerGroup);
      }

      group.add(padGroup);
      this.lotusPads.push({ group: padGroup, baseY: waterY + 0.016, phase: idx * 0.8 });
    });
  }

  buildCheongpungBridge(group) {
    const m = this.materials;
    const br = YEONHWAJI_CONFIG.bridge;
    const bridgeGroup = new C_ENGINE.Group();
    bridgeGroup.name = 'CheongpungBridge';

    const span = br.maxX - br.minX;
    const plankCount = 44;
    const dxStep = span / plankCount;

    // 0. 다리 양 끝 화강암 석축 교대(橋臺)
    for (const endX of [br.minX - 0.15, br.maxX + 0.15]) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.75, 0.42, br.deckWidth + 0.45, 2, 0.03),
        m.matStone,
        bridgeGroup,
        { pos: [endX, -0.96, br.centerZ], tone: 0.91 }
      );
    }

    // 1. 아치형 상판 널빤지 및 좌·우 홍예 들보
    for (let i = 0; i < plankCount; i++) {
      const px = br.minX + (i + 0.5) * dxStep;
      const py = getCheongpungBridgeY(px);
      const yPrev = getCheongpungBridgeY(px - dxStep * 0.5);
      const yNext = getCheongpungBridgeY(px + dxStep * 0.5);
      const slopeAngle = Math.atan2(yNext - yPrev, dxStep);

      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(dxStep - 0.03, 0.12, br.deckWidth, 2, 0.015),
        m.matFloorWood,
        bridgeGroup,
        {
          pos: [px, py - 0.06, br.centerZ],
          rot: [0, 0, slopeAngle],
          tone: 0.92 + (i % 5) * 0.025
        }
      );

      for (const zBeam of [br.centerZ - 1.08, br.centerZ + 1.08]) {
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(dxStep + 0.02, 0.22, 0.2, 2, 0.015),
          m.matDarkTimber,
          bridgeGroup,
          {
            pos: [px, py - 0.21, zBeam],
            rot: [0, 0, slopeAngle],
            tone: 0.9
          }
        );
      }
    }

    // 2. 수중 화강암 교각 (2개소 — 주춧돌 + 팔각 돌기둥 + 석재 멍에보)
    for (const pierX of br.pierXs) {
      const deckY = getCheongpungBridgeY(pierX);
      const colH = deckY - 0.18 - YEONHWAJI_CONFIG.bedY;
      const colCenterY = YEONHWAJI_CONFIG.bedY + colH * 0.5;
      for (const zPier of [br.centerZ - 1.05, br.centerZ + 1.05]) {
        m.createMesh(
          new C_ENGINE.CylinderGeometry(0.24, 0.31, colH, 8),
          m.matStone,
          bridgeGroup,
          { pos: [pierX, colCenterY, zPier], tone: 0.88 }
        );
        m.createMesh(
          new C_ENGINE.CylinderGeometry(0.42, 0.48, 0.24, 8),
          m.matStone,
          bridgeGroup,
          { pos: [pierX, YEONHWAJI_CONFIG.bedY + 0.12, zPier], tone: 0.84 }
        );
      }
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.42, 0.24, 2.65, 2, 0.02),
        m.matStone,
        bridgeGroup,
        { pos: [pierX, deckY - 0.29, br.centerZ], tone: 0.92 }
      );
    }

    // 3. 전통 계자난간 (상단 붉은 난간대 · 중단 옥빛 난간대 · 하엽동자 살대)
    const railSteps = 22;
    const railDx = (span - 0.4) / railSteps;
    for (const zRail of [br.centerZ - 1.24, br.centerZ + 1.24]) {
      for (let i = 0; i < railSteps; i++) {
        const rx0 = br.minX + 0.2 + i * railDx;
        const rx1 = rx0 + railDx;
        const rxMid = (rx0 + rx1) * 0.5;
        const y0 = getCheongpungBridgeY(rx0);
        const y1 = getCheongpungBridgeY(rx1);
        const yMid = (y0 + y1) * 0.5;
        const slope = Math.atan2(y1 - y0, railDx);
        const segLen = Math.hypot(railDx, y1 - y0) + 0.02;

        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(segLen, 0.1, 0.13, 2, 0.015),
          m.matDancheongRed,
          bridgeGroup,
          { pos: [rxMid, yMid + 0.8, zRail], rot: [0, 0, slope] }
        );
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(segLen, 0.08, 0.09, 2, 0.012),
          m.matDancheongJade,
          bridgeGroup,
          { pos: [rxMid, yMid + 0.44, zRail], rot: [0, 0, slope] }
        );
        // 수직 동자주 + 하엽 장식판
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.08, 0.78, 0.08, 2, 0.01),
          m.matTimber,
          bridgeGroup,
          { pos: [rx0, y0 + 0.39, zRail], tone: 0.95 }
        );
        if (i % 2 === 1) {
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(0.22, 0.28, 0.05, 2, 0.01),
            m.matDancheongRed,
            bridgeGroup,
            { pos: [rxMid, yMid + 0.22, zRail] }
          );
        }
      }
    }

    // 4. 다리 양 끝 및 중앙 엄지기둥 + 연봉 장식 + 처마형 교량 초롱불
    const newelXs = [br.minX + 0.2, (br.minX + br.maxX) * 0.5, br.maxX - 0.2];
    for (const nx of newelXs) {
      const ny = getCheongpungBridgeY(nx);
      const isEnd = nx < br.minX + 1 || nx > br.maxX - 1;
      for (const zRail of [br.centerZ - 1.24, br.centerZ + 1.24]) {
        // 북측 중앙은 '淸 風 橋' 현판 좌·우 쌍기둥으로 대체하여 가운데 '風' 글자 가림 방지
        if (!isEnd && zRail < br.centerZ) continue;
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(0.2, 1.12, 0.2, 2, 0.02),
          m.matDarkTimber,
          bridgeGroup,
          { pos: [nx, ny + 0.54, zRail], tone: 0.96 }
        );
        if (isEnd) {
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(0.28, 0.06, 0.28, 2, 0.01),
            m.matDarkTimber,
            bridgeGroup,
            { pos: [nx, ny + 1.11, zRail] }
          );
          m.createMesh(
            new C_ENGINE.RoundedBoxGeometry(0.24, 0.3, 0.24, 2, 0.02),
            m.matWarmHanji,
            bridgeGroup,
            { pos: [nx, ny + 1.27, zRail], castShadow: false }
          );
          m.createMesh(
            new C_ENGINE.ConeGeometry(0.28, 0.16, 4),
            m.matRealisticGiwa,
            bridgeGroup,
            { pos: [nx, ny + 1.49, zRail], rot: [0, Math.PI * 0.25, 0] }
          );
          m.createMesh(
            new C_ENGINE.SphereGeometry(0.05, 8, 6),
            m.matBronze,
            bridgeGroup,
            { pos: [nx, ny + 1.59, zRail] }
          );
        } else {
          // 남측 중앙 엄지기둥 황동 연꽃 봉오리(연봉) 장식
          m.createMesh(
            new C_ENGINE.CylinderGeometry(0.13, 0.11, 0.07, 10),
            m.matBronze,
            bridgeGroup,
            { pos: [nx, ny + 1.12, zRail] }
          );
          m.createMesh(
            new C_ENGINE.SphereGeometry(0.115, 12, 10),
            m.matBronze,
            bridgeGroup,
            { pos: [nx, ny + 1.24, zRail], scale: [1, 1.32, 1] }
          );
        }
      }
    }

    // 5. 청풍교(淸 風 橋) 현판 및 좌·우 쌍기둥 프레임 (북측 중앙, 세 글자 완전 무가림 노출)
    const centerX = (br.minX + br.maxX) * 0.5;
    const centerY = getCheongpungBridgeY(centerX);
    const northRailZ = br.centerZ - 1.24;
    for (const dxPost of [-0.86, 0.86]) {
      const px = centerX + dxPost;
      const py = getCheongpungBridgeY(px);
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.16, 1.44, 0.16, 2, 0.02),
        m.matDarkTimber,
        bridgeGroup,
        { pos: [px, py + 0.72, northRailZ], tone: 0.96 }
      );
      m.createMesh(
        new C_ENGINE.SphereGeometry(0.095, 10, 8),
        m.matBronze,
        bridgeGroup,
        { pos: [px, py + 1.5, northRailZ], scale: [1, 1.28, 1] }
      );
    }
    // 현판 상단 보호 갓(처마)
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(1.94, 0.09, 0.28, 2, 0.015),
      m.matDarkTimber,
      bridgeGroup,
      { pos: [centerX, centerY + 1.44, northRailZ] }
    );
    const plaqueTex = this.createPlaqueTexture('淸 風 橋');
    const plaqueMat = new C_ENGINE.MeshStandardMaterial({
      map: plaqueTex,
      roughness: 0.55,
      metalness: 0.06
    });
    const plaqueMesh = new C_ENGINE.Mesh(
      new C_ENGINE.RoundedBoxGeometry(1.56, 0.48, 0.09, 2, 0.015),
      plaqueMat
    );
    plaqueMesh.position.set(centerX, centerY + 1.16, northRailZ);
    bridgeGroup.add(plaqueMesh);

    // 6. 청풍교는 자연광(Hemisphere + DirectionalLight)으로 표현 (PointLight 절감)
    group.add(bridgeGroup);
  }

  createPlaqueTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2b1b12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#c89b54';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.fillStyle = '#f5dfb3';
    ctx.font = 'bold 74px "Noto Serif KR", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width * 0.5, canvas.height * 0.52);
    const tex = new C_ENGINE.CanvasTexture(canvas);
    tex.colorSpace = C_ENGINE.SRGBColorSpace;
    return tex;
  }

  buildSwimmingFish(group) {
    const { cx, cz, rx, rz, bedY } = YEONHWAJI_CONFIG;
    const fishCount = this.isMobile ? 12 : 18;

    const koiMats = [0, 1, 2, 3].map((vIdx) => {
      const tex = this.createKoiTexture(vIdx);
      const emissives = [0x6e1a0c, 0x724204, 0x692608, 0x3b4252];
      return {
        body: new C_ENGINE.MeshStandardMaterial({
          map: tex,
          emissive: new C_ENGINE.Color(emissives[vIdx]),
          emissiveIntensity: 0.42,
          roughness: 0.28,
          metalness: 0.08
        }),
        fin: new C_ENGINE.MeshStandardMaterial({
          color: vIdx === 1 ? 0xfde68a : 0xffcbb8,
          emissive: new C_ENGINE.Color(emissives[vIdx]),
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.86,
          roughness: 0.35,
          side: C_ENGINE.DoubleSide
        })
      };
    });

    const bodyGeo = new C_ENGINE.SphereGeometry(1, 14, 10);
    const tailGeo = new C_ENGINE.ConeGeometry(0.12, 0.28, 4);
    tailGeo.rotateX(Math.PI * 0.5);
    const dorsalGeo = new C_ENGINE.ConeGeometry(0.036, 0.19, 4);
    dorsalGeo.rotateX(-Math.PI * 0.32);
    const pecGeo = new C_ENGINE.PlaneGeometry(0.14, 0.08);
    pecGeo.rotateX(-Math.PI * 0.5);
    const eyeGeo = new C_ENGINE.SphereGeometry(0.022, 6, 6);
    const eyeMat = new C_ENGINE.MeshBasicMaterial({ color: 0x111827 });

    const shadowGeo = new C_ENGINE.CircleGeometry(0.28, 12);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new C_ENGINE.MeshBasicMaterial({
      color: 0x0b1615,
      transparent: true,
      opacity: 0.26,
      depthWrite: false
    });

    for (let i = 0; i < fishCount; i++) {
      const matSet = koiMats[i % koiMats.length];
      const fishGroup = new C_ENGINE.Group();
      fishGroup.userData.dynamic = true;
      const fishScale = 0.88 + (i % 4) * 0.16;
      fishGroup.scale.setScalar(fishScale);

      const bodyMesh = new C_ENGINE.Mesh(bodyGeo, matSet.body);
      bodyMesh.scale.set(0.115, 0.1, 0.34);
      fishGroup.add(bodyMesh);

      const dorsal = new C_ENGINE.Mesh(dorsalGeo, matSet.fin);
      dorsal.position.set(0, 0.095, -0.02);
      fishGroup.add(dorsal);

      // 좌·우 가슴지느러미
      const leftFin = new C_ENGINE.Mesh(pecGeo, matSet.fin);
      leftFin.position.set(-0.12, -0.02, 0.08);
      leftFin.rotation.y = 0.45;
      fishGroup.add(leftFin);

      const rightFin = new C_ENGINE.Mesh(pecGeo, matSet.fin);
      rightFin.position.set(0.12, -0.02, 0.08);
      rightFin.rotation.y = -0.45;
      fishGroup.add(rightFin);

      for (const side of [-1, 1]) {
        const eye = new C_ENGINE.Mesh(eyeGeo, eyeMat);
        eye.position.set(side * 0.068, 0.032, 0.22);
        fishGroup.add(eye);
      }

      const tailPivot = new C_ENGINE.Group();
      tailPivot.position.set(0, 0, -0.27);
      const tailMesh = new C_ENGINE.Mesh(tailGeo, matSet.fin);
      tailMesh.scale.set(0.46, 1.2, 1.05);
      tailMesh.position.set(0, 0, -0.12);
      tailPivot.add(tailMesh);
      fishGroup.add(tailPivot);

      // 수중 바닥 그림자
      const shadowMesh = new C_ENGINE.Mesh(shadowGeo, shadowMat);
      shadowMesh.position.set(cx, bedY + 0.025, cz);
      shadowMesh.scale.set(fishScale * 0.75, 1, fishScale * 1.45);
      group.add(shadowMesh);

      const orbitRx = rx * (0.26 + ((i * 19) % 50) / 100);
      const orbitRz = rz * (0.26 + ((i * 23) % 52) / 100);
      const baseDepth = -1.14 - (i % 5) * 0.09;
      const dir = i % 2 === 0 ? 1 : -1;

      group.add(fishGroup);
      this.fishList.push({
        group: fishGroup,
        bodyMesh,
        tailPivot,
        leftFin,
        rightFin,
        shadowMesh,
        cx,
        cz,
        orbitRx,
        orbitRz,
        baseDepth,
        speed: (0.23 + (i % 4) * 0.055) * dir,
        phase: (i / fishCount) * Math.PI * 2,
        wobbleAmp: 0.42 + (i % 3) * 0.24,
        tailSpeed: 7.8 + (i % 4) * 1.4
      });
    }
  }

  buildLakesidePathsAndBench(group) {
    const m = this.materials;
    const { cx, cz, rx, rz, bridge } = YEONHWAJI_CONFIG;

    // 1. 중앙 마당(x=16.5) -> 청풍교 서쪽 입구(x=20.4) 연결 박석길
    for (let i = 0; i < 6; i++) {
      const px = 16.6 + i * 0.72;
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.64, 0.075, 2.25 + (i % 2) * 0.2, 2, 0.02),
        m.matStone,
        group,
        { pos: [px, -0.795, bridge.centerZ], tone: 0.92 + (i % 3) * 0.03 }
      );
    }

    // 2. 연못 동쪽 호안(x=36.6 ~ 38.6) 산책 박석
    for (let i = -5; i <= 5; i++) {
      const pz = cz + i * 1.42;
      const px = cx + rx + 1.55 + Math.cos(i * 0.4) * 0.25;
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(1.15, 0.07, 1.05, 2, 0.02),
        m.matStone,
        group,
        { pos: [px, -0.795, pz], rot: [0, (i % 2) * 0.05, 0], tone: 0.93 }
      );
    }

    // 북측·남측 연못 둘레 징검돌
    for (const zSign of [-1, 1]) {
      for (let i = -3; i <= 3; i++) {
        const px = cx + i * 1.75;
        const pz = cz + zSign * (rz + 1.45) - zSign * Math.abs(i) * 0.14;
        m.createMesh(
          new C_ENGINE.RoundedBoxGeometry(1.12, 0.07, 0.92, 2, 0.02),
          m.matStone,
          group,
          { pos: [px, -0.795, pz], tone: 0.92 + (Math.abs(i) % 3) * 0.025 }
        );
      }
    }

    // 동쪽 언덕 쉼터 목조 벤치 (x=38.2, z=-1.2)
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(0.62, 0.09, 2.4, 2, 0.02),
      m.matTimber,
      group,
      { pos: [38.2, -0.36, -1.2], tone: 0.95 }
    );
    for (const dz of [-0.92, 0.92]) {
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.52, 0.42, 0.14, 2, 0.015),
        m.matStone,
        group,
        { pos: [38.2, -0.6, -1.2 + dz], tone: 0.9 }
      );
    }

    // 동쪽 호안 작은 화강암 석등 (x=37.6, z=-8.2)
    this.buildSmallGardenStoneLantern(group, 37.6, -0.78, -8.2);
  }

  buildSmallGardenStoneLantern(parent, x, y, z) {
    const m = this.materials;
    const lg = new C_ENGINE.Group();
    lg.position.set(x, y, z);

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

    parent.add(lg);
  }

  update(elapsed, _dt) {
    this.waterTimeUniform.value = elapsed;

    // 1. 코이 비단잉어 S자 유영 및 바닥 그림자 동기화
    for (const f of this.fishList) {
      const t = elapsed * f.speed + f.phase;
      const tNext = t + 0.03 * Math.sign(f.speed);

      const calcPos = (ang) => ({
        x: f.cx + Math.cos(ang) * f.orbitRx + Math.sin(ang * 2.0) * f.wobbleAmp,
        z: f.cz + Math.sin(ang) * f.orbitRz + Math.cos(ang * 1.5) * f.wobbleAmp * 0.6
      });

      const p0 = calcPos(t);
      const p1 = calcPos(tNext);
      const y = f.baseDepth + Math.sin(elapsed * 1.35 + f.phase) * 0.055;
      const heading = Math.atan2(p1.x - p0.x, p1.z - p0.z);

      f.group.position.set(p0.x, y, p0.z);
      f.group.rotation.y = heading;

      const wag = Math.sin(elapsed * f.tailSpeed + f.phase);
      f.bodyMesh.rotation.y = -wag * 0.09;
      f.tailPivot.rotation.y = wag * 0.46;
      f.leftFin.rotation.y = 0.45 + wag * 0.16;
      f.rightFin.rotation.y = -0.45 + wag * 0.16;

      f.shadowMesh.position.x = p0.x + 0.12;
      f.shadowMesh.position.z = p0.z + 0.12;
      f.shadowMesh.rotation.y = heading;
    }

    // 2. 수면 파문 링 확산
    for (const r of this.ripples) {
      const cycle = ((elapsed * r.speed + r.phase) % 2.4) / 2.4;
      const s = 0.6 + cycle * 3.8;
      r.mesh.scale.setScalar(s);
      r.mat.opacity = Math.max(0, (1 - cycle) * 0.34);
    }

    // 3. 연잎 잔잔한 일렁임
    for (const pad of this.lotusPads) {
      pad.group.position.y = pad.baseY + Math.sin(elapsed * 1.2 + pad.phase) * 0.008;
    }
  }
}
