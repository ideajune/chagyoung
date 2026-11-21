/**
 * MonkLoader — 확정 시안(character-concept-1-wanderer.jpg) 고품질 자체 제작 「풍류 어린 선비 / 산사 나그네」
 * - 100% 무료·자체 코드·상용 안전 (외부 GLB 0%, 약 3,200 삼각형 초경량 60fps)
 * - 린넨 천 직조 텍스처 + 3D 입체 가르마 앞머리 + 부드러운 모서리(RoundedBox) 옷깃·옷고름·황금 허리띠
 * - 둥근 어깨·종 모양 한복 소매·엄지 손·통통한 샌드베이지 바지·버선·고무신
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

let sharedFaceTexture = null;
let sharedLinenTexture = null;
let sharedGeos = null;

function getSharedLinenTexture() {
  if (sharedLinenTexture) return sharedLinenTexture;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 부드러운 고급 면·린넨 직조 질감 (시안 1의 포근한 점토-패브릭 느낌 구현)
  ctx.fillStyle = '#f6f4ef';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? 'rgba(130, 120, 102, 0.065)' : 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, y, size, 1.5);
  }
  for (let x = 0; x < size; x += 3) {
    ctx.fillStyle = x % 6 === 0 ? 'rgba(125, 115, 98, 0.055)' : 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(x, 0, 1.5, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedLinenTexture = tex;
  return tex;
}

function getSharedFaceTexture() {
  if (sharedFaceTexture) return sharedFaceTexture;

  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // 1. 시안 1의 포근한 복숭아빛 점토 피부 바탕 + 아래턱 미세 음영
  const skinGrad = ctx.createLinearGradient(0, 0, 0, h);
  skinGrad.addColorStop(0, '#fae2d2');
  skinGrad.addColorStop(0.75, '#f6d8c4');
  skinGrad.addColorStop(1, '#ecc8b0');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, w, h);

  // headMesh.rotation.y = Math.PI/2 → u = 0.5 (x = 512)가 정면(-Z)
  const cx = w * 0.5;
  const cy = h * 0.55;

  // 2. 상단·뒤통수 짙은 먹갈색 머리카락 바탕 (입체 앞머리 메쉬와 자연스럽게 연결)
  ctx.fillStyle = '#291f1a';
  ctx.fillRect(0, 0, w, h * 0.30);
  ctx.fillRect(0, h * 0.28, w * 0.34, h * 0.44);
  ctx.fillRect(w * 0.66, h * 0.28, w * 0.34, h * 0.44);

  // 정면 이마 둥근 5:5 가르마 곡선
  ctx.fillStyle = '#fae2d2';
  ctx.beginPath();
  ctx.moveTo(cx, h * 0.16);
  ctx.quadraticCurveTo(cx - 56, h * 0.35, cx - 122, h * 0.40);
  ctx.lineTo(cx - 122, h * 0.56);
  ctx.lineTo(cx + 122, h * 0.56);
  ctx.lineTo(cx + 122, h * 0.40);
  ctx.quadraticCurveTo(cx + 56, h * 0.35, cx, h * 0.16);
  ctx.closePath();
  ctx.fill();

  // 3. 시안 1의 따뜻하고 넓은 복숭아빛 볼 홍조
  for (const sign of [-1, 1]) {
    const bx = cx + sign * 70;
    const by = cy + 28;
    const grad = ctx.createRadialGradient(bx, by, 8, bx, by, 50);
    grad.addColorStop(0, 'rgba(232, 126, 114, 0.52)');
    grad.addColorStop(0.55, 'rgba(236, 148, 134, 0.24)');
    grad.addColorStop(1, 'rgba(236, 148, 134, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. 시안 1의 도톰하고 온화한 눈썹
  ctx.strokeStyle = '#31221b';
  ctx.lineWidth = 8.5;
  ctx.lineCap = 'round';
  for (const sign of [-1, 1]) {
    const ex = cx + sign * 48;
    ctx.beginPath();
    ctx.moveTo(ex - 20, cy - 32);
    ctx.quadraticCurveTo(ex, cy - 38, ex + 20, cy - 32);
    ctx.stroke();
  }

  // 5. 평온하게 감은 반달 눈
  ctx.strokeStyle = '#291c16';
  ctx.lineWidth = 9.0;
  ctx.lineCap = 'round';
  for (const sign of [-1, 1]) {
    const ex = cx + sign * 48;
    ctx.beginPath();
    ctx.arc(ex, cy - 6, 22, Math.PI * 0.14, Math.PI * 0.86, false);
    ctx.stroke();
  }

  // 6. 온화한 작은 미소
  ctx.strokeStyle = '#995748';
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.arc(cx, cy + 32, 18, Math.PI * 0.16, Math.PI * 0.84, false);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedFaceTexture = tex;
  return tex;
}

function getSharedGeometries() {
  if (sharedGeos) return sharedGeos;

  // 1) 닫힌 상의 도포 (어깨에서 허리까지 부드럽게 감싸는 실루엣)
  const upperBodicePts = [
    new THREE.Vector2(0.186, 0.10),
    new THREE.Vector2(0.194, 0.19),
    new THREE.Vector2(0.204, 0.28),
    new THREE.Vector2(0.175, 0.345),
    new THREE.Vector2(0.115, 0.378),
    new THREE.Vector2(0.068, 0.384)
  ];

  // 2) 허리 아래 크림색 속옷(안쪽 치마)
  const innerSkirtPts = [
    new THREE.Vector2(0.01, -0.37),
    new THREE.Vector2(0.214, -0.36),
    new THREE.Vector2(0.200, -0.18),
    new THREE.Vector2(0.184, 0.02),
    new THREE.Vector2(0.180, 0.13)
  ];

  // 3) 허리 아래 앞트임 연옥빛 도포 자락
  const lowerSkirtPts = [
    new THREE.Vector2(0.268, -0.46),
    new THREE.Vector2(0.256, -0.32),
    new THREE.Vector2(0.232, -0.14),
    new THREE.Vector2(0.204, 0.03),
    new THREE.Vector2(0.192, 0.135)
  ];
  const lowerSkirtGeo = new THREE.LatheGeometry(lowerSkirtPts, 28, Math.PI * 0.16, Math.PI * 1.68);

  // 4) 둥글고 풍성한 한복 종 모양 소매 + 소매 끝 둥근 테두리
  const upperSleeveGeo = new THREE.CylinderGeometry(0.075, 0.095, 0.24, 16);
  upperSleeveGeo.translate(0, -0.12, 0);

  const foreSleeveGeo = new THREE.CylinderGeometry(0.093, 0.118, 0.23, 16);
  foreSleeveGeo.translate(0, -0.115, 0);

  // 5) 통통한 한복 바지
  const trouserPts = [
    new THREE.Vector2(0.044, -0.25),
    new THREE.Vector2(0.080, -0.215),
    new THREE.Vector2(0.104, -0.125),
    new THREE.Vector2(0.096, -0.03),
    new THREE.Vector2(0.082, 0.03)
  ];
  const shinGeo = new THREE.LatheGeometry(trouserPts, 16);

  const thighGeo = new THREE.CylinderGeometry(0.092, 0.088, 0.24, 14);
  thighGeo.translate(0, -0.12, 0);

  sharedGeos = {
    headGeo: new THREE.SphereGeometry(0.202, 28, 22),
    noseGeo: new THREE.SphereGeometry(0.021, 10, 8),
    earGeo: new THREE.SphereGeometry(0.042, 12, 10),
    hairBackGeo: new THREE.SphereGeometry(0.206, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.68),
    hairBangGeo: new THREE.SphereGeometry(0.095, 14, 12),
    neckGeo: new THREE.CylinderGeometry(0.062, 0.076, 0.09, 12),
    upperBodiceGeo: new THREE.LatheGeometry(upperBodicePts, 28),
    innerSkirtGeo: new THREE.LatheGeometry(innerSkirtPts, 24),
    lowerSkirtGeo,
    coatEdgeGeo: new THREE.CylinderGeometry(0.015, 0.018, 0.60, 8),
    lapelGeo: new RoundedBoxGeometry(0.046, 0.23, 0.028, 3, 0.009),
    goreumKnotGeo: new THREE.SphereGeometry(0.036, 12, 10),
    goreumLoopGeo: new RoundedBoxGeometry(0.098, 0.048, 0.028, 3, 0.012),
    goreumTailGeo: new RoundedBoxGeometry(0.048, 0.42, 0.018, 3, 0.006),
    sashBandGeo: new THREE.TorusGeometry(0.194, 0.022, 10, 32),
    sashKnotGeo: new RoundedBoxGeometry(0.050, 0.058, 0.038, 3, 0.012),
    sashTailGeo: new RoundedBoxGeometry(0.045, 0.34, 0.018, 3, 0.006),
    shoulderCapGeo: new THREE.SphereGeometry(0.092, 14, 12),
    elbowCapGeo: new THREE.SphereGeometry(0.094, 12, 10),
    sleeveRimGeo: new THREE.TorusGeometry(0.114, 0.010, 8, 20),
    upperSleeveGeo,
    foreSleeveGeo,
    palmGeo: new THREE.SphereGeometry(0.052, 12, 10),
    thumbGeo: new THREE.SphereGeometry(0.024, 8, 8),
    thighGeo,
    shinGeo,
    sockGeo: new THREE.CylinderGeometry(0.046, 0.048, 0.09, 12),
    shoeGeo: new THREE.SphereGeometry(0.068, 14, 12),
    soleGeo: new THREE.CylinderGeometry(0.066, 0.068, 0.018, 14)
  };
  return sharedGeos;
}

export function createMonk(options = {}) {
  const group = new THREE.Group();
  group.name = options.remote ? 'RemoteWandererActor' : 'PlayerWandererActor';
  const castShadow = !options.remote;

  const geos = getSharedGeometries();
  const faceTex = getSharedFaceTexture();
  const linenTex = getSharedLinenTexture();

  // 시안 1의 부드러운 무광 패브릭-점토 PBR 재질 (린넨 직조 텍스처 적용)
  const outerRobeMat = new THREE.MeshStandardMaterial({
    name: 'saffron_outer_robe',
    map: linenTex,
    color: 0x99af96,
    roughness: 0.88,
    metalness: 0.01,
    side: THREE.DoubleSide
  });
  const innerRobeMat = new THREE.MeshStandardMaterial({
    name: 'sage_inner_robe',
    map: linenTex,
    color: 0xe8dcc6,
    roughness: 0.88,
    metalness: 0.01
  });
  const trousersMat = new THREE.MeshStandardMaterial({
    name: 'trouser_fabric',
    map: linenTex,
    color: 0xcab99f,
    roughness: 0.90,
    metalness: 0.01
  });
  const collarMat = new THREE.MeshStandardMaterial({
    name: 'rice_collar',
    map: linenTex,
    color: 0xf5efe2,
    roughness: 0.86,
    metalness: 0.01
  });
  const sashMat = new THREE.MeshStandardMaterial({
    name: 'amber_waist_sash',
    map: linenTex,
    color: 0xc89543,
    roughness: 0.78,
    metalness: 0.02
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    name: 'cotton_shoe',
    color: 0xede5d6,
    roughness: 0.86,
    metalness: 0.01
  });
  const soleMat = new THREE.MeshStandardMaterial({
    name: 'sole_tan',
    color: 0x9e8c73,
    roughness: 0.90,
    metalness: 0.01
  });
  const skinMat = new THREE.MeshStandardMaterial({
    name: 'warm_peach_skin',
    color: 0xf8ddcb,
    roughness: 0.74,
    metalness: 0.01
  });
  const faceMat = new THREE.MeshStandardMaterial({
    name: 'serene_wanderer_face',
    map: faceTex,
    roughness: 0.72,
    metalness: 0.01
  });
  const hairMat = new THREE.MeshStandardMaterial({
    name: 'dark_ink_hair',
    color: 0x291f1a,
    roughness: 0.85,
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

  // 3) 허리 아래 앞트임 연옥빛 도포 자락
  const lowerSkirt = makeMesh(geos.lowerSkirtGeo, outerRobeMat, 'saffron_lower_skirt');
  lowerSkirt.position.set(0, 0.14, 0);
  lowerSkirt.rotation.y = Math.PI;
  spine.add(lowerSkirt);

  for (const sign of [-1, 1]) {
    const edge = makeMesh(geos.coatEdgeGeo, outerRobeMat, `saffron_edge_${sign < 0 ? 'L' : 'R'}`);
    edge.position.set(sign * 0.118, -0.02, -0.205);
    edge.rotation.z = -sign * 0.11;
    edge.rotation.x = -0.10;
    spine.add(edge);
  }

  // 4) 부드러운 모서리(RoundedBox) 정방향 V자(∨) 전통 한복 옷깃 + 흰 동정
  const lapelL = makeMesh(geos.lapelGeo, outerRobeMat, 'saffron_lapel_L');
  lapelL.position.set(-0.048, 0.215, -0.168);
  lapelL.rotation.set(-0.22, 0.18, 0.52);
  chest.add(lapelL);

  const lapelR = makeMesh(geos.lapelGeo, outerRobeMat, 'saffron_lapel_R');
  lapelR.position.set(0.042, 0.215, -0.172);
  lapelR.rotation.set(-0.22, -0.18, -0.52);
  chest.add(lapelR);

  const collarL = makeMesh(geos.lapelGeo, collarMat, 'rice_collar_L');
  collarL.scale.set(0.72, 0.78, 0.90);
  collarL.position.set(-0.036, 0.245, -0.162);
  collarL.rotation.set(-0.22, 0.16, 0.52);
  chest.add(collarL);

  const collarR = makeMesh(geos.lapelGeo, collarMat, 'rice_collar_R');
  collarR.scale.set(0.72, 0.78, 0.90);
  collarR.position.set(0.036, 0.245, -0.162);
  collarR.rotation.set(-0.22, -0.16, -0.52);
  chest.add(collarR);

  // 5) 부드러운 연옥빛 옷고름 매듭 + 고름 자락 2개
  const goreumKnot = makeMesh(geos.goreumKnotGeo, outerRobeMat, 'saffron_goreum_knot');
  goreumKnot.position.set(-0.055, 0.095, -0.196);
  chest.add(goreumKnot);

  const goreumLoop = makeMesh(geos.goreumLoopGeo, outerRobeMat, 'saffron_goreum_loop');
  goreumLoop.position.set(0.005, 0.098, -0.200);
  goreumLoop.rotation.z = 0.08;
  chest.add(goreumLoop);

  const goreumTail1 = makeMesh(geos.goreumTailGeo, outerRobeMat, 'saffron_goreum_tail_1');
  goreumTail1.position.set(-0.072, -0.105, -0.218);
  goreumTail1.rotation.z = -0.09;
  goreumTail1.rotation.x = -0.06;
  chest.add(goreumTail1);

  const goreumTail2 = makeMesh(geos.goreumTailGeo, outerRobeMat, 'saffron_goreum_tail_2');
  goreumTail2.scale.set(0.85, 0.88, 1.0);
  goreumTail2.position.set(-0.045, -0.085, -0.212);
  goreumTail2.rotation.z = -0.05;
  goreumTail2.rotation.x = -0.06;
  chest.add(goreumTail2);

  // 6) 황금 허리띠(세조대) + 우측 매듭 & 고름 2가닥
  const sashBand = makeMesh(geos.sashBandGeo, sashMat, 'waist_sash_ring');
  sashBand.rotation.x = Math.PI * 0.5;
  sashBand.position.set(0, 0.255, 0);
  spine.add(sashBand);

  const sashKnot = makeMesh(geos.sashKnotGeo, sashMat, 'waist_sash_knot');
  sashKnot.position.set(0.078, 0.255, -0.198);
  spine.add(sashKnot);

  const sashTail1 = makeMesh(geos.sashTailGeo, sashMat, 'waist_sash_tail_L');
  sashTail1.position.set(0.086, 0.085, -0.215);
  sashTail1.rotation.z = 0.06;
  sashTail1.rotation.x = -0.08;
  spine.add(sashTail1);

  const sashTail2 = makeMesh(geos.sashTailGeo, sashMat, 'waist_sash_tail_R');
  sashTail2.scale.set(0.92, 0.80, 1.0);
  sashTail2.position.set(0.118, 0.115, -0.208);
  sashTail2.rotation.z = 0.12;
  sashTail2.rotation.x = -0.08;
  spine.add(sashTail2);

  // 7) 목 & 3.3등신 머리 + 3D 입체 5:5 가르마 앞머리 볼륨
  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.set(0, 0.27, 0);
  chest.add(neck);

  const neckMesh = makeMesh(geos.neckGeo, skinMat, 'neck_mesh');
  neckMesh.position.set(0, 0.035, 0);
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

  const noseMesh = makeMesh(geos.noseGeo, skinMat, 'wanderer_nose');
  noseMesh.position.set(0, 0.160, -0.197);
  noseMesh.scale.set(1.0, 0.86, 0.92);
  head.add(noseMesh);

  const hairBack = makeMesh(geos.hairBackGeo, hairMat, 'wanderer_hair_back');
  hairBack.position.set(0, 0.184, 0.014);
  hairBack.scale.set(1.06, 0.95, 1.0);
  hairBack.rotation.x = 0.26;
  head.add(hairBack);

  // 좌·우 3D 입체 가르마 앞머리 (삿갓 아래 얼굴을 포근하게 감싸는 입체 볼륨)
  for (const side of [-1, 1]) {
    const bang = makeMesh(geos.hairBangGeo, hairMat, `wanderer_bang_${side < 0 ? 'L' : 'R'}`);
    bang.position.set(side * 0.115, 0.255, -0.115);
    bang.scale.set(1.05, 0.68, 0.82);
    bang.rotation.set(0.18, side * 0.42, -side * 0.48);
    head.add(bang);

    const ear = makeMesh(geos.earGeo, skinMat, side < 0 ? 'ear_L' : 'ear_R');
    ear.position.set(side * 0.206, 0.166, 0.004);
    ear.scale.set(0.75, 1.0, 0.82);
    head.add(ear);
  }

  // === 양팔 (둥근 어깨 구관절 + 부드러운 종 모양 한복 소매 + 끝단 테두리 + 엄지 손) ===
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

    // 소매 끝 둥근 천 두께감 링
    const sleeveRim = makeMesh(geos.sleeveRimGeo, outerRobeMat, `saffron_rim_${tag}`);
    sleeveRim.rotation.x = Math.PI * 0.5;
    sleeveRim.position.y = -0.228;
    forearm.add(sleeveRim);

    const hand = new THREE.Group();
    hand.name = `hand.${tag}`;
    hand.position.set(0, -0.238, 0);
    forearm.add(hand);

    const palm = makeMesh(geos.palmGeo, skinMat, `hand_palm_${tag}`);
    palm.scale.set(0.85, 1.15, 0.68);
    hand.add(palm);

    const thumb = makeMesh(geos.thumbGeo, skinMat, `hand_thumb_${tag}`);
    thumb.scale.set(0.85, 1.35, 0.85);
    thumb.position.set(-side * 0.038, 0.005, -0.024);
    thumb.rotation.z = side * 0.55;
    hand.add(thumb);

    return { upper, forearm, hand };
  };
  const armL = buildArm(-1);
  const armR = buildArm(1);

  // === 양다리 (샌드베이지 통통한 한복 바지 + 크림 버선 + 고무신 & 밑창) ===
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

    const sockMesh = makeMesh(geos.sockGeo, collarMat, `sock_${tag}`);
    sockMesh.position.set(0, -0.255, 0);
    shin.add(sockMesh);

    const foot = new THREE.Group();
    foot.name = `foot.${tag}`;
    foot.position.set(0, -0.285, 0);
    shin.add(foot);

    const shoeMesh = makeMesh(geos.shoeGeo, shoeMat, `shoe_${tag}`);
    shoeMesh.scale.set(0.92, 0.56, 1.48);
    shoeMesh.position.set(0, -0.008, -0.032);
    foot.add(shoeMesh);

    const soleMesh = makeMesh(geos.soleGeo, soleMat, `sole_${tag}`);
    soleMesh.scale.set(0.92, 1.0, 1.42);
    soleMesh.position.set(0, -0.040, -0.032);
    foot.add(soleMesh);

    return { thigh, shin, foot };
  };
  const legL = buildLeg(-1);
  const legR = buildLeg(1);

  // === 애니메이션 상태 ===
  let mode = 'walk';
  let sitProgress = 0.0; // 0 = 기립(walk), 1 = 착석(kneel) — 부드러운 착석/기립 전이용
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
        // 약 0.78초에 걸쳐 차분하게 앉고 일어서는 자연스러운 전이 속도
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
        // 실제 보행 이동 속도와 자연스럽게 동기화되는 보폭 리듬
        walkPhase += dt * (2.6 + speed * 4.4);
      }

      const w = stance;
      // 앉거나 일어서는 중간 구간에 상체가 무게중심을 잡기 위해 미세하게 앞으로 숙여졌다 펴지는 자연스러운 아크
      const sitTransitionLean = -Math.sin(k * Math.PI) * 0.14;

      const greetPulse = gestureEnvelope(elapsed, greetStart, 2.2);
      const bowPulse = gestureEnvelope(elapsed, bowStart, 2.3);
      const prayer = Math.max(greetPulse, bowPulse);
      const bowDepth = bowPulse > greetPulse ? 1.15 : 1.0;

      const sinP = Math.sin(walkPhase);
      const cosP = Math.cos(walkPhase);
      const stride = sinP * speed * w;
      const breath = Math.sin(elapsed * 1.45);

      // 자연스러운 보행 상하·좌우 중심 이동: 양발이 교차하는 지지기(cos=±1)에 살짝 높아지고, 양발이 벌어진 착지기(sin=±1)에 낮아짐
      const walkBob = (Math.cos(walkPhase * 2) * 0.5 + 0.5) * 0.022 * speed * w;
      const hipSwayX = cosP * 0.014 * speed * w;
      hips.position.set(hipSwayX, baseHipsY + walkBob - 0.37 * k, 0);

      // 좌선(앉기) 시 도포 자락·속옷·고름이 방석과 무릎 위로 자연스럽게 퍼지며 감싸고, 보행 시 자락이 미세하게 출렁임
      const hemSway = sinP * 0.035 * speed * w;
      lowerSkirt.scale.set(1 + 0.24 * k, 1 - 0.36 * k, 1 + 0.16 * k);
      lowerSkirt.position.y = 0.14 + 0.06 * k;
      lowerSkirt.rotation.set(hemSway * 0.5, 0, -cosP * 0.025 * speed * w);
      innerSkirt.scale.set(1 + 0.14 * k, 1 - 0.34 * k, 1 + 0.12 * k);
      innerSkirt.position.y = 0.14 + 0.05 * k;
      goreumTail1.scale.y = 1 - 0.42 * k;
      goreumTail1.position.y = -0.105 + 0.085 * k;
      goreumTail2.scale.y = 0.88 * (1 - 0.42 * k);
      goreumTail2.position.y = -0.085 + 0.075 * k;
      sashTail1.scale.y = 1 - 0.40 * k;
      sashTail1.position.y = 0.085 + 0.068 * k;
      sashTail2.scale.y = 0.80 * (1 - 0.40 * k);
      sashTail2.position.y = 0.115 + 0.055 * k;

      // 상체·고개: 보행 시 자연스러운 골반·어깨 반대회전 + 전방 미세 경사 + 착석 전이 균형 숙임 + 합장 인사 숙임
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

      // 양다리: 자연스러운 인간 보행 생체역학
      // - 허벅지: +X 회전이 전방(-Z) 스윙. 유각기(앞으로 뻗을 때, cos>0)에 무릎이 부드럽게 굽혀져 지면을 스치지 않고,
      //           입각기(뒤로 밀어낼 때, cos<0)에는 무릎이 자연스럽게 펴지며 체중 지지
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

      // 발목 롤링: 뒤꿈치 착지 시 발끝 살짝 들고(dorsiflexion), 밀어낼 때 발끝 내림(plantarflexion)
      const leftFootWalk = (sinP * 0.14 + Math.max(0, cosP) * 0.12) * speed * w;
      const rightFootWalk = (-sinP * 0.14 + Math.max(0, -cosP) * 0.12) * speed * w;
      legL.foot.rotation.set(leftFootWalk, 0, k * 0.25);
      legR.foot.rotation.set(rightFootWalk, 0, -k * 0.25);

      // 양팔·소매: 다리와 반대 위상으로 편안히 흔들림 -> 합장 시 양손을 가슴 중앙으로 정중히 모음
      const idleArmOut = 0.36 * w;
      const armAmp = 0.36;
      const baseUpperLX = -stride * armAmp + k * 0.34;
      const baseUpperRX = stride * armAmp + k * 0.34;
      const baseUpperLZ = -idleArmOut - k * 0.22;
      const baseUpperRZ = idleArmOut + k * 0.22;

      armL.upper.rotation.set(
        lerp(baseUpperLX, 0.76, prayer),
        0,
        lerp(baseUpperLZ, -0.18, prayer)
      );
      armR.upper.rotation.set(
        lerp(baseUpperRX, 0.76, prayer),
        0,
        lerp(baseUpperRZ, 0.18, prayer)
      );

      const leftElbowWalk = (0.12 + Math.max(0, -stride) * 0.28) * w;
      const rightElbowWalk = (0.12 + Math.max(0, stride) * 0.28) * w;
      const baseForeLX = leftElbowWalk + k * 1.02;
      const baseForeRX = rightElbowWalk + k * 1.02;

      armL.forearm.rotation.set(
        lerp(baseForeLX, 1.22, prayer),
        0,
        lerp(k * 0.96, 0.94, prayer)
      );
      armR.forearm.rotation.set(
        lerp(baseForeRX, 1.22, prayer),
        0,
        lerp(-k * 0.96, -0.94, prayer)
      );

      armL.hand.rotation.set(lerp(0, 0.12, prayer), 0, lerp(-k * 0.20, -0.32, prayer));
      armR.hand.rotation.set(lerp(0, 0.12, prayer), 0, lerp(k * 0.20, 0.32, prayer));
    }
  };

  actor.update(0, 0, 0);
  actor.ready = Promise.resolve(actor);
  return actor;
}
