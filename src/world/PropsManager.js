/**
 * PropsManager — 인터랙티브 3D 청동 풍경종, 안양루 소원 연등, 낙엽(단풍잎) InstancedMesh, 음파 링·합장 파티클 및 레이캐스팅 관리
 */

import { LANTERN_COLORS } from '../config/constants.js';
import { COURTYARD_CONFIG } from '../config/worldConfig.js';

const C_ENGINE = window.SANSA_CORE;

export class PropsManager {
  constructor(sceneManager, materials) {
    this.sceneManager = sceneManager;
    this.materials = materials;

    this.raycaster = new C_ENGINE.Raycaster();
    this.mouseNDC = new C_ENGINE.Vector2();

    this.interactiveTargets = [];
    this.lanternMeshes = [];
    this.sonicRings = [];
    this.hapjangParticles = [];
    this.bellExcitation = 0;

    this.initInteractiveWindBell();
    this.initFallingFoliage3D();
  }

  initInteractiveWindBell() {
    const [bx, by, bz] = COURTYARD_CONFIG.windBellPos;
    this.windBellPivot = new C_ENGINE.Group();
    this.windBellPivot.position.set(bx, by, bz);

    const chainGeo = new C_ENGINE.CylinderGeometry(0.014, 0.014, 0.52, 8);
    const chainMesh = new C_ENGINE.Mesh(chainGeo, this.materials.matBronze);
    chainMesh.position.y = -0.26;
    this.windBellPivot.add(chainMesh);

    const bellPts = [
      new C_ENGINE.Vector2(0.01, 0),
      new C_ENGINE.Vector2(0.2, -0.05),
      new C_ENGINE.Vector2(0.26, -0.26),
      new C_ENGINE.Vector2(0.33, -0.54),
      new C_ENGINE.Vector2(0.37, -0.62),
      new C_ENGINE.Vector2(0.3, -0.62)
    ];
    const bellGeo = new C_ENGINE.LatheGeometry(bellPts, 28);
    const bellMesh = new C_ENGINE.Mesh(bellGeo, this.materials.matBronze);
    bellMesh.position.y = -0.48;
    bellMesh.castShadow = true;
    bellMesh.userData = { type: 'windbell', label: '🔔 처마 끝 풍경종 울리기' };
    this.windBellPivot.add(bellMesh);
    this.interactiveTargets.push(bellMesh);

    const bellHitbox = new C_ENGINE.Mesh(
      new C_ENGINE.SphereGeometry(0.85, 8, 8),
      new C_ENGINE.MeshBasicMaterial({ visible: false })
    );
    bellHitbox.position.y = -0.82;
    bellHitbox.userData = { type: 'windbell', label: '🔔 처마 끝 풍경종 울리기' };
    this.windBellPivot.add(bellHitbox);
    this.interactiveTargets.push(bellHitbox);

    this.windFishPivot = new C_ENGINE.Group();
    this.windFishPivot.position.y = -1.12;

    const lowerCord = new C_ENGINE.Mesh(
      new C_ENGINE.CylinderGeometry(0.01, 0.01, 0.5, 6),
      this.materials.matBronze
    );
    lowerCord.position.y = 0.18;
    this.windFishPivot.add(lowerCord);

    const fishShape = new C_ENGINE.Shape();
    fishShape.moveTo(0, 0.22);
    fishShape.quadraticCurveTo(0.26, 0.05, 0.15, -0.26);
    fishShape.lineTo(0.3, -0.45);
    fishShape.lineTo(0.04, -0.34);
    fishShape.lineTo(-0.04, -0.34);
    fishShape.lineTo(-0.3, -0.45);
    fishShape.lineTo(-0.15, -0.26);
    fishShape.quadraticCurveTo(-0.26, 0.05, 0, 0.22);

    const fishGeo = new C_ENGINE.ExtrudeGeometry(fishShape, {
      depth: 0.028,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008
    });
    const fishMat = new C_ENGINE.MeshStandardMaterial({
      color: 0xd9a760,
      roughness: 0.28,
      metalness: 0.85
    });
    const fishMesh = new C_ENGINE.Mesh(fishGeo, fishMat);
    fishMesh.position.set(0, -0.1, -0.014);
    fishMesh.userData = { type: 'windbell', label: '🔔 처마 끝 풍경종 울리기' };
    this.windFishPivot.add(fishMesh);
    this.interactiveTargets.push(fishMesh);

    this.windBellPivot.add(this.windFishPivot);
    this.sceneManager.scene.add(this.windBellPivot);
  }

