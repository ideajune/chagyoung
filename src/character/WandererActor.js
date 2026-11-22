/**
 * WandererActor — 삿갓(죽립), 괴나리봇짐·청자 표주박, 발밑 오라, 보폭 보정, 전통 도포 팔레트 및 말풍선 스프라이트 빌더
 */

import { SANSA_CORE as C_ENGINE } from '../engine/CoreRuntime.js';

let sharedBambooTextures = null;
let sharedClothBumpTexture = null;
let sharedBubblePlaneGeo = null;
let sharedHatGeos = null;
let sharedBundleGeos = null;

function getSharedHatGeometries() {
  if (sharedHatGeos) return sharedHatGeos;
  // 시안 1과 동일한 부드러운 원뿔형 삿갓 (꼭지 라운드 처리 + 우아한 곡선)
  const profilePoints = [
    new C_ENGINE.Vector2(0.001, 0.258),
    new C_ENGINE.Vector2(0.018, 0.252),
    new C_ENGINE.Vector2(0.055, 0.228),
    new C_ENGINE.Vector2(0.150, 0.162),
    new C_ENGINE.Vector2(0.268, 0.082),
    new C_ENGINE.Vector2(0.368, 0.015),
    new C_ENGINE.Vector2(0.418, -0.012)
  ];
  sharedHatGeos = {
    coneGeo: new C_ENGINE.LatheGeometry(profilePoints, 40),
    rimHoopGeo: new C_ENGINE.TorusGeometry(0.415, 0.015, 10, 44),
    chinArcGeo: new C_ENGINE.TorusGeometry(0.198, 0.011, 8, 30, Math.PI * 1.06),
    bowKnotGeo: new C_ENGINE.SphereGeometry(0.021, 10, 8),
    bowLoopGeo: new C_ENGINE.CapsuleGeometry(0.013, 0.022, 4, 8),
    bowTailGeo: new C_ENGINE.CapsuleGeometry(0.009, 0.048, 4, 6)
  };
  return sharedHatGeos;
}

function getSharedBundleGeometries() {
  if (sharedBundleGeos) return sharedBundleGeos;
  // 시안 1의 통통한 복주머니형 크림색 괴나리봇짐 + 상단 매듭 리본 + 청자 표주박 & 끈
  const sackPts = [
    new C_ENGINE.Vector2(0.001, -0.158),
    new C_ENGINE.Vector2(0.118, -0.150),
    new C_ENGINE.Vector2(0.178, -0.086),
    new C_ENGINE.Vector2(0.186, 0.005),
    new C_ENGINE.Vector2(0.148, 0.086),
    new C_ENGINE.Vector2(0.068, 0.138),
    new C_ENGINE.Vector2(0.044, 0.156),
    new C_ENGINE.Vector2(0.080, 0.194),
    new C_ENGINE.Vector2(0.022, 0.200)
  ];
  const strapCurveL = new C_ENGINE.CatmullRomCurve3([
    new C_ENGINE.Vector3(-0.042, 0.145, 0.235),
    new C_ENGINE.Vector3(-0.118, 0.192, 0.155),
    new C_ENGINE.Vector3(-0.148, 0.140, 0.025),
    new C_ENGINE.Vector3(-0.135, 0.030, 0.015),
    new C_ENGINE.Vector3(-0.098, -0.085, 0.155)
  ]);
  const strapCurveR = new C_ENGINE.CatmullRomCurve3([
    new C_ENGINE.Vector3(0.042, 0.145, 0.235),
    new C_ENGINE.Vector3(0.118, 0.192, 0.155),
    new C_ENGINE.Vector3(0.148, 0.140, 0.025),
    new C_ENGINE.Vector3(0.135, 0.030, 0.015),
    new C_ENGINE.Vector3(0.098, -0.085, 0.155)
  ]);
  const gourdCordCurve = new C_ENGINE.CatmullRomCurve3([
    new C_ENGINE.Vector3(0.125, -0.020, 0.235),
    new C_ENGINE.Vector3(0.152, -0.045, 0.228),
    new C_ENGINE.Vector3(0.165, -0.084, 0.215)
  ]);
  sharedBundleGeos = {
    sackGeo: new C_ENGINE.LatheGeometry(sackPts, 24),
    neckTieGeo: new C_ENGINE.TorusGeometry(0.048, 0.012, 8, 18),
    knotEarGeo: new C_ENGINE.CapsuleGeometry(0.018, 0.036, 4, 8),
    strapLGeo: new C_ENGINE.TubeGeometry(strapCurveL, 16, 0.013, 6, false),
    strapRGeo: new C_ENGINE.TubeGeometry(strapCurveR, 16, 0.013, 6, false),
    gourdLowerGeo: new C_ENGINE.SphereGeometry(0.060, 16, 14),
    gourdUpperGeo: new C_ENGINE.SphereGeometry(0.037, 14, 12),
    gourdWaistTieGeo: new C_ENGINE.TorusGeometry(0.028, 0.006, 6, 14),
    gourdCordGeo: new C_ENGINE.TubeGeometry(gourdCordCurve, 8, 0.005, 6, false),
    gourdCorkGeo: new C_ENGINE.CylinderGeometry(0.010, 0.012, 0.024, 10)
  };
  return sharedBundleGeos;
}

