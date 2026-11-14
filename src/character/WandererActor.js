/**
 * WandererActor — 삿갓(죽립), 괴나리봇짐·청자 표주박, 발밑 오라, 보폭 보정, 전통 도포 팔레트 및 말풍선 스프라이트 빌더
 */

const C_ENGINE = window.SANSA_CORE;

let sharedBambooWeaveTexture = null;
let sharedBubblePlaneGeo = null;

export function getBambooWeaveTexture() {
  if (sharedBambooWeaveTexture) return sharedBambooWeaveTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#d4b272';
  ctx.fillRect(0, 0, 256, 256);

  const step = 8;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      const odd = (x / step + y / step) % 2 === 0;
      ctx.fillStyle = odd ? 'rgba(115, 76, 26, 0.26)' : 'rgba(255, 240, 200, 0.24)';
      ctx.fillRect(x, y, step - 1, step - 1);

      ctx.strokeStyle = 'rgba(70, 44, 14, 0.30)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, step - 1, step - 1);
    }
  }

  for (let y = 24; y < 256; y += 36) {
    ctx.fillStyle = 'rgba(65, 40, 10, 0.28)';
    ctx.fillRect(0, y, 256, 3);
  }

  const tex = new C_ENGINE.CanvasTexture(canvas);
  tex.wrapS = C_ENGINE.RepeatWrapping;
  tex.wrapT = C_ENGINE.RepeatWrapping;
  tex.repeat.set(4, 3);
  tex.colorSpace = C_ENGINE.SRGBColorSpace;
  sharedBambooWeaveTexture = tex;
  return tex;
}

export function createSatgatHatMesh(palette) {
  const hatGroup = new C_ENGINE.Group();
  hatGroup.name = 'WandererSatgatHat';

  const weaveTex = getBambooWeaveTexture();
  const bambooColor = new C_ENGINE.Color(palette?.bambooTint || 0xd4b475);

  const outerBambooMat = new C_ENGINE.MeshStandardMaterial({
    color: bambooColor,
    map: weaveTex,
    roughness: 0.76,
    metalness: 0.04,
    side: C_ENGINE.FrontSide
  });

  const innerBambooMat = new C_ENGINE.MeshStandardMaterial({
    color: bambooColor.clone().multiplyScalar(0.68),
    map: weaveTex,
    roughness: 0.86,
    metalness: 0.02,
    side: C_ENGINE.BackSide
  });

  const darkBambooRibMat = new C_ENGINE.MeshStandardMaterial({
    color: 0x54381a,
    roughness: 0.72,
    metalness: 0.05
  });

  const profilePoints = [
    new C_ENGINE.Vector2(0.001, 0.265),
    new C_ENGINE.Vector2(0.075, 0.225),
    new C_ENGINE.Vector2(0.180, 0.160),
    new C_ENGINE.Vector2(0.305, 0.082),
    new C_ENGINE.Vector2(0.415, 0.015),
    new C_ENGINE.Vector2(0.455, -0.012)
  ];

  const coneGeo = new C_ENGINE.LatheGeometry(profilePoints, 36);
  const outerCone = new C_ENGINE.Mesh(coneGeo, outerBambooMat);
  outerCone.castShadow = true;
  outerCone.receiveShadow = true;
  hatGroup.add(outerCone);

  const innerCone = new C_ENGINE.Mesh(coneGeo, innerBambooMat);
  hatGroup.add(innerCone);

  const rimHoop = new C_ENGINE.Mesh(
    new C_ENGINE.TorusGeometry(0.453, 0.011, 10, 40),
    darkBambooRibMat
  );
  rimHoop.rotation.x = Math.PI / 2;
  rimHoop.position.y = -0.012;
  rimHoop.castShadow = true;
  hatGroup.add(rimHoop);

  const midHoop = new C_ENGINE.Mesh(
    new C_ENGINE.TorusGeometry(0.275, 0.0065, 8, 32),
    darkBambooRibMat
  );
  midHoop.rotation.x = Math.PI / 2;
  midHoop.position.y = 0.095;
  hatGroup.add(midHoop);

  const ribCount = 12;
  for (let i = 0; i < ribCount; i++) {
    const angle = (i / ribCount) * Math.PI * 2;
    const rib = new C_ENGINE.Mesh(
      new C_ENGINE.CylinderGeometry(0.0032, 0.005, 0.50, 6),
      darkBambooRibMat
    );
    rib.position.set(Math.sin(angle) * 0.225, 0.118, Math.cos(angle) * 0.225);
    const dir = new C_ENGINE.Vector3(
      Math.sin(angle) * 0.45,
      -0.27,
      Math.cos(angle) * 0.45
    ).normalize();
    rib.quaternion.setFromUnitVectors(new C_ENGINE.Vector3(0, 1, 0), dir);
    hatGroup.add(rib);
  }

  const finial = new C_ENGINE.Mesh(
    new C_ENGINE.CylinderGeometry(0.015, 0.035, 0.038, 12),
    darkBambooRibMat
  );
  finial.position.y = 0.268;
  finial.castShadow = true;
  hatGroup.add(finial);

  const strapMat = new C_ENGINE.MeshStandardMaterial({
    color: 0x24201c,
    roughness: 0.85
  });
  [-1, 1].forEach((side) => {
    const strap = new C_ENGINE.Mesh(
      new C_ENGINE.CylinderGeometry(0.0055, 0.0055, 0.26, 6),
      strapMat
    );
    strap.position.set(side * 0.165, -0.10, -0.03);
    strap.rotation.z = side * 0.42;
    strap.rotation.x = 0.12;
    hatGroup.add(strap);
  });

  hatGroup.userData.outerBambooMat = outerBambooMat;
  hatGroup.userData.innerBambooMat = innerBambooMat;

  return hatGroup;
}

