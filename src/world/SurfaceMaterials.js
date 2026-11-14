/**
 * SurfaceMaterials — 실사 PBR 재질, 공용 절차적 텍스처, 바람/단풍 GLSL 셰이더 및 공간 UV 투영 매니저
 */

import { LANTERN_COLORS } from '../config/constants.js';
import { TextureFactory } from './TextureFactory.js';

const C_ENGINE = window.SANSA_CORE;

export class SurfaceMaterials {
  constructor(windUniform) {
    this.windUniform = windUniform;
    this.trackedGeometries = [];

    this.initTextures();
    this.initMaterials();
  }

  initTextures() {
    this.glowTex = TextureFactory.createGlowTexture();
    this.cloudTex = TextureFactory.createCloudTexture();
    this.contactShadowTex = TextureFactory.createContactShadowTexture();
    this.sobaeksanVistaTex = TextureFactory.createSobaeksanVistaTexture();
    this.giwaTexSet = TextureFactory.createRealisticGiwaRoofTexture();
    this.mapleLeafTex = TextureFactory.createRealisticMapleLeafTexture();

    this.lanternTextures = {};
    Object.keys(LANTERN_COLORS).forEach((k) => {
      this.lanternTextures[k] = TextureFactory.createLanternTexture(k);
    });
  }

  initMaterials() {
    this.matTimber = new C_ENGINE.MeshStandardMaterial({
      color: 0x9c7454,
      roughness: 0.88,
      metalness: 0.02,
      vertexColors: true
    });
    this.matDarkTimber = new C_ENGINE.MeshStandardMaterial({
      color: 0x5c4332,
      roughness: 0.86,
      metalness: 0.02,
      side: C_ENGINE.DoubleSide,
      vertexColors: true
    });
    this.matPaleTimber = new C_ENGINE.MeshStandardMaterial({
      color: 0xb89674,
      roughness: 0.85,
      metalness: 0.02,
      vertexColors: true
    });
    this.matFloorWood = new C_ENGINE.MeshStandardMaterial({
      color: 0x8f6b4e,
      roughness: 0.74,
      metalness: 0.02,
      vertexColors: true
    });
    this.matDancheongJade = new C_ENGINE.MeshStandardMaterial({
      color: 0x4b6b5c,
      roughness: 0.86,
      metalness: 0.02,
      vertexColors: true
    });
    this.matDancheongRed = new C_ENGINE.MeshStandardMaterial({
      color: 0x8a392d,
      roughness: 0.86,
      metalness: 0.02,
      vertexColors: true
    });
    this.matPlaster = new C_ENGINE.MeshStandardMaterial({
      color: 0xd4cbb8,
      roughness: 0.96,
      metalness: 0.0,
      vertexColors: true
    });
    this.matStone = new C_ENGINE.MeshStandardMaterial({
      color: 0xb5afa2,
      roughness: 0.92,
      metalness: 0.02,
      vertexColors: true
    });
    this.matRock = new C_ENGINE.MeshStandardMaterial({
      color: 0x8e8d82,
      roughness: 0.95,
      metalness: 0.02,
      vertexColors: true
    });
    this.matMoss = new C_ENGINE.MeshStandardMaterial({
      color: 0x5d744d,
      roughness: 0.96,
      metalness: 0.0,
      vertexColors: true
    });
    this.matGround = new C_ENGINE.MeshStandardMaterial({
      color: 0xa6a391,
      roughness: 0.98,
      metalness: 0.0,
      vertexColors: true
    });
    this.matRealisticGiwa = new C_ENGINE.MeshStandardMaterial({
      map: this.giwaTexSet.colorMap,
      bumpMap: this.giwaTexSet.bumpMap,
      bumpScale: 0.09,
      color: 0xd8dedc,
      roughness: 0.72,
      metalness: 0.08,
      side: C_ENGINE.DoubleSide,
      vertexColors: true
    });
    this.matBronze = new C_ENGINE.MeshStandardMaterial({
      color: 0xb39659,
      roughness: 0.38,
      metalness: 0.78
    });
    this.matWarmHanji = new C_ENGINE.MeshStandardMaterial({
      color: 0xfff3d6,
      emissive: new C_ENGINE.Color(0xffb347),
      emissiveIntensity: 1.35,
      roughness: 0.5
    });
    this.matContactShadow = new C_ENGINE.MeshBasicMaterial({
      map: this.contactShadowTex,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
  }

  attachWindSwayShader(material, amplitude = 0.05) {
    const prevCompile = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      if (prevCompile) prevCompile(shader, renderer);
      shader.uniforms.uWindTime = this.windUniform;
      shader.vertexShader = `uniform float uWindTime;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float swayWave = sin(position.x * 0.45 + position.z * 0.35 + uWindTime * 1.15);
         transformed.x += swayWave * ${amplitude.toFixed(4)} * max(0.0, position.y);
         transformed.z += cos(position.z * 0.4 - uWindTime * 0.9) * ${(amplitude * 0.6).toFixed(4)} * max(0.0, position.y);`
      );
    };
    material.customProgramCacheKey = () => `chakyeong-wind-${amplitude}`;
  }