function getSharedClothBumpTexture() {
  if (sharedClothBumpTexture) return sharedClothBumpTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? '#969696' : '#6c6c6c';
    ctx.fillRect(0, y, size, 2);
  }
  for (let x = 0; x < size; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? 'rgba(185,185,185,0.45)' : 'rgba(90,90,90,0.45)';
    ctx.fillRect(x, 0, 2, size);
  }
  const tex = new C_ENGINE.CanvasTexture(canvas);
  tex.wrapS = C_ENGINE.RepeatWrapping;
  tex.wrapT = C_ENGINE.RepeatWrapping;
  tex.repeat.set(3, 3);
  sharedClothBumpTexture = tex;
  return tex;
}

export function getBambooWeaveTextures() {
  if (sharedBambooTextures) return sharedBambooTextures;

  const w = 512;
  const h = 512;

  // 1) Color canvas: LatheGeometry UV에서 u = 원주(방사형 대나무 살), v = 높이(동심원 엮임 결)
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = w;
  colorCanvas.height = h;
  const ctx = colorCanvas.getContext('2d');

  // 따뜻한 연베이지 대나무 바탕 (꼭지에서 테두리로 미세한 자연 음영)
  const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
  baseGrad.addColorStop(0, '#e3cca4');
  baseGrad.addColorStop(0.55, '#dac094');
  baseGrad.addColorStop(1, '#ccb082');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  // 촘촘한 동심원 대나무 엮임 줄 (수평)
  for (let y = 0; y < h; y += 8) {
    ctx.fillStyle = (y % 16 === 0) ? 'rgba(142, 108, 64, 0.16)' : 'rgba(255, 248, 232, 0.18)';
    ctx.fillRect(0, y, w, 3.5);
    ctx.fillStyle = 'rgba(116, 86, 48, 0.08)';
    ctx.fillRect(0, y + 4, w, 1.5);
  }

  // 시안 1의 정교한 방사형 대나무 살대 (수직)
  for (let x = 0; x < w; x += 16) {
    ctx.fillStyle = 'rgba(126, 94, 52, 0.17)';
    ctx.fillRect(x, 0, 2.5, h);
    ctx.fillStyle = 'rgba(255, 248, 230, 0.12)';
    ctx.fillRect(x + 2.5, 0, 1.5, h);
  }

  const map = new C_ENGINE.CanvasTexture(colorCanvas);
  map.wrapS = C_ENGINE.RepeatWrapping;
  map.wrapT = C_ENGINE.ClampToEdgeWrapping;
  map.repeat.set(2, 1);
  map.colorSpace = C_ENGINE.SRGBColorSpace;

  // 2) Bump canvas: 대나무 결·방사형 살대 미세 요철
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = w;
  bumpCanvas.height = h;
  const bCtx = bumpCanvas.getContext('2d');

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 8) {
    bCtx.fillStyle = (y % 16 === 0) ? '#9e9e9e' : '#646464';
    bCtx.fillRect(0, y, w, 4);
  }
  for (let x = 0; x < w; x += 16) {
    bCtx.fillStyle = 'rgba(215, 215, 215, 0.55)';
    bCtx.fillRect(x, 0, 3, h);
  }

  const bumpMap = new C_ENGINE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = C_ENGINE.RepeatWrapping;
  bumpMap.wrapT = C_ENGINE.ClampToEdgeWrapping;
  bumpMap.repeat.set(2, 1);

  sharedBambooTextures = { map, bumpMap };
  return sharedBambooTextures;
}

export function getBambooWeaveTexture() {
  return getBambooWeaveTextures().map;
}