  initFallingFoliage3D() {
    this.leafCount = this.sceneManager.isMobile ? 48 : 96;
    this.leafDummy = new C_ENGINE.Object3D();
    this.leafData = [];

    const leafGeo = new C_ENGINE.PlaneGeometry(0.24, 0.24, 3, 3);
    const lPos = leafGeo.getAttribute('position');
    for (let i = 0; i < lPos.count; i++) {
      const lx = lPos.getX(i);
      const ly = lPos.getY(i);
      const curlZ = (lx * lx * 1.4 - ly * ly * 0.6) * 0.45;
      lPos.setZ(i, curlZ);
    }
    leafGeo.computeVertexNormals();

    this.leafInstancedMat = new C_ENGINE.MeshStandardMaterial({
      map: this.materials.mapleLeafTex,
      color: 0xe86434,
      alphaTest: 0.18,
      transparent: true,
      side: C_ENGINE.DoubleSide,
      roughness: 0.65,
      metalness: 0.02
    });

    this.leafInstancedMesh = new C_ENGINE.InstancedMesh(
      leafGeo,
      this.leafInstancedMat,
      this.leafCount
    );
    this.leafInstancedMesh.raycast = () => {};

    const leafPalette = [
      new C_ENGINE.Color(0xff5e2b),
      new C_ENGINE.Color(0xe6391b),
      new C_ENGINE.Color(0xf59e0b),
      new C_ENGINE.Color(0xd94826),
      new C_ENGINE.Color(0xff8438)
    ];

    for (let i = 0; i < this.leafCount; i++) {
      this.leafInstancedMesh.setColorAt(i, leafPalette[i % leafPalette.length]);
      this.leafData.push({
        x: (Math.random() - 0.5) * 34,
        y: Math.random() * 9.0,
        z: 6 - Math.random() * 29,
        vx: 0.25 + Math.random() * 0.48,
        vy: -0.34 - Math.random() * 0.36,
        vz: (Math.random() - 0.5) * 0.34,
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        spinX: (Math.random() - 0.5) * 2.4,
        spinY: (Math.random() - 0.5) * 2.2,
        spinZ: (Math.random() - 0.5) * 1.8,
        scale: 0.78 + Math.random() * 0.52,
        phase: Math.random() * Math.PI * 2
      });
    }
    if (this.leafInstancedMesh.instanceColor) {
      this.leafInstancedMesh.instanceColor.needsUpdate = true;
    }
    this.sceneManager.fxRoot.add(this.leafInstancedMesh);
  }

  rebuild3DLanterns(allWishes, activeWishId) {
    const lanternsRoot = this.sceneManager.lanternsRoot;
    while (lanternsRoot.children.length > 0) {
      lanternsRoot.remove(lanternsRoot.children[0]);
    }
    this.lanternMeshes = [];
    this.interactiveTargets = this.interactiveTargets.filter(
      (obj) => obj.userData?.type === 'windbell'
    );

    const spaceWishes = allWishes.filter(
      (w) => !w.space || w.space === 'cheongpungsa' || w.space === 'buseoksa'
    );
    const total = spaceWishes.length;
    if (total === 0) return;

    const lanternPts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const y = (t - 0.5) * 0.58;
      const r = 0.085 + Math.sin(t * Math.PI) * 0.2;
      lanternPts.push(new C_ENGINE.Vector2(r, y));
    }
    const bodyGeo = new C_ENGINE.LatheGeometry(lanternPts, 24);
    const capGeo = new C_ENGINE.CylinderGeometry(0.13, 0.13, 0.042, 16);
    const tagGeo = new C_ENGINE.PlaneGeometry(0.11, 0.36);
    const hitSphereGeo = new C_ENGINE.SphereGeometry(0.62, 8, 8);
    const hitSphereMat = new C_ENGINE.MeshBasicMaterial({ visible: false });
    const darkCapMat = new C_ENGINE.MeshStandardMaterial({ color: 0x3b281e, roughness: 0.8 });

