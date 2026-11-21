/**
 * WandererActor — 삿갓(죽립), 괴나리봇짐·청자 표주박, 발밑 오라, 보폭 보정, 전통 도포 팔레트 및 말풍선 스프라이트 빌더
 */

const C_ENGINE = window.SANSA_CORE;

let sharedBambooWeaveTexture = null;
let sharedBubblePlaneGeo = null;
let sharedHatGeos = null;
let sharedBundleGeos = null;

function getSharedHatGeometries() {
  if (sharedHatGeos) return sharedHatGeos;
  // 시안 1(첨부 2)과 동일한 부드럽고 매끄러운 원뿔형 삿갓 + 둥근 테두리 + 볼을 감싸는 U자 턱끈
  const profilePoints = [
    new C_ENGINE.Vector2(0.001, 0.255),
    new C_ENGINE.Vector2(0.045, 0.228),
    new C_ENGINE.Vector2(0.145, 0.162),
    new C_ENGINE.Vector2(0.265, 0.082),
    new C_ENGINE.Vector2(0.365, 0.015),
    new C_ENGINE.Vector2(0.415, -0.012)
  ];
  sharedHatGeos = {
    coneGeo: new C_ENGINE.LatheGeometry(profilePoints, 36),
    rimHoopGeo: new C_ENGINE.TorusGeometry(0.412, 0.015, 10, 40),
    chinArcGeo: new C_ENGINE.TorusGeometry(0.198, 0.011, 8, 28, Math.PI * 1.06),
    bowKnotGeo: new C_ENGINE.SphereGeometry(0.022, 10, 8),
    bowLoopGeo: new C_ENGINE.SphereGeometry(0.026, 10, 8),
    bowTailGeo: new C_ENGINE.BoxGeometry(0.020, 0.068, 0.010)
  };
  return sharedHatGeos;
}

function getSharedBundleGeometries() {
  if (sharedBundleGeos) return sharedBundleGeos;
  // 시안 1의 복주머니형 크림색 괴나리봇짐 + 우측 하단 청자 표주박
  const sackPts = [
    new C_ENGINE.Vector2(0.001, -0.155),
    new C_ENGINE.Vector2(0.115, -0.148),
    new C_ENGINE.Vector2(0.175, -0.085),
    new C_ENGINE.Vector2(0.182, 0.005),
    new C_ENGINE.Vector2(0.145, 0.085),
    new C_ENGINE.Vector2(0.068, 0.138),
    new C_ENGINE.Vector2(0.045, 0.158),
    new C_ENGINE.Vector2(0.078, 0.195),
    new C_ENGINE.Vector2(0.020, 0.198)
  ];
  sharedBundleGeos = {
    sackGeo: new C_ENGINE.LatheGeometry(sackPts, 20),
    neckTieGeo: new C_ENGINE.TorusGeometry(0.048, 0.012, 8, 16),
    slingGeo: new C_ENGINE.TorusGeometry(0.135, 0.013, 8, 18, Math.PI * 0.95),
    gourdLowerGeo: new C_ENGINE.SphereGeometry(0.058, 14, 12),
    gourdUpperGeo: new C_ENGINE.SphereGeometry(0.036, 12, 10),
    gourdCorkGeo: new C_ENGINE.CylinderGeometry(0.010, 0.012, 0.024, 8)
  };
  return sharedBundleGeos;
}

export function getBambooWeaveTexture() {
  if (sharedBambooWeaveTexture) return sharedBambooWeaveTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // 시안 1의 곱고 따뜻한 연베이지 대나무 결 (어두운 격자 대신 은은한 미세 직조감)
  ctx.fillStyle = '#dec69e';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 6) {
    ctx.fillStyle = y % 12 === 0 ? 'rgba(155, 122, 76, 0.14)' : 'rgba(255, 246, 226, 0.16)';
    ctx.fillRect(0, y, 256, 3);
  }
  for (let x = 0; x < 256; x += 16) {
    ctx.fillStyle = 'rgba(130, 98, 56, 0.10)';
    ctx.fillRect(x, 0, 2, 256);
  }

  const tex = new C_ENGINE.CanvasTexture(canvas);
  tex.wrapS = C_ENGINE.RepeatWrapping;
  tex.wrapT = C_ENGINE.RepeatWrapping;
  tex.repeat.set(6, 4);
  tex.colorSpace = C_ENGINE.SRGBColorSpace;
  sharedBambooWeaveTexture = tex;
  return tex;
}