export function createSatgatHatMesh(palette, castShadow = true) {
  const hatGroup = new C_ENGINE.Group();
  hatGroup.name = 'WandererSatgatHat';

  const geos = getSharedHatGeometries();
  const bambooTex = getBambooWeaveTextures();
  const bambooColor = new C_ENGINE.Color(palette?.bambooTint || 0xd8be92);

  const outerBambooMat = new C_ENGINE.MeshStandardMaterial({
    color: bambooColor,
    map: bambooTex.map,
    bumpMap: bambooTex.bumpMap,
    bumpScale: 0.008,
    roughness: 0.82,
    metalness: 0.01,
    side: C_ENGINE.FrontSide
  });

  const innerBambooMat = new C_ENGINE.MeshStandardMaterial({
    color: bambooColor.clone().multiplyScalar(0.74),
    map: bambooTex.map,
    roughness: 0.90,
    metalness: 0.01,
    side: C_ENGINE.BackSide
  });

  const rimMat = new C_ENGINE.MeshStandardMaterial({
    color: bambooColor.clone().multiplyScalar(0.84),
    roughness: 0.80,
    metalness: 0.01
  });

  const outerCone = new C_ENGINE.Mesh(geos.coneGeo, outerBambooMat);
  outerCone.castShadow = castShadow;
  outerCone.receiveShadow = castShadow;
  hatGroup.add(outerCone);

  const innerCone = new C_ENGINE.Mesh(geos.coneGeo, innerBambooMat);
  hatGroup.add(innerCone);

  const rimHoop = new C_ENGINE.Mesh(geos.rimHoopGeo, rimMat);
  rimHoop.rotation.x = Math.PI / 2;
  rimHoop.position.y = -0.012;
  hatGroup.add(rimHoop);

  // 양 볼과 턱을 부드럽게 감싸는 베이지 면 턱끈 + 턱밑 앙증맞은 나비 리본 매듭
  const strapMat = new C_ENGINE.MeshStandardMaterial({
    color: 0xcabaa3,
    roughness: 0.86,
    metalness: 0.01
  });

  const chinArc = new C_ENGINE.Mesh(geos.chinArcGeo, strapMat);
  chinArc.rotation.z = Math.PI * 0.97;
  chinArc.rotation.x = 0.24;
  chinArc.position.set(0, -0.055, -0.052);
  hatGroup.add(chinArc);

  const chinKnot = new C_ENGINE.Mesh(geos.bowKnotGeo, strapMat);
  chinKnot.position.set(0, -0.250, -0.095);
  hatGroup.add(chinKnot);

  [-1, 1].forEach((side) => {
    const loop = new C_ENGINE.Mesh(geos.bowLoopGeo, strapMat);
    loop.position.set(side * 0.026, -0.252, -0.098);
    loop.rotation.z = side * 1.18;
    loop.scale.set(1.0, 1.0, 0.72);
    hatGroup.add(loop);

    const tail = new C_ENGINE.Mesh(geos.bowTailGeo, strapMat);
    tail.position.set(side * 0.020, -0.282, -0.102);
    tail.rotation.z = side * 0.34;
    hatGroup.add(tail);
  });

  hatGroup.userData.outerBambooMat = outerBambooMat;
  hatGroup.userData.innerBambooMat = innerBambooMat;
  hatGroup.traverse((obj) => {
    if (obj.isMesh) obj.userData.hasClonedMat = true;
  });

  return hatGroup;
}

