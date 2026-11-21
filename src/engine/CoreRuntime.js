/**
 * CoreRuntime — 공식 오픈소스 Three.js(MIT) + 자체 PBR/캐릭터 로더를 통합해 window.SANSA_CORE를 초기화
 * - 외부 번들(sansa-core.js)을 완전히 대체합니다.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

import { createSurfaceManager, attachLandscapeHorizon } from './PbrSurfaceManager.js';
import { createMonk } from './MonkLoader.js';

window.SANSA_CORE = {
  ...THREE,
  GLTFLoader,
  RoomEnvironment,
  RoundedBoxGeometry,
  MeshoptDecoder,
  createSurfaceManager,
  attachLandscapeHorizon,
  createMonk
};

export const SANSA_CORE = window.SANSA_CORE;
