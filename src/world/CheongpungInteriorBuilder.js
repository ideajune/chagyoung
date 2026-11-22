/**
 * CheongpungInteriorBuilder — 청풍사 내부 「청풍수경(淸風水鏡) · 먹빛 차경」 3D 빌더
 * - 검은 현무암 사각 거울 수반(실시간 동심원 파문 셰이더 + 달항아리 수면 반사)
 * - 순백 조선 달항아리(LatheGeometry 백자 유약) 및 현무암 좌대
 * - 8폭 역광 한지 수묵 산수화 병풍(실시간 흐르는 운해 셰이더)
 * - 천창 수직 빛기둥(Sunbeam) 및 부유 빛 먼지 입자(InstancedMesh)
 */

import { MURYANGSUJEON_CONFIG } from '../config/worldConfig.js';

import { SANSA_CORE as C_ENGINE } from '../engine/CoreRuntime.js';

export class CheongpungInteriorBuilder {
  constructor(materials, isMobile = false) {
    this.materials = materials;
    this.isMobile = Boolean(isMobile);
    this.timeUniform = { value: 0 };
    this.dustInst = null;
    this.dustData = [];
    this.dustDummy = new C_ENGINE.Object3D();
    this.sunbeamMat = null;
    this.indoorCushionEntries = [];
    this.sumieTex = null;
  }

  build(sanctGroup, floorY = MURYANGSUJEON_CONFIG.interior.floorY) {
    const group = new C_ENGINE.Group();
    group.name = 'CheongpungZenInterior';

    this.buildBacklitSumieFoldingScreen(group, floorY);
    this.buildMirrorWaterBasinAndMoonJar(group, floorY);
    this.buildIndoorMeditationCushions(group, floorY);
    this.buildSkylightSunbeamAndDust(group, floorY);

    sanctGroup.add(group);
    return group;
  }

  /**
   * 후면 전체 폭(12폭) 역광 한지 수묵 산수화 캔버스 텍스처 (1536x512)
   */
  createSumieScreenTexture() {
    const w = 1536;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // 1. 따뜻한 역광 한지 바탕
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.58, 40, w * 0.5, h * 0.52, w * 0.62);
    bgGrad.addColorStop(0, '#fbf0d4');
    bgGrad.addColorStop(0.55, '#eed7aa');
    bgGrad.addColorStop(1, '#cfa972');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 한지 미세 섬유결
    ctx.fillStyle = 'rgba(130, 96, 52, 0.035)';
    for (let i = 0; i < 600; i++) {
      const fx = (i * 173) % w;
      const fy = (i * 97) % h;
      ctx.fillRect(fx, fy, 12 + (i % 18), 1.5);
    }