export function createTravelerBackBundleMesh(palette, castShadow = true) {
  const bundleGroup = new C_ENGINE.Group();
  bundleGroup.name = 'WandererBackBundle';

  const geos = getSharedBundleGeometries();
  const clothBump = getSharedClothBumpTexture();

  const clothMat = new C_ENGINE.MeshStandardMaterial({
    color: palette?.innerRobe || 0xe6dbc7,
    bumpMap: clothBump,
    bumpScale: 0.007,
    roughness: 0.88,
    metalness: 0.01
  });

  const strapMat = new C_ENGINE.MeshStandardMaterial({
    color: 0xdcd0bc,
    roughness: 0.85,
    metalness: 0.01
  });

  // 고려청자 영롱한 유약 광택(clearcoat)
  const gourdMat = new C_ENGINE.MeshPhysicalMaterial({
    color: 0x99bead,
    roughness: 0.22,
    metalness: 0.04,
    clearcoat: 0.85,
    clearcoatRoughness: 0.16
  });

  const corkMat = new C_ENGINE.MeshStandardMaterial({
    color: 0x8b6745,
    roughness: 0.72
  });

  const cordMat = new C_ENGINE.MeshStandardMaterial({
    color: 0x8d6e4c,
    roughness: 0.84
  });

  // 통통한 복주머니형 괴나리봇짐 본체 (등 뒤 중앙)
  const sackMesh = new C_ENGINE.Mesh(geos.sackGeo, clothMat);
  sackMesh.position.set(0, -0.02, 0.245);
  sackMesh.scale.set(1.06, 0.96, 0.86);
  sackMesh.castShadow = castShadow;
  sackMesh.receiveShadow = castShadow;
  bundleGroup.add(sackMesh);

  // 봇짐 목 묶음 매듭 + 시안 후면의 귀여운 상단 천 리본 귀 2개
  const neckTie = new C_ENGINE.Mesh(geos.neckTieGeo, strapMat);
  neckTie.rotation.x = Math.PI * 0.5;
  neckTie.position.set(0, 0.132, 0.245);
  bundleGroup.add(neckTie);

  [-1, 1].forEach((side) => {
    const knotEar = new C_ENGINE.Mesh(geos.knotEarGeo, strapMat);
    knotEar.position.set(side * 0.036, 0.158, 0.245);
    knotEar.rotation.z = -side * 0.88;
    knotEar.rotation.x = 0.15;
    bundleGroup.add(knotEar);
  });

  // 양쪽 어깨를 부드럽게 감싸는 곡선 천 끈
  const strapL = new C_ENGINE.Mesh(geos.strapLGeo, strapMat);
  const strapR = new C_ENGINE.Mesh(geos.strapRGeo, strapMat);
  bundleGroup.add(strapL, strapR);

  // 우측 하단에 매달린 영롱한 청자 호리병(표주박) + 허리 묶음 끈 + 봇짐 연결 끈
  const gourdLower = new C_ENGINE.Mesh(geos.gourdLowerGeo, gourdMat);
  gourdLower.position.set(0.165, -0.125, 0.215);
  gourdLower.castShadow = castShadow;
  bundleGroup.add(gourdLower);

  const gourdUpper = new C_ENGINE.Mesh(geos.gourdUpperGeo, gourdMat);
  gourdUpper.position.set(0.165, -0.052, 0.215);
  bundleGroup.add(gourdUpper);

  const gourdWaistTie = new C_ENGINE.Mesh(geos.gourdWaistTieGeo, cordMat);
  gourdWaistTie.rotation.x = Math.PI * 0.5;
  gourdWaistTie.position.set(0.165, -0.084, 0.215);
  bundleGroup.add(gourdWaistTie);

  const gourdCord = new C_ENGINE.Mesh(geos.gourdCordGeo, cordMat);
  bundleGroup.add(gourdCord);

  const gourdCork = new C_ENGINE.Mesh(geos.gourdCorkGeo, corkMat);
  gourdCork.position.set(0.165, -0.014, 0.215);
  bundleGroup.add(gourdCork);

  bundleGroup.userData.clothMat = clothMat;
  bundleGroup.traverse((obj) => {
    if (obj.isMesh) obj.userData.hasClonedMat = true;
  });
  return bundleGroup;
}

export function applyWandererPalette(actor, palette) {
  if (!actor || !actor.group || !palette) return;

  actor.group.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    if (obj.name === 'WandererFootAura') return;

    if (!obj.userData.hasClonedMat) {
      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map((m) => m.clone());
      } else {
        obj.material = obj.material.clone();
      }
      obj.userData.hasClonedMat = true;
    }

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((mat) => {
      const mName = (mat.name || '').toLowerCase();
      const oName = (obj.name || '').toLowerCase();

      if (mName.includes('sleeve_inner') || oName.includes('sleeve_in')) {
        mat.color.setHex(palette.outerRobe).multiplyScalar(0.56);
        mat.roughness = 0.94;
      } else if (mName.includes('saffron') || oName.includes('saffron')) {
        mat.color.setHex(palette.outerRobe);
        mat.roughness = 0.86;
      } else if (mName.includes('trouser') || oName.includes('trouser')) {
        mat.color.setHex(palette.trousers || palette.innerRobe);
        mat.roughness = 0.88;
      } else if (mName.includes('sage') || oName.includes('robe')) {
        mat.color.setHex(palette.innerRobe);
        mat.roughness = 0.86;
      } else if (mName.includes('rice') || oName.includes('collar')) {
        mat.color.setHex(palette.collar);
      } else if (mName.includes('shoe') || oName.includes('shoe')) {
        mat.color.setHex(palette.shoes);
      }
    });
  });

  if (actor.satgatHat?.userData?.outerBambooMat) {
    const c = new C_ENGINE.Color(palette.bambooTint);
    actor.satgatHat.userData.outerBambooMat.color.copy(c);
    actor.satgatHat.userData.innerBambooMat.color.copy(c).multiplyScalar(0.68);
  }
  if (actor.backBundle?.userData?.clothMat) {
    actor.backBundle.userData.clothMat.color.setHex(palette.innerRobe);
  }
}