export function createSatgatHatMesh(palette, castShadow = true) {
  const hatGroup = new C_ENGINE.Group();
  hatGroup.name = 'WandererSatgatHat';

  const geos = getSharedHatGeometries();
  const weaveTex = getBambooWeaveTexture();
  const bambooColor = new C_ENGINE.Color(palette?.bambooTint || 0xd8be92);

  const outerBambooMat = new C_ENGINE.MeshStandardMaterial({
    color: bambooColor,
    map: weaveTex,
    roughness: 0.84,
    metalness: 0.01,
    side: C_ENGINE.FrontSide
  });

  const innerBambooMat = new C_ENGINE.MeshStandardMaterial({
    color: bambooColor.clone().multiplyScalar(0.76),
    map: weaveTex,
    roughness: 0.90,
    metalness: 0.01,
    side: C_ENGINE.BackSide
  });

  const rimMat = new C_ENGINE.MeshStandardMaterial({
    color: bambooColor.clone().multiplyScalar(0.86),
    roughness: 0.82,
    metalness: 0.01
  });

  // 시안 1처럼 어두운 갈색 살대나 꼭지 없이 매끄러운 연베이지 대나무 삿갓 본체 + 부드러운 둥근 테두리
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

  // 시안 1의 양 볼과 턱을 부드럽게 감싸는 베이지 면 턱끈(U자 아치) + 턱밑 리본 매듭
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
  chinKnot.position.set(0, -0.252, -0.095);
  hatGroup.add(chinKnot);

  [-1, 1].forEach((side) => {
    const loop = new C_ENGINE.Mesh(geos.bowLoopGeo, strapMat);
    loop.scale.set(1.3, 0.65, 0.55);
    loop.position.set(side * 0.028, -0.255, -0.098);
    loop.rotation.z = -side * 0.28;
    hatGroup.add(loop);

    const tail = new C_ENGINE.Mesh(geos.bowTailGeo, strapMat);
    tail.position.set(side * 0.022, -0.288, -0.102);
    tail.rotation.z = side * 0.30;
    hatGroup.add(tail);
  });

  hatGroup.userData.outerBambooMat = outerBambooMat;
  hatGroup.userData.innerBambooMat = innerBambooMat;

  return hatGroup;
}