    const hang = COURTYARD_CONFIG.lanternHang;

    spaceWishes.forEach((wish, idx) => {
      const pivot = new C_ENGINE.Group();
      const t = total <= 1 ? 0.5 : idx / (total - 1);

      const x = hang.minX + t * hang.spanX;
      const normX = Math.abs(x) / hang.normDivisorX;
      const y = hang.baseY + Math.pow(normX, 2.1) * hang.curveLiftY;
      const z = hang.frontZ - (idx % 2) * hang.rowOffsetZ;

      pivot.position.set(x, y, z);

      const cordLen = 0.38 + (idx % 3) * 0.1;
      const cordMesh = new C_ENGINE.Mesh(
        new C_ENGINE.CylinderGeometry(0.009, 0.009, cordLen, 6),
        this.materials.matBronze
      );
      cordMesh.position.y = -cordLen * 0.5;
      pivot.add(cordMesh);

      const lanternCenterY = -cordLen - 0.29;
      const colorKey = wish.color || 'amber';
      const pal = LANTERN_COLORS[colorKey] || LANTERN_COLORS.amber;
      const isSelected = wish.id === activeWishId;
      const lanternTex =
        this.materials.lanternTextures[colorKey] || this.materials.lanternTextures.amber;

      const bodyMat = new C_ENGINE.MeshStandardMaterial({
        map: lanternTex,
        emissive: new C_ENGINE.Color(pal.hex),
        emissiveMap: lanternTex,
        emissiveIntensity: isSelected ? 0.55 : 0.28,
        roughness: 0.65
      });

      const lanternData = {
        type: 'lantern',
        wishId: wish.id,
        wish,
        worldPos: new C_ENGINE.Vector3(x, y + lanternCenterY, z)
      };

      const bodyMesh = new C_ENGINE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = lanternCenterY;
      bodyMesh.castShadow = !this.sceneManager.isMobile;
      bodyMesh.userData = lanternData;
      pivot.add(bodyMesh);
      this.interactiveTargets.push(bodyMesh);

      const hitMesh = new C_ENGINE.Mesh(hitSphereGeo, hitSphereMat);
      hitMesh.position.y = lanternCenterY - 0.1;
      hitMesh.userData = lanternData;
      pivot.add(hitMesh);
      this.interactiveTargets.push(hitMesh);

      const topCap = new C_ENGINE.Mesh(capGeo, darkCapMat);
      topCap.position.y = lanternCenterY + 0.29;
      pivot.add(topCap);

      const botCap = new C_ENGINE.Mesh(capGeo, darkCapMat);
      botCap.position.y = lanternCenterY - 0.29;
      pivot.add(botCap);

      const tagMat = new C_ENGINE.MeshBasicMaterial({
        color: 0xf5efe2,
        side: C_ENGINE.DoubleSide
      });
      const tagMesh = new C_ENGINE.Mesh(tagGeo, tagMat);
      tagMesh.position.y = lanternCenterY - 0.52;
      tagMesh.userData = lanternData;
      pivot.add(tagMesh);
      this.interactiveTargets.push(tagMesh);

      lanternsRoot.add(pivot);
      this.lanternMeshes.push({
        pivot,
        bodyMesh,
        tagMesh,
        halo: null,
        wishId: wish.id,
        phase: idx * 1.15,
        speed: 1.1 + (idx % 3) * 0.25
      });
    });
  }

  getLanternWorldPos(wishId) {
    const found = this.lanternMeshes.find((l) => l.wishId === wishId);
    return found ? found.bodyMesh.userData.worldPos : null;
  }

  exciteWindBell() {
    this.bellExcitation = 1.0;

    const ringGeo = new C_ENGINE.PlaneGeometry(0.55, 0.55);
    const ringMat = new C_ENGINE.MeshBasicMaterial({
      map: this.materials.glowTex,
      color: 0xfbbf24,
      side: C_ENGINE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: C_ENGINE.AdditiveBlending,
      depthWrite: false
    });
    const ringMesh = new C_ENGINE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(this.windBellPivot.position).add(new C_ENGINE.Vector3(0, -0.65, 0));
    this.sceneManager.fxRoot.add(ringMesh);
    this.sonicRings.push({ mesh: ringMesh, mat: ringMat, scale: 1, alpha: 0.9 });
  }

  spawnHapjangParticles3D(wishId) {
    const targetLantern = this.lanternMeshes.find((l) => l.wishId === wishId);
    const origin = targetLantern
      ? targetLantern.bodyMesh.userData.worldPos.clone()
      : new C_ENGINE.Vector3(0, 3.6, -15.8);

    const particleGeo = new C_ENGINE.PlaneGeometry(1, 1);
    const cameraPos = this.sceneManager.camera.position;

    for (let i = 0; i < 28; i++) {
      const spriteMat = new C_ENGINE.MeshBasicMaterial({
        map: this.materials.glowTex,
        color: i % 2 === 0 ? 0xfef08a : 0xf59e0b,
        side: C_ENGINE.DoubleSide,
        transparent: true,
        opacity: 0.95,
        blending: C_ENGINE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new C_ENGINE.Mesh(particleGeo, spriteMat);
      const s = 0.24 + Math.random() * 0.3;
      sprite.scale.set(s, s, 1);
      sprite.position.set(
        origin.x + (Math.random() - 0.5) * 0.75,
        origin.y + (Math.random() - 0.5) * 0.42,
        origin.z + (Math.random() - 0.5) * 0.75
      );
      sprite.lookAt(cameraPos);
      this.sceneManager.fxRoot.add(sprite);

      this.hapjangParticles.push({
        sprite,
        mat: spriteMat,
        vx: (Math.random() - 0.5) * 0.55,
        vy: 0.7 + Math.random() * 1.1,
        vz: (Math.random() - 0.5) * 0.55,
        alpha: 0.98
      });
    }
  }

  pickInteractiveTarget(clientX, clientY) {
    const rect = this.sceneManager.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    this.mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseNDC, this.sceneManager.camera);

    const hits = this.raycaster.intersectObjects(this.interactiveTargets, false);
    if (hits.length > 0 && hits[0].distance < 75) {
      return hits[0].object.userData;
    }
    return null;
  }

  updateHoverTooltip(clientX, clientY, tooltipEl) {
    const data = this.pickInteractiveTarget(clientX, clientY);
    const canvas = this.sceneManager.renderer.domElement;

    if (data) {
      canvas.style.cursor = 'pointer';
      if (tooltipEl) {
        tooltipEl.style.left = `${clientX}px`;
        tooltipEl.style.top = `${clientY}px`;
        if (data.type === 'windbell') {
          tooltipEl.textContent = data.label;
        } else if (data.wish) {
          const snippet =
            data.wish.text.length > 18 ? `${data.wish.text.slice(0, 18)}…` : data.wish.text;
          tooltipEl.textContent = `🏮 “${snippet}” · 🙏 ${data.wish.hapjang}`;
        }
        tooltipEl.classList.add('visible');
      }
      return;
    }

    canvas.style.cursor = 'grab';
    if (tooltipEl) tooltipEl.classList.remove('visible');
  }

  update(elapsed, dt) {
    const cameraPos = this.sceneManager.camera.position;
    const fxRoot = this.sceneManager.fxRoot;

    // 1. 청동 풍경종 및 물고기 풍탁 흔들림
    if (this.windBellPivot) {
      this.bellExcitation = Math.max(0, this.bellExcitation - dt * 0.42);
      const swayAmp = 0.042 + this.bellExcitation * 0.22;
      const swaySpeed = 1.8 + this.bellExcitation * 6.5;
      this.windBellPivot.rotation.z = Math.sin(elapsed * swaySpeed) * swayAmp;
      this.windBellPivot.rotation.x = Math.cos(elapsed * 1.3) * 0.03;

      if (this.windFishPivot) {
        this.windFishPivot.rotation.y =
          Math.sin(elapsed * 2.6) * (0.28 + this.bellExcitation * 0.8);
        this.windFishPivot.rotation.z =
          Math.cos(elapsed * 3.4) * (0.08 + this.bellExcitation * 0.25);
      }
    }

    // 2. 처마 밑 소원 연등 흔들림
    for (const l of this.lanternMeshes) {
      l.pivot.rotation.z = Math.sin(elapsed * l.speed + l.phase) * 0.052;
      l.pivot.rotation.x = Math.cos(elapsed * (l.speed * 0.8) + l.phase) * 0.032;
      l.tagMesh.rotation.z = Math.sin(elapsed * 2.4 + l.phase) * 0.14;
      l.tagMesh.rotation.y = Math.cos(elapsed * 1.7 + l.phase) * 0.25;
      if (l.halo) {
        l.halo.lookAt(cameraPos);
      }
    }

    // 3. 3D 가을 단풍잎 흩날림
    for (let i = 0; i < this.leafCount; i++) {
      const d = this.leafData[i];
      const flutter = Math.sin(elapsed * 2.1 + d.phase);
      const swayZ = Math.cos(elapsed * 1.6 + d.phase * 1.3);
      d.x += (d.vx + flutter * 0.48) * dt;
      d.y += (d.vy + Math.abs(flutter) * 0.08) * dt;
      d.z += (d.vz + swayZ * 0.32) * dt;
      d.rx += d.spinX * dt;
      d.ry += d.spinY * dt;
      d.rz += d.spinZ * dt;

      if (d.y < COURTYARD_CONFIG.groundY || d.x > 19 || d.x < -19) {
        d.x = -17 + Math.random() * 34;
        d.y = 6.5 + Math.random() * 4.2;
        d.z = 6 - Math.random() * 29;
      }

      this.leafDummy.position.set(d.x, d.y, d.z);
      this.leafDummy.rotation.set(d.rx, d.ry, d.rz);
      this.leafDummy.scale.setScalar(d.scale || 1);
      this.leafDummy.updateMatrix();
      this.leafInstancedMesh.setMatrixAt(i, this.leafDummy.matrix);
    }
    this.leafInstancedMesh.instanceMatrix.needsUpdate = true;

    // 4. 풍경종 음파 링 애니메이션
    for (let i = this.sonicRings.length - 1; i >= 0; i--) {
      const r = this.sonicRings[i];
      r.scale += dt * 7.5;
      r.alpha -= dt * 0.65;
      r.mesh.scale.setScalar(r.scale);
      r.mesh.lookAt(cameraPos);
      r.mat.opacity = Math.max(0, r.alpha);
      if (r.alpha <= 0) {
        fxRoot.remove(r.mesh);
        this.sonicRings.splice(i, 1);
      }
    }

    // 5. 합장 불빛 파티클 애니메이션
    for (let i = this.hapjangParticles.length - 1; i >= 0; i--) {
      const p = this.hapjangParticles[i];
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.z += p.vz * dt;
      p.sprite.lookAt(cameraPos);
      p.alpha -= dt * 0.48;
      p.mat.opacity = Math.max(0, p.alpha);
      if (p.alpha <= 0) {
        fxRoot.remove(p.sprite);
        this.hapjangParticles.splice(i, 1);
      }
    }
  }
}