  attachMapleFoliageShader(material, amplitude = 0.009, variantIdx = 0) {
    const mapleRamps = [
      { shadow: '0.34, 0.05, 0.04', mid: '0.82, 0.16, 0.11', tip: '0.96, 0.34, 0.18' },
      { shadow: '0.38, 0.08, 0.04', mid: '0.88, 0.25, 0.12', tip: '0.98, 0.48, 0.20' },
      { shadow: '0.42, 0.12, 0.05', mid: '0.90, 0.38, 0.14', tip: '0.99, 0.64, 0.22' },
      { shadow: '0.30, 0.04, 0.04', mid: '0.76, 0.13, 0.10', tip: '0.93, 0.28, 0.16' }
    ];
    const ramp = mapleRamps[variantIdx % mapleRamps.length];

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = this.windUniform;
      shader.vertexShader = `uniform float uWindTime;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float swayWave = sin(position.x * 0.45 + position.z * 0.35 + uWindTime * 1.15);
         transformed.x += swayWave * ${amplitude.toFixed(4)} * max(0.0, position.y);
         transformed.z += cos(position.z * 0.4 - uWindTime * 0.9) * ${(amplitude * 0.6).toFixed(4)} * max(0.0, position.y);`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         #ifdef USE_MAP
           float leafLuma = dot(sampledDiffuseColor.rgb, vec3(0.26, 0.62, 0.12));
           float greenDominance = smoothstep(-0.02, 0.08, sampledDiffuseColor.g - sampledDiffuseColor.r * 0.90);
           float leafTone = smoothstep(0.03, 0.54, leafLuma);
           vec3 mapleShadow = vec3(${ramp.shadow});
           vec3 mapleMid = vec3(${ramp.mid});
           vec3 mapleTip = vec3(${ramp.tip});
           vec3 mapleRgb = mix(mapleShadow, mapleMid, smoothstep(0.0, 0.55, leafTone));
           mapleRgb = mix(mapleRgb, mapleTip, smoothstep(0.45, 1.0, leafTone));
           diffuseColor.rgb = mix(sampledDiffuseColor.rgb * diffuse, mapleRgb, greenDominance);
         #endif`
      );
    };
    material.customProgramCacheKey = () => `chakyeong-maple-foliage-v1-${variantIdx}-${amplitude}`;
  }

  paintVertexTone(geometry, tone = 1.0, variance = 0.03) {
    const pos = geometry.getAttribute('position');
    if (!pos) return geometry;
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const n =
        tone +
        Math.sin(pos.getX(i) * 1.7 + pos.getY(i) * 2.3 + pos.getZ(i) * 1.3) * variance;
      colors[i * 3] = n;
      colors[i * 3 + 1] = n;
      colors[i * 3 + 2] = n;
    }
    geometry.setAttribute('color', new C_ENGINE.BufferAttribute(colors, 3));
    return geometry;
  }

  createMesh(geometry, material, parent, opts = {}) {
    const tone = opts.tone ?? 1.0;
    const variance = opts.variance ?? 0.025;
    this.paintVertexTone(geometry, tone, variance);
    if (!opts.preserveUvs && material !== this.matRealisticGiwa) {
      this.trackedGeometries.push({ geometry, material });
    }

    const mesh = new C_ENGINE.Mesh(geometry, material);
    if (opts.pos) mesh.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
    if (opts.rot) mesh.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
    if (opts.scale) {
      if (typeof opts.scale === 'number') mesh.scale.setScalar(opts.scale);
      else mesh.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
    }
    mesh.castShadow = opts.castShadow ?? true;
    mesh.receiveShadow = opts.receiveShadow ?? true;
    if (parent) parent.add(mesh);
    return mesh;
  }

  upgradeWithSurfaceManager(sceneManager, buseoksaGroundMat) {
    if (!C_ENGINE.createSurfaceManager) return;

    C_ENGINE.createSurfaceManager(sceneManager.renderer)
      .then(async (surfaceMgr) => {
        this.surfaceMgr = surfaceMgr;
        await surfaceMgr.loadGarden();

        surfaceMgr.apply(this.matTimber, 'wood', { tint: '#b59273', normal: 0.22, roughness: 0.88 });
        surfaceMgr.apply(this.matDarkTimber, 'wood', { tint: '#785e49', normal: 0.2, roughness: 0.86 });
        surfaceMgr.apply(this.matPaleTimber, 'wood', { tint: '#cfb397', normal: 0.16, roughness: 0.84 });
        surfaceMgr.apply(this.matFloorWood, 'floor', { tint: '#ab8c70', normal: 0.08, roughness: 0.72 });
        surfaceMgr.apply(this.matDancheongJade, 'wood', {
          tint: '#557868',
          normal: 0.12,
          saturation: 0.15,
          gain: 1.5
        });
        surfaceMgr.apply(this.matDancheongRed, 'wood', {
          tint: '#964234',
          normal: 0.12,
          saturation: 0.25,
          gain: 1.4
        });
        surfaceMgr.apply(this.matPlaster, 'plaster', { tint: '#d8cfc0', normal: 0.12 });
        surfaceMgr.apply(this.matStone, 'stone', { tint: '#ccc6b8', normal: 0.35 });
        surfaceMgr.apply(this.matRock, 'rock', { tint: '#aba99b', normal: 0.48 });
        surfaceMgr.apply(this.matMoss, 'moss', { tint: '#688056', normal: 0.32 });
        surfaceMgr.apply(this.matGround, 'ground', { tint: '#b5b8a3', normal: 0.45 });
        if (buseoksaGroundMat) {
          surfaceMgr.apply(buseoksaGroundMat, 'ground', { tint: '#c5c2af', normal: 0.42 });
        }

        const unitScale = new C_ENGINE.Vector3(1, 1, 1);
        for (const item of this.trackedGeometries) {
          surfaceMgr.projectUvs(item.geometry, item.material, unitScale);
        }

        if (buseoksaGroundMat && C_ENGINE.attachLandscapeHorizon) {
          sceneManager.registerHorizonUpdater(
            C_ENGINE.attachLandscapeHorizon(buseoksaGroundMat, sceneManager.scene)
          );
        }
      })
      .catch((err) => console.warn('Surface manager fallback:', err));
  }
}