export function createTravelerBackBundleMesh(palette, castShadow = true) {
  const bundleGroup = new C_ENGINE.Group();
  bundleGroup.name = 'WandererBackBundle';

  const geos = getSharedBundleGeometries();

  const clothMat = new C_ENGINE.MeshStandardMaterial({
    color: palette?.innerRobe || 0xe6dbc7,
    roughness: 0.88,
    metalness: 0.01
  });

  const strapMat = new C_ENGINE.MeshStandardMaterial({
    color: 0xdcd0bc,
    roughness: 0.85,
    metalness: 0.01
  });

  const gourdMat = new C_ENGINE.MeshStandardMaterial({
    color: 0x9ec0ae,
    roughness: 0.30,
    metalness: 0.06
  });

  const corkMat = new C_ENGINE.MeshStandardMaterial({
    color: 0x8b6745,
    roughness: 0.72
  });

  // 통통한 복주머니형 괴나리봇짐 본체 (등 뒤 중앙)
  const sackMesh = new C_ENGINE.Mesh(geos.sackGeo, clothMat);
  sackMesh.position.set(0, -0.02, 0.245);
  sackMesh.scale.set(1.06, 0.96, 0.86);
  sackMesh.castShadow = castShadow;
  sackMesh.receiveShadow = castShadow;
  bundleGroup.add(sackMesh);

  // 봇짐 목 묶음 매듭
  const neckTie = new C_ENGINE.Mesh(geos.neckTieGeo, strapMat);
  neckTie.rotation.x = Math.PI * 0.5;
  neckTie.position.set(0, 0.132, 0.245);
  bundleGroup.add(neckTie);

  // 양쪽 어깨에 부드럽게 걸리는 크림색 끈
  [-1, 1].forEach((side) => {
    const sling = new C_ENGINE.Mesh(geos.slingGeo, strapMat);
    sling.position.set(side * 0.125, 0.095, 0.115);
    sling.rotation.y = Math.PI * 0.5;
    sling.rotation.z = -0.35;
    bundleGroup.add(sling);
  });

  // 우측 하단에 매달린 영롱한 청자 호리병(표주박)
  const gourdLower = new C_ENGINE.Mesh(geos.gourdLowerGeo, gourdMat);
  gourdLower.position.set(0.165, -0.125, 0.215);
  gourdLower.castShadow = castShadow;
  bundleGroup.add(gourdLower);

  const gourdUpper = new C_ENGINE.Mesh(geos.gourdUpperGeo, gourdMat);
  gourdUpper.position.set(0.165, -0.052, 0.215);
  bundleGroup.add(gourdUpper);

  const gourdCork = new C_ENGINE.Mesh(geos.gourdCorkGeo, corkMat);
  gourdCork.position.set(0.165, -0.014, 0.215);
  bundleGroup.add(gourdCork);

  bundleGroup.userData.clothMat = clothMat;
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

      if (mName.includes('saffron') || oName.includes('saffron')) {
        mat.color.setHex(palette.outerRobe);
        mat.roughness = 0.85;
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
  if (!actor || !actor.group || normalizedSpeed <= 0.02) return;
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

export function createWandererBubbleSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(18, 22, 20, 0.86)';
  ctx.strokeStyle = 'rgba(255, 214, 138, 0.78)';
  ctx.lineWidth = 3;

  const rx = 24;
  const ry = 18;
  const rw = 464;
  const rh = 84;
  const rad = 42;
  ctx.beginPath();
  ctx.moveTo(rx + rad, ry);
  ctx.lineTo(rx + rw - rad, ry);
  ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rad);
  ctx.lineTo(rx + rw, ry + rh - rad);
  ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rad, ry + rh);
  ctx.lineTo(rx + rad, ry + rh);
  ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rad);
  ctx.lineTo(rx, ry + rad);
  ctx.quadraticCurveTo(rx, ry, rx + rad, ry);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.font = '600 28px "Pretendard", "Noto Serif KR", sans-serif';
  ctx.fillStyle = '#fff5df';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, ry + rh / 2 + 2);

  const texture = new C_ENGINE.CanvasTexture(canvas);
  texture.colorSpace = C_ENGINE.SRGBColorSpace;
  const mat = new C_ENGINE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: C_ENGINE.DoubleSide
  });
  if (!sharedBubblePlaneGeo) {
    sharedBubblePlaneGeo = new C_ENGINE.PlaneGeometry(1, 1);
  }
  const sprite = new C_ENGINE.Mesh(sharedBubblePlaneGeo, mat);
  sprite.scale.set(1.85, 0.46, 1);
  sprite.renderOrder = 25;
  sprite.frustumCulled = false;
  const parentQuat = new C_ENGINE.Quaternion();
  sprite.onBeforeRender = (_renderer, _scene, camera) => {
    if (!camera) return;
    if (sprite.parent) {
      sprite.parent.getWorldQuaternion(parentQuat);
      sprite.quaternion.copy(parentQuat).invert().multiply(camera.quaternion);
    } else {
      sprite.quaternion.copy(camera.quaternion);
    }
  };
  return sprite;
}