    // 2. 좌측 상단 은은한 보름달
    const moonX = w * 0.26;
    const moonY = h * 0.21;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 64);
    moonGlow.addColorStop(0, 'rgba(255, 252, 240, 0.92)');
    moonGlow.addColorStop(0.42, 'rgba(255, 248, 224, 0.52)');
    moonGlow.addColorStop(1, 'rgba(255, 244, 210, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 64, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 253, 244, 0.88)';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 24, 0, Math.PI * 2);
    ctx.fill();

    // 3. 원경 산맥 (연한 담묵)
    const drawMountainLayer = (pts, fillStyle) => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (const [px, py] of pts) {
        ctx.lineTo(px * w, py * h);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.fill();
    };

    const farGrad = ctx.createLinearGradient(0, h * 0.16, 0, h * 0.85);
    farGrad.addColorStop(0, 'rgba(88, 82, 72, 0.42)');
    farGrad.addColorStop(0.65, 'rgba(130, 120, 104, 0.16)');
    farGrad.addColorStop(1, 'rgba(235, 214, 172, 0)');
    drawMountainLayer(
      [
        [0.0, 0.58], [0.09, 0.40], [0.18, 0.49], [0.30, 0.32],
        [0.42, 0.46], [0.56, 0.26], [0.68, 0.44], [0.80, 0.34],
        [0.91, 0.48], [1.0, 0.42]
      ],
      farGrad
    );

    // 4. 중경 주봉 (중앙 웅장한 바위산 · 수묵 준법 느낌)
    const midGrad = ctx.createLinearGradient(0, h * 0.22, 0, h * 0.88);
    midGrad.addColorStop(0, 'rgba(54, 50, 44, 0.66)');
    midGrad.addColorStop(0.55, 'rgba(84, 78, 68, 0.34)');
    midGrad.addColorStop(1, 'rgba(230, 206, 162, 0)');
    drawMountainLayer(
      [
        [0.0, 0.72], [0.07, 0.46], [0.15, 0.62], [0.36, 0.66],
        [0.47, 0.44], [0.53, 0.28], [0.59, 0.24], [0.65, 0.42],
        [0.74, 0.64], [0.88, 0.56], [1.0, 0.68]
      ],
      midGrad
    );

    // 5. 허리춤을 감싸는 부드러운 수묵 운해(안개 띠)
    for (let i = 0; i < 6; i++) {
      const mx = w * (0.12 + i * 0.16);
      const my = h * (0.64 + Math.sin(i * 1.4) * 0.06);
      const mg = ctx.createRadialGradient(mx, my, 12, mx, my, 150);
      mg.addColorStop(0, 'rgba(252, 240, 212, 0.68)');
      mg.addColorStop(1, 'rgba(252, 240, 212, 0)');
      ctx.fillStyle = mg;
      ctx.fillRect(mx - 150, my - 70, 300, 140);
    }

    // 6. 근경 좌측 먹빛 소나무 군락
    const drawInkPine = (bx, by, scale) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(scale, scale);
      ctx.strokeStyle = 'rgba(42, 37, 32, 0.82)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-14, -46, 8, -96);
      ctx.stroke();

      // 가지 및 솔잎 뭉치
      const canopies = [
        [-22, -62, 28, 10],
        [18, -74, 30, 11],
        [-6, -98, 36, 13],
        [24, -48, 22, 9]
      ];
      ctx.fillStyle = 'rgba(46, 44, 38, 0.74)';
      for (const [cx, cy, rx, ry] of canopies) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, -0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    drawInkPine(w * 0.21, h * 0.94, 1.35);
    drawInkPine(w * 0.29, h * 0.96, 1.15);
    drawInkPine(w * 0.37, h * 0.98, 0.88);
    drawInkPine(w * 0.82, h * 0.95, 0.92);

    // 하단 암반 실루엣
    const lowGrad = ctx.createLinearGradient(0, h * 0.78, 0, h);
    lowGrad.addColorStop(0, 'rgba(62, 56, 48, 0.42)');
    lowGrad.addColorStop(1, 'rgba(38, 34, 28, 0.68)');
    drawMountainLayer(
      [[0, 0.86], [0.16, 0.79], [0.34, 0.88], [0.55, 0.95], [0.76, 0.9], [1, 0.84]],
      lowGrad
    );

    const tex = new C_ENGINE.CanvasTexture(canvas);
    tex.colorSpace = C_ENGINE.SRGBColorSpace;

    // 워크스페이스의 실제 '청광사 내부 이미지.jpg'에서 8폭 역광 한지 수묵 병풍 전체 높이를 정밀 크롭하여 그대로 투영
    try {
      const refImg = new Image();
      refImg.crossOrigin = 'anonymous';
      refImg.onload = () => {
        const iw = refImg.naturalWidth || refImg.width;
        const ih = refImg.naturalHeight || refImg.height;
        if (!iw || !ih) return;

        // 좌·우 전경 기둥 그림자(28%~33.4%, 66.6%~72%)를 완전히 제외한 순수 역광 수묵 산수화 영역(x: 33.4%~66.6%)만 정밀 크롭
        const sx = iw * 0.335;
        const sy = ih * 0.352;
        const sw = iw * 0.330;
        const sh = ih * 0.292;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(refImg, sx, sy, sw, sh, 0, 0, w, h);

        // 하단 중앙 달항아리 겹침 소영역만 바로 우측 한지 역광 영역으로 자연스럽게 클론 패치
        const patchX = Math.round(w * 0.435);
        const patchW = Math.round(w * 0.130);
        const patchY = Math.round(h * 0.80);
        const patchH = h - patchY;
        ctx.drawImage(
          refImg,
          sx + sw * 0.58,
          sy + sh * 0.80,
          sw * 0.130,
          sh * 0.20,
          patchX,
          patchY,
          patchW,
          patchH
        );

        tex.needsUpdate = true;
      };
      refImg.src = encodeURI('청광사 내부 이미지.jpg');
    } catch {
      // 오프라인/폴백 시 절차적 수묵 텍스처 유지
    }

    return tex;
  }

  buildBacklitSumieFoldingScreen(group, floorY) {
    const m = this.materials;
    const screenGroup = new C_ENGINE.Group();
    screenGroup.name = 'SumieFoldingScreen';

    // 크롭된 순수 6폭 수묵 산수화(33.5%~66.5%)와 1:1 일치하는 6폭 후면 전체 병풍 (중간 이중 경계·돌출 연결부 완전 제거)
    const panelCount = 6;
    const totalW = 27.2;
    const panelW = totalW / panelCount;
    const panelH = 6.45;
    const baseZ = MURYANGSUJEON_CONFIG.interior.screenZ;
    const zigZ = 0.08;

    const sumieTex = this.createSumieScreenTexture();
    this.sumieTex = sumieTex;
    const screenMat = new C_ENGINE.MeshStandardMaterial({
      map: sumieTex,
      color: 0xfaf4e8,
      emissive: new C_ENGINE.Color(0xffe2b2),
      emissiveMap: sumieTex,
      emissiveIntensity: 0.78,
      roughness: 0.88,
      metalness: 0.0
    });

    // 살아 움직이는 수묵 운해(안개) & 은은한 역광 호흡 셰이더
    screenMat.onBeforeCompile = (shader) => {
      shader.uniforms.uZenTime = this.timeUniform;
      shader.vertexShader =
        `varying vec2 vScreenUv;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\n vScreenUv = uv;`
        );
      shader.fragmentShader =
        `uniform float uZenTime;\nvarying vec2 vScreenUv;\n` +
        shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           float mistBand = smoothstep(0.18, 0.48, vScreenUv.y) * (1.0 - smoothstep(0.50, 0.78, vScreenUv.y));
           float drift1 = sin(vScreenUv.x * 11.0 - uZenTime * 0.24) * 0.5 + 0.5;
           float drift2 = cos(vScreenUv.x * 18.0 + uZenTime * 0.17 + vScreenUv.y * 5.0) * 0.5 + 0.5;
           float mist = mistBand * (drift1 * 0.6 + drift2 * 0.4);
           float breath = 0.94 + 0.06 * sin(uZenTime * 0.65);
           totalEmissiveRadiance = totalEmissiveRadiance * breath + vec3(0.14, 0.11, 0.07) * mist;`
        );
    };
    screenMat.customProgramCacheKey = () => 'cheongpung-sumie-screen-v1';

    const frameMat = m.matDarkTimber;
    const frameThick = 0.048;

    for (let i = 0; i < panelCount; i++) {
      const x0 = -totalW * 0.5 + i * panelW;
      const x1 = x0 + panelW;
      const z0 = baseZ + (i % 2 === 0 ? -zigZ : zigZ);
      const z1 = baseZ + ((i + 1) % 2 === 0 ? -zigZ : zigZ);
      const midX = (x0 + x1) * 0.5;
      const midZ = (z0 + z1) * 0.5;
      const segW = Math.hypot(x1 - x0, z1 - z0);
      const yaw = Math.atan2(z1 - z0, x1 - x0);

      const panelGeo = new C_ENGINE.PlaneGeometry(segW - 0.05, panelH - 0.1);
      // 8폭 전체가 하나의 연속된 산수화로 이어지도록 UV 분할 매핑 (남쪽 -Z 방향을 바라보도록 Math.PI 회전)
      const uvAttr = panelGeo.getAttribute('uv');
      const uLeft = i / panelCount;
      const uRight = (i + 1) / panelCount;
      for (let k = 0; k < uvAttr.count; k++) {
        const u = uvAttr.getX(k);
        // 회전(rotation.y = PI) 시 좌우 반전 보정: u=0이 오른쪽, u=1이 왼쪽이므로 1-u 매핑
        uvAttr.setX(k, uRight + (uLeft - uRight) * u);
      }
      uvAttr.needsUpdate = true;

      const panelHolder = new C_ENGINE.Group();
      panelHolder.position.set(midX, floorY + panelH * 0.5 + 0.02, midZ);
      panelHolder.rotation.y = Math.PI - yaw;

      const paperMesh = new C_ENGINE.Mesh(panelGeo, screenMat);
      panelHolder.add(paperMesh);

      // 병풍 목조 테두리 프레임 (상·하부 및 1:1 단일 세로 문선만 깔끔하게 배치하여 중복 연결부 제거)
      const topBar = new C_ENGINE.Mesh(
        new C_ENGINE.BoxGeometry(segW, frameThick, 0.04),
        frameMat
      );
      topBar.position.y = panelH * 0.5 - frameThick * 0.5;
      panelHolder.add(topBar);

      const botBar = new C_ENGINE.Mesh(
        new C_ENGINE.BoxGeometry(segW, frameThick * 1.4, 0.045),
        frameMat
      );
      botBar.position.y = -panelH * 0.5 + frameThick * 0.7;
      panelHolder.add(botBar);

      if (i === 0) {
        const leftEdge = new C_ENGINE.Mesh(
          new C_ENGINE.BoxGeometry(frameThick, panelH, 0.04),
          frameMat
        );
        leftEdge.position.x = segW * 0.5 - frameThick * 0.5;
        panelHolder.add(leftEdge);
      }
      const rightEdge = new C_ENGINE.Mesh(
        new C_ENGINE.BoxGeometry(frameThick, panelH, 0.04),
        frameMat
      );
      rightEdge.position.x = -(segW * 0.5 - frameThick * 0.5);
      panelHolder.add(rightEdge);

      screenGroup.add(panelHolder);
    }

    // 병풍 자체 발광(emissive)으로 간접광 연출 (PointLight 절감으로 전체 프레임률 향상)
    group.add(screenGroup);
  }

  buildMirrorWaterBasinAndMoonJar(group, floorY) {
    const basinCfg = MURYANGSUJEON_CONFIG.interior.basin;
    const basinGroup = new C_ENGINE.Group();
    basinGroup.name = 'MirrorBasinAndMoonJar';
    const centerZ = basinCfg.cz;
    const basinW = basinCfg.width;
    const basinD = basinCfg.depth;
    const rimH = 0.22;
    const rimThick = 0.18;

    // 1. 무광 검은 현무암 사각 수반 테두리 및 바닥
    const basaltMat = new C_ENGINE.MeshStandardMaterial({
      color: 0x222528,
      roughness: 0.84,
      metalness: 0.08
    });
    const innerFloorMat = new C_ENGINE.MeshStandardMaterial({
      color: 0x111517,
      roughness: 0.9,
      metalness: 0.05
    });

    const basinFloor = new C_ENGINE.Mesh(
      new C_ENGINE.BoxGeometry(basinW - 0.1, 0.06, basinD - 0.1),
      innerFloorMat
    );
    basinFloor.position.set(0, floorY + 0.03, centerZ);
    basinGroup.add(basinFloor);

    // 4면 현무암 연석
    const frontBackGeo = new C_ENGINE.RoundedBoxGeometry(basinW, rimH, rimThick, 2, 0.02);
    for (const zSign of [-1, 1]) {
      const rim = new C_ENGINE.Mesh(frontBackGeo, basaltMat);
      rim.position.set(0, floorY + rimH * 0.5, centerZ + zSign * (basinD * 0.5 - rimThick * 0.5));
      basinGroup.add(rim);
    }
    const leftRightGeo = new C_ENGINE.RoundedBoxGeometry(
      rimThick,
      rimH,
      basinD - rimThick * 2,
      2,
      0.02
    );
    for (const xSign of [-1, 1]) {
      const rim = new C_ENGINE.Mesh(leftRightGeo, basaltMat);
      rim.position.set(xSign * (basinW * 0.5 - rimThick * 0.5), floorY + rimH * 0.5, centerZ);
      basinGroup.add(rim);
    }

    // 2. 물리 기반 해석적 거울 반사(Ray-Plane Reflection) + 동심원 노멀 파동 흑옥 수면
    // - 카메라 시선과 동심원 물결 법선(N)으로 실제 반사광(R = reflect(-V, N))을 계산하여
    //   8폭 역광 한지 병풍(세로 문살 포함), 어두운 좌·우 벽/천장, 중앙 달항아리·좌대 실루엣을 실시간 거울 반사
    const waterY = floorY + rimH - 0.04;
    const waterGeo = new C_ENGINE.PlaneGeometry(basinW - rimThick * 1.9, basinD - rimThick * 1.9);
    waterGeo.rotateX(-Math.PI / 2);

    const mirrorWaterMat = new C_ENGINE.MeshStandardMaterial({
      color: 0x050505,
      emissive: new C_ENGINE.Color(0x000000),
      emissiveIntensity: 1.0,
      roughness: 0.04,
      metalness: 0.25,
      envMapIntensity: 0.45
    });

    const screenZ = MURYANGSUJEON_CONFIG.interior.screenZ;
    mirrorWaterMat.onBeforeCompile = (shader) => {
      shader.uniforms.uZenTime = this.timeUniform;
      shader.uniforms.uReflectMap = { value: this.sumieTex };
      shader.uniforms.uBasinCenter = { value: new C_ENGINE.Vector3(0, waterY, centerZ) };
      shader.uniforms.uScreenZ = { value: screenZ };

      shader.vertexShader =
        `varying vec3 vWaterWorldPos;\nvarying vec2 vBasinLocalUv;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vBasinLocalUv = uv;
           vWaterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );

      shader.fragmentShader =
        `uniform float uZenTime;
         uniform sampler2D uReflectMap;
         uniform vec3 uBasinCenter;
         uniform float uScreenZ;
         varying vec3 vWaterWorldPos;
         varying vec2 vBasinLocalUv;\n` +
        shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           vec2 p = (vBasinLocalUv - 0.5) * 2.0;
           float r = length(p);
           float ang = atan(p.y, p.x);
           vec2 rDir = r > 0.001 ? p / r : vec2(0.0, 1.0);

           // 첨부 원본 이미지와 동일한 중앙 좌대 주변 섬세한 동심원 파동 법선(N) — 가장자리로 갈수록 고요한 거울로 감쇠
           float rippleMask = smoothstep(0.18, 0.30, r) * (1.0 - smoothstep(0.56, 0.88, r));
           float orgR = r + 0.012 * sin(ang * 3.0 + r * 4.0) + 0.007 * cos(ang * 5.0 - uZenTime * 0.3);
           float dH = (
             cos(orgR * 44.0 - uZenTime * 1.15) * 0.72 +
             cos(orgR * 74.0 - uZenTime * 1.55 + ang * 2.0) * 0.28
           ) * rippleMask * 0.095;

           vec3 N = normalize(vec3(rDir.x * dH, 1.0, rDir.y * dH));
           vec3 V = normalize(cameraPosition - vWaterWorldPos);
           vec3 R = reflect(-V, N);

           // 1) 반사광선 R이 후면 8폭 역광 한지 병풍(z = uScreenZ)에 닿는 지점 계산
           vec3 reflCol = vec3(0.018, 0.016, 0.013);
           if (R.z > 0.02) {
             float tScr = (uScreenZ - vWaterWorldPos.z) / R.z;
             vec3 hitP = vWaterWorldPos + R * tScr;
             // 8폭 병풍(x ∈ [-13.6, 13.6], y ∈ [0.42, 5.87])
             float su = (hitP.x + 13.6) / 27.2;
             float sv = (hitP.y - 0.42) / 5.45;
             if (su >= 0.0 && su <= 1.0 && sv >= 0.0 && sv <= 1.0) {
               vec3 texCol = texture2D(uReflectMap, vec2(su, sv)).rgb;
               // 6폭 병풍 세로 목조 문살 반사
               float panelFrac = fract(su * 6.0);
               float mullion = smoothstep(0.0, 0.032, panelFrac) * smoothstep(0.0, 0.032, 1.0 - panelFrac);
               float edgeSoft = smoothstep(0.0, 0.08, su) * smoothstep(0.0, 0.08, 1.0 - su);
               // 따뜻한 흑옥-호박빛 거울 감쇠
               reflCol = texCol * mix(0.22, 1.0, mullion) * edgeSoft * vec3(0.62, 0.54, 0.41);
             }
           }

           // 2) 좌·우 검은 현무암 수반 테두리 근처의 깊은 칠흑 그림자(AO)
           float sideEdgeDark = smoothstep(0.0, 0.16, vBasinLocalUv.x) * smoothstep(0.0, 0.16, 1.0 - vBasinLocalUv.x);
           float fbEdgeDark = smoothstep(0.0, 0.10, vBasinLocalUv.y) * smoothstep(0.0, 0.10, 1.0 - vBasinLocalUv.y);
           reflCol *= mix(0.12, 1.0, sideEdgeDark * fbEdgeDark);

           // 3) 중앙 달항아리 및 사각 현무암 좌대의 일렁이는 흑옥 거울 반사 실루엣
           vec3 jarCenter = vec3(uBasinCenter.x, uBasinCenter.y + 0.92, uBasinCenter.z);
           vec3 oc = vWaterWorldPos - jarCenter;
           float bProj = dot(oc, R);
           if (bProj < 0.0) {
             vec3 closest = vWaterWorldPos - R * bProj;
             vec3 dJar = (closest - jarCenter) / vec3(0.68, 0.66, 0.68);
             float jarDist = length(dJar);
             if (jarDist < 1.05) {
               float jarMask = 1.0 - smoothstep(0.76, 1.02, jarDist);
               vec3 jarReflCol = vec3(0.24, 0.25, 0.23) * (0.75 + 0.25 * (1.0 - jarDist));
               reflCol = mix(reflCol, jarReflCol, jarMask * 0.82);
             }
           }
           // 좌대 바로 앞 짙은 그림자 반사
           float pedShadow = 1.0 - smoothstep(0.20, 0.36, max(abs(p.x) * 1.15, abs(p.y + 0.18) * 1.45));
           reflCol = mix(reflCol, vec3(0.04, 0.04, 0.04), pedShadow * 0.72);

           // 4) 물결 경사면의 은은한 프레넬 광택 (흰색 과발광 없이 따뜻한 흑옥 광택만)
           float fresnel = pow(1.0 - max(0.0, dot(N, V)), 3.2);
           totalEmissiveRadiance += reflCol * (0.78 + 0.42 * fresnel);`
        );
    };
    mirrorWaterMat.customProgramCacheKey = () => 'cheongpung-ray-mirror-water-v6';

    const waterMesh = new C_ENGINE.Mesh(waterGeo, mirrorWaterMat);
    waterMesh.position.set(0, waterY, centerZ);
    basinGroup.add(waterMesh);

    // 3. 중앙 현무암 좌대 (대형 6.4m 수반 비례에 맞춘 무광 흑현무암 정사각 좌대)
    const pedH = 0.28;
    const pedTopY = floorY + pedH;
    const pedestal = new C_ENGINE.Mesh(
      new C_ENGINE.RoundedBoxGeometry(1.32, pedH, 1.32, 2, 0.02),
      basaltMat
    );
    pedestal.position.set(0, floorY + pedH * 0.5, centerZ);
    basinGroup.add(pedestal);

    // 4. 순백 조선 달항아리 (48세그먼트 초고밀도 유려한 백자 곡선 + 매끄러운 유약 광택)
    const jarPts = [
      new C_ENGINE.Vector2(0.0, 0.0),
      new C_ENGINE.Vector2(0.27, 0.0),
      new C_ENGINE.Vector2(0.285, 0.055),
      new C_ENGINE.Vector2(0.36, 0.12),
      new C_ENGINE.Vector2(0.47, 0.23),
      new C_ENGINE.Vector2(0.56, 0.36),
      new C_ENGINE.Vector2(0.625, 0.50),
      new C_ENGINE.Vector2(0.655, 0.65),
      new C_ENGINE.Vector2(0.65, 0.80),
      new C_ENGINE.Vector2(0.605, 0.94),
      new C_ENGINE.Vector2(0.525, 1.07),
      new C_ENGINE.Vector2(0.42, 1.18),
      new C_ENGINE.Vector2(0.315, 1.255),
      new C_ENGINE.Vector2(0.30, 1.30),
      new C_ENGINE.Vector2(0.328, 1.345),
      new C_ENGINE.Vector2(0.295, 1.36),
      new C_ENGINE.Vector2(0.265, 1.335),
      new C_ENGINE.Vector2(0.245, 1.24)
    ];
    const jarGeo = new C_ENGINE.LatheGeometry(jarPts, this.isMobile ? 28 : 48);
    const moonJarMat = new C_ENGINE.MeshStandardMaterial({
      color: 0xfefcf7,
      emissive: new C_ENGINE.Color(0x282620),
      emissiveIntensity: 0.14,
      roughness: 0.055,
      metalness: 0.05,
      envMapIntensity: 2.3
    });

    const moonJar = new C_ENGINE.Mesh(jarGeo, moonJarMat);
    moonJar.position.set(0, pedTopY, centerZ);
    basinGroup.add(moonJar);

    // 5. 달항아리 상단 백자 유약 하이라이트 전용 핀조명 (단일 핵심 PointLight로 통합)
    const jarKeyLight = new C_ENGINE.PointLight(0xfffaf0, 3.8, 12.5, 1.35);
    jarKeyLight.position.set(0.55, floorY + 3.45, centerZ - 1.55);
    basinGroup.add(jarKeyLight);

    group.add(basinGroup);
  }

  /**
   * 실내 4개 면 × 3열 × 7행 = 84석 단정한 미니멀 명상 방석 (3 InstancedMesh — 초경량 3 Draw Calls)
   */
  buildIndoorMeditationCushions(group, floorY) {
    const cushions = MURYANGSUJEON_CONFIG.interior.cushions || [];
    if (cushions.length === 0) return;

    const cMatCanvas = document.createElement('canvas');
    cMatCanvas.width = 128;
    cMatCanvas.height = 128;
    const mCtx = cMatCanvas.getContext('2d');
    mCtx.fillStyle = '#c9bfa8';
    mCtx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 3) {
      mCtx.fillStyle = y % 6 === 0 ? 'rgba(130,115,92,0.16)' : 'rgba(240,232,214,0.14)';
      mCtx.fillRect(0, y, 128, 1.5);
    }
    mCtx.strokeStyle = '#474f4d';
    mCtx.lineWidth = 8;
    mCtx.strokeRect(4, 4, 120, 120);
    const matTex = new C_ENGINE.CanvasTexture(cMatCanvas);
    matTex.colorSpace = C_ENGINE.SRGBColorSpace;

    const cLinCanvas = document.createElement('canvas');
    cLinCanvas.width = 128;
    cLinCanvas.height = 128;
    const lCtx = cLinCanvas.getContext('2d');
    const lg = lCtx.createRadialGradient(64, 64, 6, 64, 64, 64);
    lg.addColorStop(0, '#4d5b59');
    lg.addColorStop(0.75, '#3b4746');
    lg.addColorStop(1, '#2b3433');
    lCtx.fillStyle = lg;
    lCtx.fillRect(0, 0, 128, 128);
    const linenTex = new C_ENGINE.CanvasTexture(cLinCanvas);
    linenTex.colorSpace = C_ENGINE.SRGBColorSpace;

    const baseMat = new C_ENGINE.MeshStandardMaterial({ map: matTex, roughness: 0.9, metalness: 0.01 });
    const cushionMat = new C_ENGINE.MeshStandardMaterial({ map: linenTex, roughness: 0.88, metalness: 0.02 });
    const dimpleMat = new C_ENGINE.MeshStandardMaterial({ color: 0x2a3332, roughness: 0.92, metalness: 0.01 });

    const puffPts = [
      new C_ENGINE.Vector2(0.0, 0.0),
      new C_ENGINE.Vector2(0.36, 0.004),
      new C_ENGINE.Vector2(0.405, 0.032),
      new C_ENGINE.Vector2(0.41, 0.076),
      new C_ENGINE.Vector2(0.37, 0.11),
      new C_ENGINE.Vector2(0.26, 0.122),
      new C_ENGINE.Vector2(0.10, 0.116),
      new C_ENGINE.Vector2(0.0, 0.108)
    ];
    const puffGeo = new C_ENGINE.LatheGeometry(puffPts, this.isMobile ? 16 : 22);
    const matBaseGeo = new C_ENGINE.RoundedBoxGeometry(0.94, 0.02, 0.94, 2, 0.01);
    const buttonGeo = new C_ENGINE.SphereGeometry(0.034, 8, 6);

    const count = cushions.length;
    const matInst = new C_ENGINE.InstancedMesh(matBaseGeo, baseMat, count);
    const puffInst = new C_ENGINE.InstancedMesh(puffGeo, cushionMat, count);
    const btnInst = new C_ENGINE.InstancedMesh(buttonGeo, dimpleMat, count);
    matInst.name = 'IndoorCushionMats';
    puffInst.name = 'IndoorCushionPuffs';
    btnInst.name = 'IndoorCushionButtons';

    const dummy = new C_ENGINE.Object3D();
    for (let i = 0; i < count; i++) {
      const c = cushions[i];
      dummy.position.set(c.x, floorY + 0.01, c.z);
      dummy.rotation.set(0, c.yaw || 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      matInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(c.x, floorY + 0.018, c.z);
      dummy.updateMatrix();
      puffInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(c.x, floorY + 0.122, c.z);
      dummy.scale.set(1.1, 0.35, 1.1);
      dummy.updateMatrix();
      btnInst.setMatrixAt(i, dummy.matrix);
    }
    matInst.instanceMatrix.needsUpdate = true;
    puffInst.instanceMatrix.needsUpdate = true;
    btnInst.instanceMatrix.needsUpdate = true;

    const cushionRoot = new C_ENGINE.Group();
    cushionRoot.name = 'IndoorMeditationCushions';
    cushionRoot.add(matInst, puffInst, btnInst);

    // 40석 클릭 피킹용 히트박스 및 선택/호버 링 생성
    this.indoorCushionEntries = [];
    const hitGeo = new C_ENGINE.CylinderGeometry(0.62, 0.62, 0.34, 12);
    const hitMat = new C_ENGINE.MeshBasicMaterial({ visible: false });
    const ringGeo = new C_ENGINE.RingGeometry(0.47, 0.55, 28);

    for (let i = 0; i < count; i++) {
      const c = cushions[i];
      const hitMesh = new C_ENGINE.Mesh(hitGeo, hitMat);
      hitMesh.position.set(c.x, floorY + 0.14, c.z);
      hitMesh.userData = {
        type: 'hallCushion',
        hallSeatIndex: c.index,
        cushion: c
      };
      cushionRoot.add(hitMesh);

      const ringMat = new C_ENGINE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: C_ENGINE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const ringMesh = new C_ENGINE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI * 0.5;
      ringMesh.position.set(c.x, floorY + 0.032, c.z);
      ringMesh.visible = false;
      ringMesh.raycast = () => {};
      cushionRoot.add(ringMesh);

      this.indoorCushionEntries.push({
        hallSeatIndex: c.index,
        cushion: c,
        hitMesh,
        ringMesh,
        ringMat
      });
    }

    group.add(cushionRoot);
  }

  createSunbeamTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255, 240, 200, 0.34)');
    g.addColorStop(0.55, 'rgba(255, 232, 182, 0.14)');
    g.addColorStop(1, 'rgba(255, 224, 168, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    const tex = new C_ENGINE.CanvasTexture(canvas);
    tex.colorSpace = C_ENGINE.SRGBColorSpace;
    return tex;
  }

  buildSkylightSunbeamAndDust(group, floorY) {
    const centerZ = MURYANGSUJEON_CONFIG.interior.basin.cz;

    // 1. 상향된 천창(y=8.95)에서 달항아리로 쏟아지는 부드러운 빛기둥(Sunbeam)
    const beamGeo = new C_ENGINE.CylinderGeometry(1.05, 2.05, 8.2, 22, 1, true);
    this.sunbeamMat = new C_ENGINE.MeshBasicMaterial({
      map: this.createSunbeamTexture(),
      color: 0xffe8ba,
      transparent: true,
      opacity: 0.34,
      blending: C_ENGINE.AdditiveBlending,
      side: C_ENGINE.DoubleSide,
      depthWrite: false
    });
    const beamMesh = new C_ENGINE.Mesh(beamGeo, this.sunbeamMat);
    beamMesh.position.set(0, floorY + 4.95, centerZ);
    beamMesh.raycast = () => {};
    group.add(beamMesh);

    // 2. 부유 먼지 입자 비활성화 (달항아리 위 정갈한 빛기둥만 유지)
    this.dustInst = null;
    this.dustData = [];
  }

  update(elapsed, _dt) {
    this.timeUniform.value = elapsed;

    if (this.sunbeamMat) {
      this.sunbeamMat.opacity = 0.36 + 0.08 * Math.sin(elapsed * 0.55);
    }

    if (this.dustInst) {
      for (let i = 0; i < this.dustData.length; i++) {
        const d = this.dustData[i];
        const t = elapsed * d.speed + d.phase;
        const scale = 0.55 + 0.45 * Math.sin(elapsed * 1.6 + d.phase);
        this.dustDummy.position.set(
          d.baseX + Math.sin(t) * 0.14,
          d.baseY + Math.cos(t * 0.8) * 0.18,
          d.baseZ + Math.cos(t * 1.1) * 0.12
        );
        this.dustDummy.scale.setScalar(scale);
        this.dustDummy.updateMatrix();
        this.dustInst.setMatrixAt(i, this.dustDummy.matrix);
      }
      this.dustInst.instanceMatrix.needsUpdate = true;
    }
  }
}
