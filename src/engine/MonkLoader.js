/**
 * MonkLoader — 확정 시안(character-concept-1-wanderer.jpg) 고품질 자체 제작 「풍류 어린 선비 / 산사 나그네」
 * - 100% 무료·자체 코드·상용 안전 (외부 GLB 0%, 약 5,200 삼각형 경량 60fps)
 * - 린넨 패브릭 직조 컬러+범프맵 + 3D 입체 이목구비(눈썹·반달 눈·미소) + 3D 5:5 가르마 앞머리·뒷머리
 * - 우임 전통 한복 깃·동정 + 앞트임 도포 자락(두께 헴라인) + 곡선 옷고름·황금 세조대
 * - 부드러운 한복 배래 소매(속마감 포함) + 통통한 5지 클레이 손 + 대님 바지·버선·고무신
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

let sharedFaceTexture = null;
let sharedLinenTextures = null;
let sharedGeos = null;

function getSharedLinenTextures() {
  if (sharedLinenTextures) return sharedLinenTextures;
  const size = 256;

  // 1) Color canvas: 부드러운 한복 면·린넨 직조 결
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d');

  cCtx.fillStyle = '#f7f5f0';
  cCtx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 3) {
    const shade = (y % 6 === 0) ? 'rgba(132, 120, 102, 0.068)' : 'rgba(255, 255, 255, 0.09)';
    cCtx.fillStyle = shade;
    cCtx.fillRect(0, y, size, 1.5);
  }
  for (let x = 0; x < size; x += 3) {
    const shade = (x % 6 === 0) ? 'rgba(124, 112, 95, 0.058)' : 'rgba(255, 255, 255, 0.07)';
    cCtx.fillStyle = shade;
    cCtx.fillRect(x, 0, 1.5, size);
  }
  // 미세한 자연 직물 결 변화
  for (let i = 0; i < 420; i++) {
    const rx = (i * 73) % size;
    const ry = (i * 137) % size;
    cCtx.fillStyle = i % 2 === 0 ? 'rgba(110, 98, 82, 0.045)' : 'rgba(255, 252, 245, 0.05)';
    cCtx.fillRect(rx, ry, 4, 1.5);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 4);
  map.colorSpace = THREE.SRGBColorSpace;

  // 2) Bump canvas: 미세 직조 요철
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 4) {
    bCtx.fillStyle = (y % 8 === 0) ? '#989898' : '#6c6c6c';
    bCtx.fillRect(0, y, size, 2);
  }
  for (let x = 0; x < size; x += 4) {
    bCtx.fillStyle = (x % 8 === 0) ? 'rgba(190,190,190,0.45)' : 'rgba(85,85,85,0.45)';
    bCtx.fillRect(x, 0, 2, size);
  }

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 4);

  sharedLinenTextures = { map, bumpMap };
  return sharedLinenTextures;
}

function getSharedFaceTexture() {
  if (sharedFaceTexture) return sharedFaceTexture;

  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // 1. 시안 1의 포근한 복숭아빛 점토 피부 바탕 + 아래턱 미세 음영
  const skinGrad = ctx.createLinearGradient(0, 0, 0, h);
  skinGrad.addColorStop(0, '#fbe5d5');
  skinGrad.addColorStop(0.66, '#f8dcc9');
  skinGrad.addColorStop(0.90, '#f0cbb3');
  skinGrad.addColorStop(1, '#e6bda3');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, w, h);

  // headMesh.rotation.y = Math.PI/2 → u = 0.5 (cx = 1024)가 정면(-Z)
  // 구면 좌표 정밀 매핑: y_px/h = acos((y - 0.178) / 0.1899) / PI
  const cx = w * 0.5;

  // 2. 상단·뒤통수 짙은 먹갈색 머리카락 바탕 (3D 입체 앞머리·뒷머리 메쉬와 자연스럽게 연결)
  ctx.fillStyle = '#291f1a';
  ctx.fillRect(0, 0, w, h * 0.29);
  ctx.fillRect(0, h * 0.27, w * 0.34, h * 0.45);
  ctx.fillRect(w * 0.66, h * 0.27, w * 0.34, h * 0.45);

  // 정면 이마 둥근 5:5 가르마 곡선
  ctx.fillStyle = '#fbe5d5';
  ctx.beginPath();
  ctx.moveTo(cx, h * 0.17);
  ctx.quadraticCurveTo(cx - 116, h * 0.34, cx - 248, h * 0.40);
  ctx.lineTo(cx - 248, h * 0.58);
  ctx.lineTo(cx + 248, h * 0.58);
  ctx.lineTo(cx + 248, h * 0.40);
  ctx.quadraticCurveTo(cx + 116, h * 0.34, cx, h * 0.17);
  ctx.closePath();
  ctx.fill();

  // 3. 시안 1의 따뜻하고 넓은 복숭아빛 볼 홍조 (y ≈ 0.138 → h * 0.568)
  for (const sign of [-1, 1]) {
    const bx = cx + sign * 150;
    const by = h * 0.568;
    const grad = ctx.createRadialGradient(bx, by, 10, bx, by, 96);
    grad.addColorStop(0, 'rgba(234, 122, 110, 0.50)');
    grad.addColorStop(0.45, 'rgba(238, 146, 132, 0.26)');
    grad.addColorStop(0.8, 'rgba(240, 168, 152, 0.07)');
    grad.addColorStop(1, 'rgba(240, 168, 152, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, 96, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. 3D 입체 코(y = 0.148) 바로 아래 부드러운 그림자·혈색 (정면에서도 코 입체감이 또렷하게 보이도록)
  const noseShadowGrad = ctx.createRadialGradient(cx, h * 0.568, 4, cx, h * 0.568, 34);
  noseShadowGrad.addColorStop(0, 'rgba(186, 118, 94, 0.34)');
  noseShadowGrad.addColorStop(0.55, 'rgba(210, 142, 118, 0.14)');
  noseShadowGrad.addColorStop(1, 'rgba(210, 142, 118, 0.0)');
  ctx.fillStyle = noseShadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, h * 0.568, 34, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // 5. 시안 1과 동일한 단정하고 온화한 눈썹 (y ≈ 0.206 → h * 0.453)
  ctx.strokeStyle = '#3f2b22';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  for (const sign of [-1, 1]) {
    const ex = cx + sign * 96;
    const ey = h * 0.456;
    ctx.beginPath();
    ctx.moveTo(ex - 36, ey + 4);
    ctx.quadraticCurveTo(ex, ey - 10, ex + 36, ey + 4);
    ctx.stroke();
  }

  // 6. 시안 1의 평온하게 감은 완만한 반달 눈 (y ≈ 0.172 → h * 0.510, 과한 U자 대신 단정한 완만 곡선)
  ctx.strokeStyle = '#291b15';
  ctx.lineWidth = 17;
  ctx.lineCap = 'round';
  for (const sign of [-1, 1]) {
    const ex = cx + sign * 96;
    const ey = h * 0.510;
    ctx.beginPath();
    ctx.moveTo(ex - 40, ey - 6);
    ctx.quadraticCurveTo(ex, ey + 18, ex + 40, ey - 6);
    ctx.stroke();
  }

  // 7. 시안 1의 작고 온화한 미소 (y ≈ 0.114 → h * 0.608)
  ctx.strokeStyle = '#9c5848';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 32, h * 0.602);
  ctx.quadraticCurveTo(cx, h * 0.624, cx + 32, h * 0.602);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  sharedFaceTexture = tex;
  return tex;
}

function makeCurvedRibbonGeo(points, width, thickness, segments = 14) {
  const curve = new THREE.CatmullRomCurve3(points);
  const tube = new THREE.TubeGeometry(curve, segments, width * 0.5, 6, false);
  // Z축 두께를 납작하게 눌러 천 리본 단면 생성
  const pos = tube.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const pt = curve.getPointAt(Math.min(1, Math.max(0, Math.floor(i / 7) / segments)));
    const dz = pos.getZ(i) - pt.z;
    pos.setZ(i, pt.z + dz * (thickness / width));
  }
  tube.computeVertexNormals();
  return tube;
}

function getSharedGeometries() {
  if (sharedGeos) return sharedGeos;

  // 1) 닫힌 상의 도포 (어깨에서 허리까지 포근하고 매끄러운 실루엣)
  const upperBodicePts = [
    new THREE.Vector2(0.184, 0.10),
    new THREE.Vector2(0.193, 0.185),
    new THREE.Vector2(0.203, 0.275),
    new THREE.Vector2(0.178, 0.342),
    new THREE.Vector2(0.120, 0.376),
    new THREE.Vector2(0.070, 0.386)
  ];

  // 2) 허리 아래 크림색 속옷(안쪽 치마) — 시안의 포근한 A라인
  const innerSkirtPts = [
    new THREE.Vector2(0.01, -0.375),
    new THREE.Vector2(0.214, -0.365),
    new THREE.Vector2(0.210, -0.25),
    new THREE.Vector2(0.198, -0.11),
    new THREE.Vector2(0.185, 0.03),
    new THREE.Vector2(0.180, 0.13)
  ];

  // 3) 허리 아래 앞트임 연옥빛 도포 자락 (시안처럼 은은하게 퍼지는 A라인 + 밑단 말림)
  const lowerSkirtPts = [
    new THREE.Vector2(0.258, -0.468),
    new THREE.Vector2(0.270, -0.452),
    new THREE.Vector2(0.264, -0.34),
    new THREE.Vector2(0.240, -0.17),
    new THREE.Vector2(0.210, 0.01),
    new THREE.Vector2(0.193, 0.135)
  ];
  const lowerSkirtGeo = new THREE.LatheGeometry(lowerSkirtPts, 32, Math.PI * 0.15, Math.PI * 1.70);

  // 도포 밑단 둥근 헴라인(앞트임 제외 구간)
  const skirtHemArcGeo = new THREE.TorusGeometry(0.265, 0.013, 8, 32, Math.PI * 1.70);

  // 도포 앞트임 양옆 세로 테두리 (천 두께감)
  const coatEdgeGeo = new THREE.CapsuleGeometry(0.013, 0.56, 6, 8);

  // 4) 한복 목둘레 깃 & 흰 동정 (곡선 Tube 기반)
  const neckCollarCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.078, 0.292, -0.055),
    new THREE.Vector3(-0.088, 0.286, 0.045),
    new THREE.Vector3(0.0, 0.285, 0.095),
    new THREE.Vector3(0.088, 0.286, 0.045),
    new THREE.Vector3(0.078, 0.292, -0.055)
  ]);
  const backCollarGeo = new THREE.TubeGeometry(neckCollarCurve, 18, 0.022, 8, false);

  // 앞 V자 우임 옷깃 (좌측 깃이 오른쪽 위로 자연스럽게 겹쳐짐)
  const lapelLCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.078, 0.292, -0.055),
    new THREE.Vector3(-0.072, 0.245, -0.145),
    new THREE.Vector3(-0.025, 0.180, -0.186),
    new THREE.Vector3(0.036, 0.125, -0.196)
  ]);
  const lapelRCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.078, 0.292, -0.055),
    new THREE.Vector3(0.072, 0.245, -0.145),
    new THREE.Vector3(0.024, 0.182, -0.182),
    new THREE.Vector3(-0.028, 0.132, -0.189)
  ]);
  const lapelLGeo = makeCurvedRibbonGeo(lapelLCurve.getPoints(6), 0.046, 0.020, 14);
  const lapelRGeo = makeCurvedRibbonGeo(lapelRCurve.getPoints(6), 0.046, 0.020, 14);

  // 흰 동정 (깃 안쪽을 따라 V자로 깔끔하게 빛나는 흰 테두리)
  const collarLCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.068, 0.296, -0.055),
    new THREE.Vector3(-0.058, 0.252, -0.138),
    new THREE.Vector3(-0.008, 0.196, -0.180)
  ]);
  const collarRCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.068, 0.296, -0.055),
    new THREE.Vector3(0.058, 0.252, -0.138),
    new THREE.Vector3(0.008, 0.196, -0.176)
  ]);
  const collarLGeo = makeCurvedRibbonGeo(collarLCurve.getPoints(5), 0.030, 0.016, 12);
  const collarRGeo = makeCurvedRibbonGeo(collarRCurve.getPoints(5), 0.030, 0.016, 12);

  // 5) 곡선 옷고름 자락 & 황금 허리띠(세조대)
  const goreumTail1Geo = makeCurvedRibbonGeo([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.014, -0.13, -0.016),
    new THREE.Vector3(-0.022, -0.27, -0.024),
    new THREE.Vector3(-0.028, -0.40, -0.018)
  ], 0.044, 0.014, 12);

  const goreumTail2Geo = makeCurvedRibbonGeo([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.008, -0.11, -0.012),
    new THREE.Vector3(0.012, -0.23, -0.018),
    new THREE.Vector3(0.010, -0.34, -0.012)
  ], 0.038, 0.013, 10);

  // 납작한 천 허리띠 (세조대)
  const sashBandGeo = new THREE.TorusGeometry(0.196, 0.021, 10, 36);
  sashBandGeo.scale(1.0, 1.0, 0.72); // 수직으로 눌려 납작한 천 띠 느낌

  const sashTail1Geo = makeCurvedRibbonGeo([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.006, -0.11, -0.016),
    new THREE.Vector3(0.015, -0.22, -0.022),
    new THREE.Vector3(0.022, -0.33, -0.016)
  ], 0.040, 0.014, 10);

  const sashTail2Geo = makeCurvedRibbonGeo([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.020, -0.09, -0.012),
    new THREE.Vector3(0.034, -0.19, -0.016),
    new THREE.Vector3(0.042, -0.27, -0.010)
  ], 0.036, 0.013, 10);

  // 6) 3D 입체 5:5 가르마 앞머리 가닥 (좌측 기준, 우측은 X 미러)
  const hairStrandCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.008, 0.345, -0.125),
    new THREE.Vector3(-0.072, 0.305, -0.158),
    new THREE.Vector3(-0.145, 0.245, -0.132),
    new THREE.Vector3(-0.192, 0.180, -0.055),
    new THREE.Vector3(-0.188, 0.135, 0.025)
  ]);
  const hairStrandLGeo = new THREE.TubeGeometry(hairStrandCurve, 14, 0.036, 8, false);
  const hairStrandRCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.008, 0.345, -0.125),
    new THREE.Vector3(0.072, 0.305, -0.158),
    new THREE.Vector3(0.145, 0.245, -0.132),
    new THREE.Vector3(0.192, 0.180, -0.055),
    new THREE.Vector3(0.188, 0.135, 0.025)
  ]);
  const hairStrandRGeo = new THREE.TubeGeometry(hairStrandRCurve, 14, 0.036, 8, false);

  // 7) 둥글고 풍성한 한복 배래 소매 (Lathe로 자연스러운 종 곡선 성형)
  const upperSleevePts = [
    new THREE.Vector2(0.095, -0.24),
    new THREE.Vector2(0.090, -0.15),
    new THREE.Vector2(0.082, -0.06),
    new THREE.Vector2(0.076, 0.0)
  ];
  const upperSleeveGeo = new THREE.LatheGeometry(upperSleevePts, 18);

  const foreSleevePts = [
    new THREE.Vector2(0.118, -0.228),
    new THREE.Vector2(0.116, -0.16),
    new THREE.Vector2(0.106, -0.08),
    new THREE.Vector2(0.093, 0.0)
  ];
  const foreSleeveGeo = new THREE.LatheGeometry(foreSleevePts, 18);

  // 8) 통통한 한복 바지 (시안의 항아리 바지 + 발목 대님 주름)
  const trouserPts = [
    new THREE.Vector2(0.044, -0.252),
    new THREE.Vector2(0.068, -0.232),
    new THREE.Vector2(0.098, -0.185),
    new THREE.Vector2(0.108, -0.110),
    new THREE.Vector2(0.098, -0.025),
    new THREE.Vector2(0.084, 0.03)
  ];
  const shinGeo = new THREE.LatheGeometry(trouserPts, 18);

  const thighGeo = new THREE.CylinderGeometry(0.092, 0.088, 0.24, 14);
  thighGeo.translate(0, -0.12, 0);

  sharedGeos = {
    headGeo: new THREE.SphereGeometry(0.202, 32, 24),
    noseGeo: new THREE.SphereGeometry(0.024, 14, 10),
    earGeo: new THREE.SphereGeometry(0.043, 12, 10),
    earInnerGeo: new THREE.SphereGeometry(0.025, 10, 8),
    hairBackGeo: new THREE.SphereGeometry(0.207, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.72),
    hairNapeGeo: new THREE.SphereGeometry(0.128, 16, 12),
    hairStrandLGeo,
    hairStrandRGeo,
    neckGeo: new THREE.CylinderGeometry(0.062, 0.078, 0.095, 14),
    upperBodiceGeo: new THREE.LatheGeometry(upperBodicePts, 30),
    innerSkirtGeo: new THREE.LatheGeometry(innerSkirtPts, 26),
    lowerSkirtGeo,
    skirtHemArcGeo,
    coatEdgeGeo,
    backCollarGeo,
    lapelLGeo,
    lapelRGeo,
    collarLGeo,
    collarRGeo,
    goreumKnotGeo: new THREE.SphereGeometry(0.032, 12, 10),
    goreumLoopGeo: new RoundedBoxGeometry(0.088, 0.042, 0.024, 3, 0.011),
    goreumTail1Geo,
    goreumTail2Geo,
    sashBandGeo,
    sashKnotGeo: new RoundedBoxGeometry(0.048, 0.052, 0.034, 3, 0.012),
    sashTail1Geo,
    sashTail2Geo,
    shoulderCapGeo: new THREE.SphereGeometry(0.092, 16, 12),
    elbowCapGeo: new THREE.SphereGeometry(0.095, 14, 10),
    sleeveRimGeo: new THREE.TorusGeometry(0.114, 0.011, 8, 22),
    sleeveInnerCapGeo: new THREE.CircleGeometry(0.110, 18),
    upperSleeveGeo,
    foreSleeveGeo,
    palmGeo: new THREE.SphereGeometry(0.048, 14, 12),
    thumbGeo: new THREE.CapsuleGeometry(0.013, 0.022, 4, 6),
    fingerGeo: new THREE.CapsuleGeometry(0.0105, 0.026, 4, 6),
    thighGeo,
    shinGeo,
    daenimGeo: new THREE.TorusGeometry(0.050, 0.011, 8, 16),
    sockGeo: new THREE.CylinderGeometry(0.045, 0.049, 0.09, 14),
    shoeGeo: new THREE.SphereGeometry(0.068, 16, 12),
    shoeTipGeo: new THREE.SphereGeometry(0.038, 12, 10),
    shoeCollarGeo: new THREE.TorusGeometry(0.048, 0.008, 6, 16),
    soleGeo: new THREE.CylinderGeometry(0.066, 0.068, 0.018, 16)
  };
  return sharedGeos;
}

export function createMonk(options = {}) {
  const group = new THREE.Group();
  group.name = options.remote ? 'RemoteWandererActor' : 'PlayerWandererActor';
  const castShadow = !options.remote;

  const geos = getSharedGeometries();
  const faceTex = getSharedFaceTexture();
  const linen = getSharedLinenTextures();

  // 시안 1의 부드러운 무광 패브릭-점토 PBR 재질 (린넨 컬러 + 범프맵 적용)
  const outerRobeMat = new THREE.MeshStandardMaterial({
    name: 'saffron_outer_robe',
    map: linen.map,
    bumpMap: linen.bumpMap,
    bumpScale: 0.006,
    color: 0x99af96,
    roughness: 0.88,
    metalness: 0.01,
    side: THREE.DoubleSide
  });
  const sleeveInnerMat = new THREE.MeshStandardMaterial({
    name: 'saffron_sleeve_inner',
    color: 0x5c6d5a,
    roughness: 0.94,
    metalness: 0.0
  });
  const innerRobeMat = new THREE.MeshStandardMaterial({
    name: 'sage_inner_robe',
    map: linen.map,
    bumpMap: linen.bumpMap,
    bumpScale: 0.005,
    color: 0xe8dcc6,
    roughness: 0.88,
    metalness: 0.01
  });
  const trousersMat = new THREE.MeshStandardMaterial({
    name: 'trouser_fabric',
    map: linen.map,
    bumpMap: linen.bumpMap,
    bumpScale: 0.006,
    color: 0xcab99f,
    roughness: 0.90,
    metalness: 0.01
  });
  const collarMat = new THREE.MeshStandardMaterial({
    name: 'rice_collar',
    map: linen.map,
    color: 0xf6f0e4,
    roughness: 0.85,
    metalness: 0.01
  });
  const sashMat = new THREE.MeshStandardMaterial({
    name: 'amber_waist_sash',
    map: linen.map,
    bumpMap: linen.bumpMap,
    bumpScale: 0.005,
    color: 0xc89543,
    roughness: 0.78,
    metalness: 0.02
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    name: 'cotton_shoe',
    color: 0xede5d6,
    roughness: 0.84,
    metalness: 0.01
  });
  const soleMat = new THREE.MeshStandardMaterial({
    name: 'sole_tan',
    color: 0x9b886e,
    roughness: 0.90,
    metalness: 0.01
  });
  const skinMat = new THREE.MeshStandardMaterial({
    name: 'warm_peach_skin',
    color: 0xf8ddcb,
    roughness: 0.72,
    metalness: 0.01
  });
  const noseMat = new THREE.MeshStandardMaterial({
    name: 'warm_peach_nose',
    color: 0xf2cab5,
    roughness: 0.68,
    metalness: 0.01
  });
  const earInnerMat = new THREE.MeshStandardMaterial({
    name: 'ear_inner_shade',
    color: 0xe6baa2,
    roughness: 0.78,
    metalness: 0.01
  });
  const faceMat = new THREE.MeshStandardMaterial({
    name: 'serene_wanderer_face',
    map: faceTex,
    roughness: 0.70,
    metalness: 0.01
  });
  const hairMat = new THREE.MeshStandardMaterial({
    name: 'dark_ink_hair',
    color: 0x291f1a,
    roughness: 0.84,
    metalness: 0.01
  });

  const makeMesh = (geo, mat, name) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.castShadow = castShadow;
    m.receiveShadow = false;
    return m;
  };

  // === 17개 표준 본(Group) 계층 ===
  const hips = new THREE.Group();
  hips.name = 'hips';
  const baseHipsY = 0.53;
  hips.position.set(0, baseHipsY, 0);
  group.add(hips);

  const spine = new THREE.Group();
  spine.name = 'spine';
  spine.position.set(0, 0.08, 0);
  hips.add(spine);

  const chest = new THREE.Group();
  chest.name = 'chest';
  chest.position.set(0, 0.22, 0);
  spine.add(chest);

  // 1) 닫힌 상의 연옥빛 도포
  const upperBodice = makeMesh(geos.upperBodiceGeo, outerRobeMat, 'saffron_upper_bodice');
  upperBodice.position.set(0, 0.14, 0);
  spine.add(upperBodice);

  // 2) 허리 아래 크림색 속옷(안쪽 치마)
  const innerSkirt = makeMesh(geos.innerSkirtGeo, innerRobeMat, 'sage_inner_skirt');
  innerSkirt.position.set(0, 0.14, 0);
  spine.add(innerSkirt);

  // 3) 허리 아래 앞트임 연옥빛 도포 자락 (그룹으로 묶어 앞트임 테두리·밑단 헴라인 일체 변형)
  const lowerSkirt = new THREE.Group();
  lowerSkirt.name = 'saffron_lower_skirt_group';
  lowerSkirt.position.set(0, 0.14, 0);
  spine.add(lowerSkirt);

  const lowerSkirtMesh = makeMesh(geos.lowerSkirtGeo, outerRobeMat, 'saffron_lower_skirt');
  lowerSkirtMesh.rotation.y = Math.PI; // 앞트임이 정면(-Z)을 향하도록 고정
  lowerSkirt.add(lowerSkirtMesh);

  // 밑단 둥근 헴라인 테두리 (앞트임 -Z 구간 제외)
  const skirtHemArc = makeMesh(geos.skirtHemArcGeo, outerRobeMat, 'saffron_skirt_hem');
  skirtHemArc.rotation.x = Math.PI * 0.5;
  skirtHemArc.rotation.z = -Math.PI * 0.35;
  skirtHemArc.position.y = -0.458;
  lowerSkirt.add(skirtHemArc);

  // 앞트임 양쪽 세로 천 두께 테두리
  for (const sign of [-1, 1]) {
    const edge = makeMesh(geos.coatEdgeGeo, outerRobeMat, `saffron_edge_${sign < 0 ? 'L' : 'R'}`);
    edge.position.set(sign * 0.108, -0.165, -0.212);
    edge.rotation.z = -sign * 0.115;
    edge.rotation.x = -0.105;
    lowerSkirt.add(edge);
  }

  // 4) 전통 한복 목둘레 깃 + 우임 앞깃 + 흰 동정
  const backCollar = makeMesh(geos.backCollarGeo, outerRobeMat, 'saffron_back_collar');
  chest.add(backCollar);

  const lapelL = makeMesh(geos.lapelLGeo, outerRobeMat, 'saffron_lapel_L');
  chest.add(lapelL);

  const lapelR = makeMesh(geos.lapelRGeo, outerRobeMat, 'saffron_lapel_R');
  chest.add(lapelR);

  const collarL = makeMesh(geos.collarLGeo, collarMat, 'rice_collar_L');
  chest.add(collarL);

  const collarR = makeMesh(geos.collarRGeo, collarMat, 'rice_collar_R');
  chest.add(collarR);

  // 5) 부드러운 연옥빛 옷고름 매듭 + 곡선 고름 자락 2개
  const goreumKnot = makeMesh(geos.goreumKnotGeo, outerRobeMat, 'saffron_goreum_knot');
  goreumKnot.position.set(-0.048, 0.095, -0.198);
  chest.add(goreumKnot);

  const goreumLoop = makeMesh(geos.goreumLoopGeo, outerRobeMat, 'saffron_goreum_loop');
  goreumLoop.position.set(0.008, 0.098, -0.203);
  goreumLoop.rotation.z = 0.08;
  chest.add(goreumLoop);

  const goreumTail1 = makeMesh(geos.goreumTail1Geo, outerRobeMat, 'saffron_goreum_tail_1');
  goreumTail1.position.set(-0.056, 0.090, -0.202);
  chest.add(goreumTail1);

  const goreumTail2 = makeMesh(geos.goreumTail2Geo, outerRobeMat, 'saffron_goreum_tail_2');
  goreumTail2.position.set(-0.036, 0.092, -0.198);
  chest.add(goreumTail2);

  // 6) 황금 허리띠(세조대) + 우측 매듭 & 곡선 자락 2가닥
  const sashBand = makeMesh(geos.sashBandGeo, sashMat, 'waist_sash_ring');
  sashBand.rotation.x = Math.PI * 0.5;
  sashBand.position.set(0, 0.255, 0);
  spine.add(sashBand);

  const sashKnot = makeMesh(geos.sashKnotGeo, sashMat, 'waist_sash_knot');
  sashKnot.position.set(0.076, 0.255, -0.199);
  spine.add(sashKnot);

  const sashTail1 = makeMesh(geos.sashTail1Geo, sashMat, 'waist_sash_tail_L');
  sashTail1.position.set(0.074, 0.250, -0.203);
  spine.add(sashTail1);

  const sashTail2 = makeMesh(geos.sashTail2Geo, sashMat, 'waist_sash_tail_R');
  sashTail2.position.set(0.094, 0.248, -0.198);
  spine.add(sashTail2);

  // 7) 목 & 3.3등신 머리 + 3D 입체 이목구비 + 3D 5:5 가르마 앞머리·뒷머리
  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.set(0, 0.27, 0);
  chest.add(neck);

  const neckMesh = makeMesh(geos.neckGeo, skinMat, 'neck_mesh');
  neckMesh.position.set(0, 0.038, 0);
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.06, 0);
  neck.add(head);

  const headMesh = makeMesh(geos.headGeo, faceMat, 'wanderer_head');
  headMesh.position.set(0, 0.178, 0);
  headMesh.scale.set(1.06, 0.94, 0.98);
  headMesh.rotation.y = Math.PI * 0.5;
  head.add(headMesh);

  // 3D 입체 동글동글 클레이 코 (정면·측면 모두 또렷하게 보이는 복숭아빛 코)
  const noseMesh = makeMesh(geos.noseGeo, noseMat, 'wanderer_nose');
  noseMesh.position.set(0, 0.148, -0.203);
  noseMesh.scale.set(1.06, 0.86, 0.96);
  head.add(noseMesh);

  // 뒷머리 캡 + 목덜미 둥근 헤어 볼륨 (측면·후면 단정한 실루엣)
  const hairBack = makeMesh(geos.hairBackGeo, hairMat, 'wanderer_hair_back');
  hairBack.position.set(0, 0.186, 0.015);
  hairBack.scale.set(1.06, 0.95, 1.0);
  hairBack.rotation.x = 0.24;
  head.add(hairBack);

  const hairNape = makeMesh(geos.hairNapeGeo, hairMat, 'wanderer_hair_nape');
  hairNape.position.set(0, 0.118, 0.105);
  hairNape.scale.set(1.25, 0.82, 0.92);
  head.add(hairNape);

  // 좌·우 3D 곡선 가르마 앞머리 (이마 중앙 5:5에서 관자놀이·귀 뒤까지 매끈하게 연결)
  const bangL = makeMesh(geos.hairStrandLGeo, hairMat, 'wanderer_bang_L');
  head.add(bangL);
  const bangR = makeMesh(geos.hairStrandRGeo, hairMat, 'wanderer_bang_R');
  head.add(bangR);

  // 양쪽 귀 (바깥 귀 + 안쪽 귓바퀴 음영)
  for (const side of [-1, 1]) {
    const tag = side < 0 ? 'L' : 'R';
    const ear = makeMesh(geos.earGeo, skinMat, `ear_${tag}`);
    ear.position.set(side * 0.206, 0.164, 0.004);
    ear.scale.set(0.72, 1.02, 0.80);
    head.add(ear);

    const earInner = makeMesh(geos.earInnerGeo, earInnerMat, `ear_inner_${tag}`);
    earInner.position.set(side * 0.214, 0.164, -0.004);
    earInner.scale.set(0.55, 0.88, 0.65);
    head.add(earInner);
  }

  // === 양팔 (둥근 어깨 + 한복 배래 소매 + 속마감 + 통통한 5지 클레이 손) ===
  const buildArm = (side) => {
    const tag = side < 0 ? 'L' : 'R';
    const upper = new THREE.Group();
    upper.name = `upper_arm.${tag}`;
    upper.position.set(side * 0.168, 0.235, 0);
    chest.add(upper);

    const shoulderCap = makeMesh(geos.shoulderCapGeo, outerRobeMat, `saffron_shoulder_${tag}`);
    shoulderCap.scale.set(1.05, 0.96, 1.0);
    upper.add(shoulderCap);

    const upperMesh = makeMesh(geos.upperSleeveGeo, outerRobeMat, `saffron_upper_sleeve_${tag}`);
    upper.add(upperMesh);

    const forearm = new THREE.Group();
    forearm.name = `forearm.${tag}`;
    forearm.position.set(0, -0.23, 0);
    upper.add(forearm);

    const elbowCap = makeMesh(geos.elbowCapGeo, outerRobeMat, `saffron_elbow_${tag}`);
    forearm.add(elbowCap);

    const foreMesh = makeMesh(geos.foreSleeveGeo, outerRobeMat, `saffron_fore_sleeve_${tag}`);
    forearm.add(foreMesh);

    // 소매 끝 둥근 천 두께감 링 + 어두운 소매 속마감
    const sleeveRim = makeMesh(geos.sleeveRimGeo, outerRobeMat, `saffron_rim_${tag}`);
    sleeveRim.rotation.x = Math.PI * 0.5;
    sleeveRim.position.y = -0.228;
    forearm.add(sleeveRim);

    const sleeveInner = makeMesh(geos.sleeveInnerCapGeo, sleeveInnerMat, `saffron_sleeve_in_${tag}`);
    sleeveInner.rotation.x = Math.PI * 0.5;
    sleeveInner.position.y = -0.218;
    forearm.add(sleeveInner);

    const hand = new THREE.Group();
    hand.name = `hand.${tag}`;
    hand.position.set(0, -0.236, 0);
    forearm.add(hand);

    const palm = makeMesh(geos.palmGeo, skinMat, `hand_palm_${tag}`);
    palm.scale.set(0.92, 1.04, 0.68);
    hand.add(palm);

    // 엄지손가락 (안쪽 앞면)
    const thumb = makeMesh(geos.thumbGeo, skinMat, `hand_thumb_${tag}`);
    thumb.position.set(-side * 0.038, -0.008, -0.018);
    thumb.rotation.z = side * 0.62;
    thumb.rotation.x = -0.25;
    hand.add(thumb);

    // 4개 손가락 (검지·중지·약지·소지 — 시안의 앙증맞은 클레이 손 실루엣)
    const fingerSpecs = [
      { x: -side * 0.024, y: -0.044, z: -0.008, s: 0.96, rz: side * 0.08 },
      { x: -side * 0.007, y: -0.049, z: -0.004, s: 1.05, rz: side * 0.02 },
      { x:  side * 0.011, y: -0.046, z:  0.001, s: 0.98, rz: -side * 0.04 },
      { x:  side * 0.027, y: -0.038, z:  0.006, s: 0.82, rz: -side * 0.12 }
    ];
    fingerSpecs.forEach((f, idx) => {
      const finger = makeMesh(geos.fingerGeo, skinMat, `hand_finger_${idx}_${tag}`);
      finger.position.set(f.x, f.y, f.z);
      finger.scale.set(0.95, f.s, 0.95);
      finger.rotation.z = f.rz;
      finger.rotation.x = 0.08;
      hand.add(finger);
    });

    return { upper, forearm, hand };
  };
  const armL = buildArm(-1);
  const armR = buildArm(1);

  // === 양다리 (샌드베이지 항아리 한복 바지 + 발목 대님 + 크림 버선 + 고무신 & 밑창) ===
  const buildLeg = (side) => {
    const tag = side < 0 ? 'L' : 'R';
    const thigh = new THREE.Group();
    thigh.name = `thigh.${tag}`;
    thigh.position.set(side * 0.095, 0, 0);
    hips.add(thigh);

    const thighMesh = makeMesh(geos.thighGeo, trousersMat, `trouser_thigh_${tag}`);
    thigh.add(thighMesh);

    const shin = new THREE.Group();
    shin.name = `shin.${tag}`;
    shin.position.set(0, -0.22, 0);
    thigh.add(shin);

    const shinMesh = makeMesh(geos.shinGeo, trousersMat, `trouser_shin_${tag}`);
    shin.add(shinMesh);

    // 발목 대님(주름 띠)
    const daenim = makeMesh(geos.daenimGeo, trousersMat, `trouser_daenim_${tag}`);
    daenim.rotation.x = Math.PI * 0.5;
    daenim.position.set(0, -0.242, 0);
    shin.add(daenim);

    const sockMesh = makeMesh(geos.sockGeo, collarMat, `sock_${tag}`);
    sockMesh.position.set(0, -0.258, 0);
    shin.add(sockMesh);

    const foot = new THREE.Group();
    foot.name = `foot.${tag}`;
    foot.position.set(0, -0.285, 0);
    shin.add(foot);

    // 전통 고무신 본체 + 살짝 들린 앞코 + 발목 입구 테두리 + 밑창
    const shoeMesh = makeMesh(geos.shoeGeo, shoeMat, `shoe_${tag}`);
    shoeMesh.scale.set(0.92, 0.54, 1.44);
    shoeMesh.position.set(0, -0.009, -0.030);
    foot.add(shoeMesh);

    const shoeTip = makeMesh(geos.shoeTipGeo, shoeMat, `shoe_tip_${tag}`);
    shoeTip.scale.set(1.05, 0.68, 1.12);
    shoeTip.position.set(0, -0.002, -0.102);
    foot.add(shoeTip);

    const shoeCollar = makeMesh(geos.shoeCollarGeo, shoeMat, `shoe_collar_${tag}`);
    shoeCollar.rotation.x = Math.PI * 0.5;
    shoeCollar.position.set(0, 0.015, -0.006);
    foot.add(shoeCollar);

    const soleMesh = makeMesh(geos.soleGeo, soleMat, `sole_${tag}`);
    soleMesh.scale.set(0.94, 1.0, 1.46);
    soleMesh.position.set(0, -0.040, -0.034);
    foot.add(soleMesh);

    return { thigh, shin, foot };
  };
  const legL = buildLeg(-1);
  const legR = buildLeg(1);

  // === 애니메이션 상태 ===
  let mode = 'walk';
  let sitProgress = 0.0; // 0 = 기립(walk), 1 = 착석(kneel)
  let stance = 1.0;
  let walkPhase = 0;
  let smoothedSpeed = 0;
  let lastElapsed = 0;
  let greetStart = -999;
  let bowStart = -999;

  const smoothstep01 = (t) => {
    const s = Math.max(0, Math.min(1, t));
    return s * s * (3 - 2 * s);
  };

  const gestureEnvelope = (elapsed, start, duration) => {
    const u = (elapsed - start) / duration;
    if (u <= 0 || u >= 1) return 0;
    if (u < 0.28) return smoothstep01(u / 0.28);
    if (u <= 0.66) return 1;
    return smoothstep01((1 - u) / 0.34);
  };

  const lerp = (a, b, t) => a + (b - a) * t;

  const actor = {
    group,
    ready: null,
    isProceduralMonk: true,

    setMode(nextMode) {
      mode = nextMode === 'kneel' ? 'kneel' : 'walk';
    },

    greet(now) {
      greetStart = Number.isFinite(now) ? now : lastElapsed;
    },

    bow(now) {
      bowStart = Number.isFinite(now) ? now : lastElapsed;
    },

    captureMotion() {
      return { mode, stance, walkPhase };
    },

    update(elapsed = 0, dt = 0.016, normalizedSpeed = 0) {
      lastElapsed = elapsed;
      const targetSit = mode === 'kneel' ? 1.0 : 0.0;
      if (dt > 0) {
        const step = dt * 1.28;
        if (sitProgress < targetSit) {
          sitProgress = Math.min(targetSit, sitProgress + step);
        } else if (sitProgress > targetSit) {
          sitProgress = Math.max(targetSit, sitProgress - step * 1.15);
        }
      } else {
        sitProgress = targetSit;
      }
      const k = smoothstep01(sitProgress);
      stance = 1.0 - k;

      const rawSpeed = Math.max(0, Math.min(1.2, Number(normalizedSpeed) || 0));
      const speedBlend = dt > 0 ? 1 - Math.exp(-dt * 10.5) : 1.0;
      smoothedSpeed += (rawSpeed - smoothedSpeed) * speedBlend;
      const speed = smoothedSpeed < 0.005 ? 0 : smoothedSpeed;

      if (stance > 0.15 && speed > 0.005) {
        walkPhase += dt * (2.6 + speed * 4.4);
      }

      const w = stance;
      const sitTransitionLean = -Math.sin(k * Math.PI) * 0.14;

      const greetPulse = gestureEnvelope(elapsed, greetStart, 2.2);
      const bowPulse = gestureEnvelope(elapsed, bowStart, 2.3);
      const prayer = Math.max(greetPulse, bowPulse);
      const bowDepth = bowPulse > greetPulse ? 1.15 : 1.0;

      const sinP = Math.sin(walkPhase);
      const cosP = Math.cos(walkPhase);
      const stride = sinP * speed * w;
      const breath = Math.sin(elapsed * 1.45);

      // 보행 상하·좌우 중심 이동
      const walkBob = (Math.cos(walkPhase * 2) * 0.5 + 0.5) * 0.022 * speed * w;
      const hipSwayX = cosP * 0.014 * speed * w;
      hips.position.set(hipSwayX, baseHipsY + walkBob - 0.37 * k, 0);

      // 좌선 시 도포 자락·속옷·고름이 무릎과 방석 위로 자연스럽게 퍼지며, 보행 시 자락이 부드럽게 출렁임
      const hemSway = sinP * 0.035 * speed * w;
      lowerSkirt.scale.set(1 + 0.26 * k, 1 - 0.38 * k, 1 + 0.18 * k);
      lowerSkirt.position.y = 0.14 + 0.065 * k;
      lowerSkirt.rotation.set(hemSway * 0.5, 0, -cosP * 0.025 * speed * w);

      innerSkirt.scale.set(1 + 0.14 * k, 1 - 0.35 * k, 1 + 0.12 * k);
      innerSkirt.position.y = 0.14 + 0.055 * k;

      // 곡선 옷고름·허리띠 자락: 좌선 시 무릎 위로 짧아지고 살짝 앞으로 얹힘
      goreumTail1.scale.y = 1 - 0.44 * k;
      goreumTail1.rotation.x = -0.22 * k + hemSway * 0.8;
      goreumTail2.scale.y = 1 - 0.44 * k;
      goreumTail2.rotation.x = -0.20 * k + hemSway * 0.7;
      sashTail1.scale.y = 1 - 0.42 * k;
      sashTail1.rotation.x = -0.22 * k + hemSway * 0.8;
      sashTail2.scale.y = 1 - 0.42 * k;
      sashTail2.rotation.x = -0.18 * k + hemSway * 0.6;

      // 상체·고개
      const forwardLean = -0.045 * speed * w;
      hips.rotation.set(k * 0.04 + forwardLean * 0.4, stride * 0.075, sinP * 0.028 * speed * w);
      spine.rotation.set(
        k * 0.03 + forwardLean * 0.6 + sitTransitionLean + breath * 0.014 - prayer * 0.20 * bowDepth,
        -stride * 0.055,
        -sinP * 0.018 * speed * w
      );
      chest.rotation.set(
        k * 0.02 + sitTransitionLean * 0.55 + breath * 0.018 - prayer * 0.18 * bowDepth,
        -stride * 0.075,
        -sinP * 0.014 * speed * w
      );
      head.rotation.set(
        0.02 + k * 0.05 - forwardLean * 0.5 - breath * 0.012 - prayer * 0.26 * bowDepth,
        Math.sin(elapsed * 0.45) * 0.03 * k * (1 - prayer) + stride * 0.035,
        0
      );

      // 양다리: 자연스러운 보행 + 좌선 가부좌
      const thighAmp = 0.42;
      legL.thigh.rotation.set(stride * thighAmp + k * 1.48, 0, -k * 0.56);
      legR.thigh.rotation.set(-stride * thighAmp + k * 1.48, 0, k * 0.56);

      const leftSwingFlex = Math.pow(Math.max(0, cosP), 1.25) * 0.54;
      const rightSwingFlex = Math.pow(Math.max(0, -cosP), 1.25) * 0.54;
      const leftHeelCushion = Math.max(0, sinP) * 0.08;
      const rightHeelCushion = Math.max(0, -sinP) * 0.08;
      const leftKneeWalk = (leftSwingFlex + leftHeelCushion) * speed * w;
      const rightKneeWalk = (rightSwingFlex + rightHeelCushion) * speed * w;
      legL.shin.rotation.set(-leftKneeWalk - k * 0.12, 0, k * 1.48);
      legR.shin.rotation.set(-rightKneeWalk - k * 0.12, 0, -k * 1.48);

      const leftFootWalk = (sinP * 0.14 + Math.max(0, cosP) * 0.12) * speed * w;
      const rightFootWalk = (-sinP * 0.14 + Math.max(0, -cosP) * 0.12) * speed * w;
      legL.foot.rotation.set(leftFootWalk, 0, k * 0.25);
      legR.foot.rotation.set(rightFootWalk, 0, -k * 0.25);

      // 양팔·소매: 보행 흔들림 -> 좌선 선정인(단전 위 양손 포개기) -> 합장 인사
      const idleArmOut = 0.34 * w;
      const armAmp = 0.36;
      const baseUpperLX = -stride * armAmp + k * 0.36;
      const baseUpperRX = stride * armAmp + k * 0.36;
      const baseUpperLZ = -idleArmOut - k * 0.24;
      const baseUpperRZ = idleArmOut + k * 0.24;

      armL.upper.rotation.set(
        lerp(baseUpperLX, 0.78, prayer),
        0,
        lerp(baseUpperLZ, -0.16, prayer)
      );
      armR.upper.rotation.set(
        lerp(baseUpperRX, 0.78, prayer),
        0,
        lerp(baseUpperRZ, 0.16, prayer)
      );

      const leftElbowWalk = (0.12 + Math.max(0, -stride) * 0.28) * w;
      const rightElbowWalk = (0.12 + Math.max(0, stride) * 0.28) * w;
      const baseForeLX = leftElbowWalk + k * 1.06;
      const baseForeRX = rightElbowWalk + k * 1.06;

      armL.forearm.rotation.set(
        lerp(baseForeLX, 1.24, prayer),
        0,
        lerp(k * 0.98, 0.96, prayer)
      );
      armR.forearm.rotation.set(
        lerp(baseForeRX, 1.24, prayer),
        0,
        lerp(-k * 0.98, -0.96, prayer)
      );

      armL.hand.rotation.set(lerp(0, 0.14, prayer), lerp(0, -0.35, prayer), lerp(-k * 0.22, -0.30, prayer));
      armR.hand.rotation.set(lerp(0, 0.14, prayer), lerp(0, 0.35, prayer), lerp(k * 0.22, 0.30, prayer));
    }
  };

  actor.update(0, 0, 0);
  actor.ready = Promise.resolve(actor);
  return actor;
}