export function equipWandererActor(actor, palette, isSelf = false, initialMode = 'walk') {
  if (!actor || !actor.group) return;

  actor.setMode(initialMode);
  actor.update(0, 0.016, 0);
  actor.group.updateWorldMatrix(true, true);

  if (!isSelf) {
    actor.group.traverse((obj) => {
      if (obj.isMesh) obj.castShadow = false;
    });
  }

  const headBone = actor.group.getObjectByName('head');
  const chestBone = actor.group.getObjectByName('chest');

  if (headBone) {
    const oldHat = headBone.getObjectByName('WandererSatgatHat');
    if (oldHat) headBone.remove(oldHat);

    const satgat = createSatgatHatMesh(palette, isSelf);
    // 시안 1과 동일하게 이마 위까지 쏙 눌러쓴 자연스러운 밀착 위치
    satgat.position.set(0, 0.245, 0.008);
    satgat.rotation.x = -0.04;

    const satgatTopAnchor = new C_ENGINE.Object3D();
    satgatTopAnchor.name = 'SatgatTopAnchor';
    satgatTopAnchor.position.set(0, 0.32, 0);
    satgat.add(satgatTopAnchor);

    headBone.add(satgat);
    actor.satgatHat = satgat;
    actor.satgatTopAnchor = satgatTopAnchor;
  }

  if (chestBone) {
    const oldBundle = chestBone.getObjectByName('WandererBackBundle');
    if (oldBundle) chestBone.remove(oldBundle);

    const backBundle = createTravelerBackBundleMesh(palette, isSelf);
    chestBone.add(backBundle);
    actor.backBundle = backBundle;
  }

  let footDisc = actor.group.getObjectByName('WandererFootAura');
  if (!footDisc) {
    footDisc = new C_ENGINE.Mesh(
      new C_ENGINE.RingGeometry(0.20, 0.32, 36),
      new C_ENGINE.MeshBasicMaterial({
        color: isSelf ? 0xffd27d : 0xa8d8b9,
        transparent: true,
        opacity: isSelf ? 0.45 : 0.22,
        side: C_ENGINE.DoubleSide,
        depthWrite: false
      })
    );
    footDisc.name = 'WandererFootAura';
    footDisc.rotation.x = -Math.PI / 2;
    footDisc.position.y = 0.025;
    actor.group.add(footDisc);
  }

  applyWandererPalette(actor, palette);
}

export function applyWiderWalkingStride(actor, normalizedSpeed) {
  if (!actor || !actor.group || actor.isProceduralMonk || normalizedSpeed <= 0.02) return;
  const motion = actor.captureMotion ? actor.captureMotion() : null;
  if (motion && (motion.mode !== 'walk' || motion.stance < 0.25)) return;

  if (!actor._strideBones) {
    actor.setMode('walk');
    actor.update(0, 0, 0);
    const names = [
      'thighL',
      'thighR',
      'shinL',
      'shinR',
      'footL',
      'footR',
      'upper_armL',
      'upper_armR'
    ];
    const map = {};
    for (const name of names) {
      const bone =
        actor.group.getObjectByName(name) ||
        actor.group.getObjectByName(name.replace(/([LR])$/, '.$1'));
      if (bone) {
        map[name] = {
          bone,
          restQuat: bone.quaternion.clone()
        };
      }
    }
    actor._strideBones = map;
  }

  const bones = actor._strideBones;
  const legBoost = 0.34 * normalizedSpeed;
  const armBoost = 0.26 * normalizedSpeed;

  for (const key of ['thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR']) {
    const entry = bones[key];
    if (entry && entry.bone) {
      entry.bone.quaternion.slerp(entry.restQuat, -legBoost);
    }
  }
  for (const key of ['upper_armL', 'upper_armR']) {
    const entry = bones[key];
    if (entry && entry.bone) {
      entry.bone.quaternion.slerp(entry.restQuat, -armBoost);
    }
  }
}
