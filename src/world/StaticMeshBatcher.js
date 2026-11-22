/**
 * StaticMeshBatcher — 정적 3D 건축/조경 메쉬를 재질(Material) 단위로 통합 병합하여
 * Draw Call 수, 그림자 패스 부하 및 PBR UV 투영 비용을 획기적으로 절감하는 경량 배처
 */

import { SANSA_CORE as C_ENGINE } from '../engine/CoreRuntime.js';

function hasDynamicAncestor(obj, stopAt) {
  let curr = obj;
  while (curr && curr !== stopAt) {
    if (curr.userData && (curr.userData.dynamic || curr.userData.type || curr.userData.noMerge)) {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

function mergeGeometriesList(entries) {
  let totalVerts = 0;
  let totalIndices = 0;
  let anyColor = false;
  let anyUv = false;

  for (const { geometry } of entries) {
    const pos = geometry.getAttribute('position');
    if (!pos) continue;
    totalVerts += pos.count;
    totalIndices += geometry.index ? geometry.index.count : pos.count;
    if (geometry.getAttribute('color')) anyColor = true;
    if (geometry.getAttribute('uv')) anyUv = true;
  }

  if (totalVerts === 0) return null;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = anyUv ? new Float32Array(totalVerts * 2) : null;
  const colors = anyColor ? new Float32Array(totalVerts * 3) : null;
  const indices = totalVerts > 65535 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;

  for (const { geometry, matrix } of entries) {
    const pos = geometry.getAttribute('position');
    if (!pos) continue;
    const posArr = pos.array;
    const norm = geometry.getAttribute('normal');
    const normArr = norm ? norm.array : null;
    const uv = geometry.getAttribute('uv');
    const uvArr = uv ? uv.array : null;
    const col = geometry.getAttribute('color');
    const colArr = col ? col.array : null;
    const count = pos.count;

    const m = matrix.elements;
    const m0 = m[0], m1 = m[1], m2 = m[2];
    const m4 = m[4], m5 = m[5], m6 = m[6];
    const m8 = m[8], m9 = m[9], m10 = m[10];
    const m12 = m[12], m13 = m[13], m14 = m[14];

    // 비균일 스케일에서도 법선 왜곡이 없도록 역전치(NormalMatrix) 사용
    const normalMatrix = new C_ENGINE.Matrix3().getNormalMatrix(matrix);
    const n = normalMatrix.elements;
    const n0 = n[0], n1 = n[1], n2 = n[2];
    const n3 = n[3], n4 = n[4], n5 = n[5];
    const n6 = n[6], n7 = n[7], n8 = n[8];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const o3 = (vOffset + i) * 3;
      const x = posArr[i3];
      const y = posArr[i3 + 1];
      const z = posArr[i3 + 2];
      positions[o3] = m0 * x + m4 * y + m8 * z + m12;
      positions[o3 + 1] = m1 * x + m5 * y + m9 * z + m13;
      positions[o3 + 2] = m2 * x + m6 * y + m10 * z + m14;

      if (normArr) {
        const nx = normArr[i3];
        const ny = normArr[i3 + 1];
        const nz = normArr[i3 + 2];
        const tx = n0 * nx + n3 * ny + n6 * nz;
        const ty = n1 * nx + n4 * ny + n7 * nz;
        const tz = n2 * nx + n5 * ny + n8 * nz;
        const invLen = 1 / (Math.hypot(tx, ty, tz) || 1);
        normals[o3] = tx * invLen;
        normals[o3 + 1] = ty * invLen;
        normals[o3 + 2] = tz * invLen;
      } else {
        normals[o3 + 1] = 1;
      }

      if (uvs && uvArr) {
        const i2 = i * 2;
        const o2 = (vOffset + i) * 2;
        uvs[o2] = uvArr[i2];
        uvs[o2 + 1] = uvArr[i2 + 1];
      }

      if (colors) {
        if (colArr) {
          colors[o3] = colArr[i3];
          colors[o3 + 1] = colArr[i3 + 1];
          colors[o3 + 2] = colArr[i3 + 2];
        } else {
          colors[o3] = 1;
          colors[o3 + 1] = 1;
          colors[o3 + 2] = 1;
        }
      }
    }

    const idx = geometry.index;
    if (idx) {
      const idxArr = idx.array;
      const idxCount = idx.count;
      for (let j = 0; j < idxCount; j++) {
        indices[iOffset++] = idxArr[j] + vOffset;
      }
    } else {
      for (let j = 0; j < count; j++) {
        indices[iOffset++] = j + vOffset;
      }
    }

    vOffset += count;
  }

  const merged = new C_ENGINE.BufferGeometry();
  merged.setAttribute('position', new C_ENGINE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new C_ENGINE.BufferAttribute(normals, 3));
  if (uvs) merged.setAttribute('uv', new C_ENGINE.BufferAttribute(uvs, 2));
  if (colors) merged.setAttribute('color', new C_ENGINE.BufferAttribute(colors, 3));
  merged.setIndex(new C_ENGINE.BufferAttribute(indices, 1));
  merged.computeBoundingSphere();
  return merged;
}

/**
 * rootGroup 하위의 정적 메쉬들을 (material, castShadow, receiveShadow, preserveUvs) 기준으로 병합합니다.
 * - 동적/인터랙티브/인스턴싱/멀티재질 메쉬는 자동 보존합니다.
 * - 병합된 지오메트리 목록을 반환해 SurfaceMaterials.trackedGeometries를 초경량화합니다.
 */
export function batchStaticMeshes(rootGroup, materials = null) {
  rootGroup.updateMatrixWorld(true);

  const trackedSet = new Set();
  if (materials?.trackedGeometries) {
    for (const item of materials.trackedGeometries) {
      trackedSet.add(item.geometry);
    }
  }

  const buckets = new Map();
  const toRemove = [];

  rootGroup.traverse((obj) => {
    if (!obj.isMesh || obj.isInstancedMesh || obj.isSkinnedMesh) return;
    if (!obj.geometry || !obj.material || Array.isArray(obj.material)) return;
    if (obj.material.transparent) return;
    if (hasDynamicAncestor(obj, rootGroup)) return;

    const isTracked = trackedSet.has(obj.geometry);
    const key = `${obj.material.uuid}|${obj.castShadow ? 1 : 0}|${obj.receiveShadow ? 1 : 0}|${isTracked ? 1 : 0}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        material: obj.material,
        castShadow: obj.castShadow,
        receiveShadow: obj.receiveShadow,
        isTracked,
        entries: []
      };
      buckets.set(key, bucket);
    }
    bucket.entries.push({
      mesh: obj,
      geometry: obj.geometry,
      matrix: obj.matrixWorld.clone()
    });
  });

  const batchGroup = new C_ENGINE.Group();
  batchGroup.name = 'StaticBatchedWorld';

  const newTracked = [];
  const mergedOriginals = new Set();

  for (const bucket of buckets.values()) {
    if (bucket.entries.length < 2) {
      // 단일 메쉬는 병합되지 않고 preserved에 그대로 유지되므로 중복 등록하지 않음
      continue;
    }

    const mergedGeo = mergeGeometriesList(bucket.entries);
    if (!mergedGeo) continue;

    const mergedMesh = new C_ENGINE.Mesh(mergedGeo, bucket.material);
    mergedMesh.castShadow = bucket.castShadow;
    mergedMesh.receiveShadow = bucket.receiveShadow;
    batchGroup.add(mergedMesh);

    if (bucket.isTracked) {
      newTracked.push({ geometry: mergedGeo, material: bucket.material });
    }

    for (const e of bucket.entries) {
      toRemove.push(e.mesh);
      mergedOriginals.add(e.geometry);
    }
  }

  for (const mesh of toRemove) {
    if (mesh.parent) mesh.parent.remove(mesh);
  }

  rootGroup.add(batchGroup);

  // 병합 후 씬에 더 이상 참조되지 않는 원본 지오메트리 GPU 버퍼 해제
  const stillReferenced = new Set();
  rootGroup.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      stillReferenced.add(obj.geometry);
    }
  });
  for (const geo of mergedOriginals) {
    if (!stillReferenced.has(geo) && typeof geo.dispose === 'function') {
      geo.dispose();
    }
  }

  if (materials?.trackedGeometries) {
    // 병합되지 않고 남은 동적/단일 메쉬의 trackedGeometry 보존 + 병합된 지오메트리 교체
    const preserved = materials.trackedGeometries.filter((item) => !mergedOriginals.has(item.geometry));
    materials.trackedGeometries = [...preserved, ...newTracked];
  }

  return {
    mergedMeshCount: toRemove.length,
    batchDrawCalls: batchGroup.children.length
  };
}
