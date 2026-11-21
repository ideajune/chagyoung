/**
 * PbrSurfaceManager — 공식 Three.js 기반 경량 PBR 텍스처 매니저 및 공간 박스 UV 투영 · 원경 지평선 블렌딩
 */

import * as THREE from 'three';

const PBR_ASSET_VERSION = '20261121-pbr3';

const SURFACE_ASSET_MAP = {
  wood: 'assets/materials/wood',
  floor: 'assets/materials/wood',
  plaster: 'assets/materials/plaster',
  stone: 'assets/materials/stone',
  rock: 'assets/materials/rock',
  moss: 'assets/materials/ground',
  ground: 'assets/materials/ground'
};

const SURFACE_TILE_SCALE = {
  wood: 0.42,
  floor: 0.36,
  plaster: 0.28,
  stone: 0.34,
  rock: 0.26,
  moss: 0.24,
  ground: 0.16
};

export async function createSurfaceManager(renderer) {
  const loader = new THREE.TextureLoader();
  const maxAniso = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 4);
  const loadedSets = new Map();
  const materialScaleMap = new WeakMap();

  const loadTexture = (url, isColor = false) =>
    new Promise((resolve) => {
      loader.load(
        `${url}?v=${PBR_ASSET_VERSION}`,
        (tex) => {
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.anisotropy = maxAniso;
          tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          tex.needsUpdate = true;
          resolve(tex);
        },
        undefined,
        () => resolve(null)
      );
    });

  const loadSetByFolder = async (folder) => {
    if (loadedSets.has(folder)) return loadedSets.get(folder);
    const [colorMap, normalMap, roughnessMap] = await Promise.all([
      loadTexture(`${folder}/color.jpg`, true),
      loadTexture(`${folder}/normal.jpg`, false),
      loadTexture(`${folder}/roughness.jpg`, false)
    ]);
    const set = { colorMap, normalMap, roughnessMap };
    loadedSets.set(folder, set);
    return set;
  };

  return {
    async loadGarden() {
      const uniqueFolders = [...new Set(Object.values(SURFACE_ASSET_MAP))];
      await Promise.all(uniqueFolders.map((folder) => loadSetByFolder(folder)));
    },

    apply(material, surfaceKey, opts = {}) {
      if (!material) return;
      const folder = SURFACE_ASSET_MAP[surfaceKey] || SURFACE_ASSET_MAP.stone;
      const set = loadedSets.get(folder);
      if (!set) return;

      if (set.colorMap) material.map = set.colorMap;
      if (set.normalMap) {
        material.normalMap = set.normalMap;
        const nScale = Number.isFinite(opts.normal) ? opts.normal : 0.3;
        material.normalScale = new THREE.Vector2(nScale, nScale);
      }
      if (set.roughnessMap) {
        material.roughnessMap = set.roughnessMap;
      }
      if (Number.isFinite(opts.roughness)) {
        material.roughness = opts.roughness;
      }

      if (opts.tint) {
        const c = new THREE.Color(opts.tint);
        if (Number.isFinite(opts.saturation) || Number.isFinite(opts.gain)) {
          const hsl = { h: 0, s: 0, l: 0 };
          c.getHSL(hsl);
          if (Number.isFinite(opts.saturation)) {
            hsl.s = Math.max(0, Math.min(1, hsl.s * (0.65 + opts.saturation)));
          }
          if (Number.isFinite(opts.gain)) {
            hsl.l = Math.max(0, Math.min(1, hsl.l * Math.min(1.25, opts.gain * 0.72)));
          }
          c.setHSL(hsl.h, hsl.s, hsl.l);
        }
        material.color.copy(c);
      }

      materialScaleMap.set(material, SURFACE_TILE_SCALE[surfaceKey] || 0.3);
      material.needsUpdate = true;
    },

    projectUvs(geometry, material, scaleVec) {
      if (!geometry) return;
      const pos = geometry.getAttribute('position');
      if (!pos) return;
      if (!geometry.getAttribute('normal')) {
        geometry.computeVertexNormals();
      }
      const norm = geometry.getAttribute('normal');
      const count = pos.count;
      const uvArr = new Float32Array(count * 2);

      const tile = materialScaleMap.get(material) || 0.3;
      const sx = (scaleVec?.x ?? 1) * tile;
      const sy = (scaleVec?.y ?? 1) * tile;
      const sz = (scaleVec?.z ?? 1) * tile;

      for (let i = 0; i < count; i++) {
        const x = pos.getX(i) * sx;
        const y = pos.getY(i) * sy;
        const z = pos.getZ(i) * sz;
        const nx = Math.abs(norm.getX(i));
        const ny = Math.abs(norm.getY(i));
        const nz = Math.abs(norm.getZ(i));

        if (ny >= nx && ny >= nz) {
          uvArr[i * 2] = x;
          uvArr[i * 2 + 1] = z;
        } else if (nx >= nz) {
          uvArr[i * 2] = z;
          uvArr[i * 2 + 1] = y;
        } else {
          uvArr[i * 2] = x;
          uvArr[i * 2 + 1] = y;
        }
      }

      geometry.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    }
  };
}

/**
 * 지면 외곽 원경을 씬 안개 색상으로 부드럽게 융합하는 경량 지평선 페이드 셰이더
 */
export function attachLandscapeHorizon(groundMat, scene) {
  if (!groundMat || !scene) return () => {};

  const horizonColorUniform = {
    value: scene.fog ? scene.fog.color.clone() : new THREE.Color(0xd7e4df)
  };

  const prevCompile = groundMat.onBeforeCompile;
  groundMat.onBeforeCompile = (shader, renderer) => {
    if (prevCompile) prevCompile(shader, renderer);
    shader.uniforms.uHorizonColor = horizonColorUniform;
    shader.vertexShader =
      `varying vec3 vHorizonWorldPos;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vHorizonWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );
    shader.fragmentShader =
      `uniform vec3 uHorizonColor;\nvarying vec3 vHorizonWorldPos;\n` +
      shader.fragmentShader.replace(
        '#include <fog_fragment>',
        `float hDist = length(vHorizonWorldPos.xz);
         float hFade = smoothstep(78.0, 155.0, hDist);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, uHorizonColor, hFade * 0.72);
         #include <fog_fragment>`
      );
  };
  groundMat.customProgramCacheKey = () => 'sansa-horizon-blend-v1';
  groundMat.needsUpdate = true;

  return () => {
    if (scene.fog?.color) {
      horizonColorUniform.value.copy(scene.fog.color);
    }
  };
}