export function createTravelerBackBundleMesh(palette) {
  const bundleGroup = new C_ENGINE.Group();
  bundleGroup.name = 'WandererBackBundle';

  const clothMat = new C_ENGINE.MeshStandardMaterial({
    color: palette?.innerRobe || 0xd8d2c5,
    roughness: 0.84,
    metalness: 0.02
  });

  const strapMat = new C_ENGINE.MeshStandardMaterial({
    color: 0x3b2c1e,
    roughness: 0.78,
    metalness: 0.04
  });

  const gourdMat = new C_ENGINE.MeshStandardMaterial({
    color: 0x8fb8a2,
    roughness: 0.35,
    metalness: 0.08
  });

  const tasselMat = new C_ENGINE.MeshStandardMaterial({
    color: 0xc85a32,
    roughness: 0.65
  });

  const packRoll = new C_ENGINE.Mesh(
    new C_ENGINE.CylinderGeometry(0.068, 0.068, 0.30, 16),
    clothMat
  );
  packRoll.rotation.z = Math.PI / 2;
  packRoll.rotation.y = 0.10;
  packRoll.position.set(0, 0.05, 0.195);
  packRoll.castShadow = true;
  packRoll.receiveShadow = true;
  bundleGroup.add(packRoll);

  [-1, 1].forEach((side) => {
    const cap = new C_ENGINE.Mesh(new C_ENGINE.SphereGeometry(0.066, 12, 12), clothMat);
    cap.scale.set(0.65, 0.95, 0.95);
    cap.position.set(side * 0.15, 0.05, 0.195 - side * 0.015);
    bundleGroup.add(cap);

    const ring = new C_ENGINE.Mesh(new C_ENGINE.TorusGeometry(0.069, 0.008, 8, 20), strapMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(side * 0.085, 0.05, 0.195);
    bundleGroup.add(ring);
  });

  [-1, 1].forEach((side) => {
    const sling = new C_ENGINE.Mesh(
      new C_ENGINE.CylinderGeometry(0.010, 0.010, 0.26, 6),
      strapMat
    );
    sling.position.set(side * 0.085, 0.03, 0.135);
    sling.rotation.z = side * 0.42;
    sling.rotation.x = -0.35;
    bundleGroup.add(sling);
  });

  const gourdLower = new C_ENGINE.Mesh(new C_ENGINE.SphereGeometry(0.044, 12, 12), gourdMat);
  gourdLower.position.set(0.11, -0.045, 0.215);
  gourdLower.castShadow = true;
  bundleGroup.add(gourdLower);

  const gourdUpper = new C_ENGINE.Mesh(new C_ENGINE.SphereGeometry(0.029, 12, 12), gourdMat);
  gourdUpper.position.set(0.11, 0.008, 0.215);
  bundleGroup.add(gourdUpper);

  const gourdCork = new C_ENGINE.Mesh(
    new C_ENGINE.CylinderGeometry(0.009, 0.011, 0.022, 8),
    tasselMat
  );
  gourdCork.position.set(0.11, 0.038, 0.215);
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
        mat.roughness = 0.82;
      } else if (mName.includes('sage') || oName.includes('trousers') || oName.includes('robe')) {
        mat.color.setHex(palette.innerRobe);
        mat.roughness = 0.85;
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

export function equipWandererActor(actor, palette, isSelf = false) {
  if (!actor || !actor.group) return;

  actor.setMode('walk');
  actor.update(0, 0.016, 0);
  actor.group.updateWorldMatrix(true, true);

  const headBone = actor.group.getObjectByName('head');
  const chestBone = actor.group.getObjectByName('chest');

  if (headBone) {
    const oldHat = headBone.getObjectByName('WandererSatgatHat');
    if (oldHat) headBone.remove(oldHat);

    const satgat = createSatgatHatMesh(palette);
    satgat.position.set(0, 0.30, 0.02);
    satgat.rotation.x = -0.12;

    const satgatTopAnchor = new C_ENGINE.Object3D();
    satgatTopAnchor.name = 'SatgatTopAnchor';
    satgatTopAnchor.position.set(0, 0.34, 0);
    satgat.add(satgatTopAnchor);

    headBone.add(satgat);
    actor.satgatHat = satgat;
    actor.satgatTopAnchor = satgatTopAnchor;
  }

  if (chestBone) {
    const oldBundle = chestBone.getObjectByName('WandererBackBundle');
    if (oldBundle) chestBone.remove(oldBundle);

    const backBundle = createTravelerBackBundleMesh(palette);
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
