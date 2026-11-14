/**
 * 청풍사(본전 · 차경루 · 석등 · 마당 · 수목 · 보행/충돌 경계) 공간 좌표 단일 원본 (SSOT)
 * - 3D 메쉬 생성(BuseoksaBuilder)과 지형 높이·충돌·길찾기(Navigation)가 동일한 수치를 공유합니다.
 */

export const MURYANGSUJEON_CONFIG = {
  hanja: '淸 風 寺',
  hangul: '청풍사',
  // 화강암 장대석 기단 경계 (4면 둘레 완성)
  stylobateMinX: -17.0,
  stylobateMaxX: 17.0,
  stylobateMinZ: 5.55,
  stylobateMaxZ: 15.65,
  verandaMinZ: 5.65,
  verandaMaxZ: 15.55,
  verandaY: 0.20,

  // 전면 3개 돌계단(어칸·좌우 협칸, 무량수전 실사 동일 배치) 및 후면 중앙 돌계단
  frontStairXs: [-5.8, 0.0, 5.8],
  stepsStartZ: 3.55,
  stepsEndZ: 5.65,
  rearStepsEndZ: 15.55,
  rearStepsStartZ: 17.35,

  // 정면 5칸 × 측면 3칸 배흘림기둥 및 벽체 좌표
  columnXs: [-14.2, -8.4, -3.2, 3.2, 8.4, 14.2],
  colZ: 7.0,
  rearColZ: 13.6,
  sideColZs: [7.0, 9.2, 11.4, 13.6],
  columnCollisionRadius: 0.78,

  // 법당 내부 진입 방지 충돌 박스 (기단 상면 회랑 및 마당 둘레 산책 허용)
  hallCollisionBox: {
    minX: -14.65,
    maxX: 14.65,
    minZ: 6.62,
    maxZ: 13.98
  },

  stepPortal: {
    thresholdZ: 5.05,
    upperZ: 5.95,
    lowerZ: 3.4,
    rearUpperZ: 15.25,
    rearLowerZ: 17.55
  },

  roof: {
    style: 'muryangsujeon',
    x: 0,
    z: 10.3,
    baseY: 6.12,
    width: 38.2,
    depth: 14.8,
    ridgeHeight: 5.18,
    ridgeLength: 23.4,
    tileRepeatX: 11,
    tileRepeatZ: 8,
    ridgeCurveLift: 0.28,
    cornerLiftRatio: 0.24,
    gableSplit: 0.43
  }
};

export const ANYANGRU_CONFIG = {
  x: 0.0,
  y: -0.78,
  z: -19.5,
  hanja: '借 景 樓',
  hangul: '청풍사 차경루',
  deckLocalY: 0.86,
  worldDeckY: 0.08,
  cushionWorldY: 0.14,
  cushionHitRadius: 0.58,
  stepsStartZ: -13.65,
  stepsEndZ: -15.55,
  columnXs: [-14.8, -11.0, -7.2, -3.4, 3.4, 7.2, 11.0, 14.8],
  columnLocalZs: [-3.4, 3.4],
  columnCollisionRadius: 0.62,
  interColumnXs: [-12.9, -9.1, -5.3, 5.3, 9.1, 12.9],
  stepPortal: {
    thresholdZ: -15.15,
    upperZ: -15.75,
    lowerZ: -13.45
  },
  // 3D 방석 메쉬 배치 순서(좌->우 교차 색상 유지)
  cushionLocalCoords: [
    [-12.9, 0.0],
    [-9.1, 0.0],
    [-5.3, 0.0],
    [0.0, 0.0],
    [5.3, 0.0],
    [9.1, 0.0],
    [12.9, 0.0],
    [-12.9, -2.15],
    [-9.1, -2.15],
    [-5.3, -2.15],
    [0.0, -2.15],
    [5.3, -2.15],
    [9.1, -2.15],
    [12.9, -2.15]
  ],
  roof: {
    style: 'anyangru',
    x: 0,
    z: 0,
    baseY: 0.86 + 5.35,
    width: 39.2,
    depth: 11.8,
    ridgeHeight: 4.35,
    ridgeLength: 17.6,
    tileRepeatX: 11,
    tileRepeatZ: 7,
    ridgeCurveLift: 0.38,
    cornerLiftRatio: 0.29,
    gableSplit: 0.46
  }
};

export const COURTYARD_CONFIG = {
  groundY: -0.78,
  stoneLantern: {
    x: 3.6,
    y: -0.82,
    z: -1.2,
    collisionRadius: 1.15
  },
  windBellPos: [3.85, 5.32, 4.35],
  // 기본 16개(및 추가 작성분) 소원 연등이 안양루의 넓은 처마 전체에 여유롭게 걸리도록 확장
  lanternHang: {
    minX: -13.6,
    spanX: 27.2,
    normDivisorX: 16.5,
    baseY: 4.35,
    curveLiftY: 0.34,
    frontZ: -15.25,
    rowOffsetZ: 1.38
  },
  walkBounds: {
    block: { minX: -20.6, maxX: 20.6, minZ: -23.1, maxZ: 20.0 },
    clamp: { minX: -20.2, maxX: 20.2, minZ: -22.9, maxZ: 19.6 },
    anyangruMaxZ: -15.2,
    anyangruHalfX: 15.6
  },
  boulders: [
    { pos: [-14.5, -0.72, -3.5], scale: [1.45, 0.72, 1.15], collisionRadius: 1.52 },
    { pos: [-13.2, -0.78, -2.6], scale: [0.85, 0.48, 0.7],  collisionRadius: 0.98 },
    { pos: [14.2, -0.74, -4.8],  scale: [1.55, 0.76, 1.2],  collisionRadius: 1.62 },
    { pos: [15.4, -0.78, -3.8],  scale: [0.92, 0.52, 0.8],  collisionRadius: 1.05 },
    { pos: [-15.6, -0.7, -12.4], scale: [1.7, 0.88, 1.3],   collisionRadius: 1.72 },
    { pos: [15.8, -0.72, -12.8], scale: [1.6, 0.82, 1.25],  collisionRadius: 1.62 }
  ],
  scannedTreeAnchors: [
    // 마당 좌우 단풍나무 (보행 영역 인접 나무는 collisionRadius 지정)
    { x: -16.2, y: -0.82, z: -5.8, height: 8.8, widthScale: 1.26, yaw: 0.4, cluster: true, role: 'maple', collisionRadius: 1.05 },
    { x: -18.5, y: -0.82, z: -11.8, height: 9.6, widthScale: 1.28, yaw: 1.8, cluster: true, role: 'maple', collisionRadius: 0.95 },
    { x: 16.0, y: -0.82, z: -5.6, height: 8.6, widthScale: 1.25, yaw: -0.6, cluster: true, role: 'maple', collisionRadius: 1.05 },
    { x: 18.6, y: -0.82, z: -11.8, height: 9.8, widthScale: 1.28, yaw: 2.3, cluster: true, role: 'maple', collisionRadius: 0.95 },
    { x: 20.6, y: -0.82, z: -19.2, height: 9.4, widthScale: 1.26, yaw: 0.9, cluster: true, role: 'maple' },
    { x: -20.6, y: -0.82, z: -19.4, height: 9.6, widthScale: 1.26, yaw: -1.4, cluster: true, role: 'maple' },
    { x: -19.2, y: -0.80, z: -1.2, height: 9.0, widthScale: 1.24, yaw: -0.5, cluster: true, role: 'maple', collisionRadius: 0.95 },
    { x: 19.4, y: -0.78, z: -1.4, height: 9.2, widthScale: 1.25, yaw: 0.7, cluster: true, role: 'maple', collisionRadius: 0.95 },
    { x: -20.8, y: -0.75, z: 3.2, height: 9.4, widthScale: 1.22, yaw: 0.8, cluster: true, role: 'maple' },
    { x: 20.8, y: -0.75, z: 3.4, height: 9.6, widthScale: 1.22, yaw: -1.1, cluster: true, role: 'maple' },

    // 무량수전 좌우·후면 외곽 소나무 및 단풍나무
    { x: -23.2, y: -0.35, z: 10.8, height: 11.8, yaw: 2.1, role: 'pine' },
    { x: 23.5, y: -0.30, z: 11.2, height: 12.0, yaw: 1.4, role: 'pine' },
    { x: -15.5, y: -0.75, z: 22.4, height: 11.6, yaw: 0.7, cluster: true, role: 'pine' },
    { x: 15.8, y: -0.75, z: 22.6, height: 11.8, yaw: -0.9, cluster: true, role: 'pine' },
    { x: 0.0, y: -0.72, z: 24.2, height: 12.4, yaw: 1.6, cluster: true, role: 'maple' },
    { x: 24.4, y: -0.15, z: -10.6, height: 12.2, yaw: -1.2, role: 'pine' },
    { x: 23.8, y: -0.35, z: -18.4, height: 11.4, yaw: 1.5, cluster: true, role: 'maple' },
    { x: -23.8, y: -0.65, z: -19.8, height: 10.8, yaw: 1.1, cluster: true, role: 'maple' },

    // 안양루 아래 근경 계곡 숲
    { x: -24.5, y: -5.4, z: -30.5, height: 11.2, widthScale: 1.3, yaw: 0.5, cluster: true, role: 'pine' },
    { x: -17.5, y: -6.2, z: -32.0, height: 10.4, widthScale: 1.28, yaw: 1.9, cluster: true, role: 'maple' },
    { x: -10.8, y: -7.2, z: -33.5, height: 9.2, widthScale: 1.25, yaw: -0.8, cluster: true, role: 'pine' },
    { x: -4.2, y: -7.8, z: -35.0, height: 8.4, widthScale: 1.26, yaw: 2.4, cluster: true, role: 'maple' },
    { x: 3.8, y: -7.8, z: -35.2, height: 8.5, widthScale: 1.26, yaw: -1.6, cluster: true, role: 'pine' },
    { x: 10.6, y: -7.1, z: -33.2, height: 9.4, widthScale: 1.25, yaw: 0.9, cluster: true, role: 'maple' },
    { x: 17.4, y: -6.0, z: -31.8, height: 10.6, widthScale: 1.28, yaw: -2.1, cluster: true, role: 'pine' },
    { x: 24.8, y: -5.2, z: -30.0, height: 11.5, widthScale: 1.3, yaw: 1.2, cluster: true, role: 'maple' }
  ],
  innerSeasonalTrees: [
    { x: -13.8, y: -0.82, z: -8.8, scale: 1.28, collisionRadius: 0.96 },
    { x: 13.8,  y: -0.82, z: -8.8, scale: 1.26, collisionRadius: 0.96 },
    { x: -20.2, y: -0.82, z: -14.8, scale: 1.22 },
    { x: 20.2,  y: -0.82, z: -14.8, scale: 1.22 },
    { x: -14.2, y: -0.82, z: -2.4, scale: 1.22, collisionRadius: 0.96 },
    { x: 14.2,  y: -0.82, z: -2.2, scale: 1.22, collisionRadius: 0.96 }
  ],
  outerGreenTrees: [
    { x: 19.6,  y: -0.45, z: -9.8,  scale: 1.3 },
    { x: 23.4,  y: 0.35,  z: -15.2, scale: 1.42 },
    { x: 25.5,  y: 1.25,  z: -7.5,  scale: 1.48 },
    { x: -22.2, y: -0.65, z: -16.2, scale: 1.25 },
    { x: -21.8, y: -1.25, z: -24.5, scale: 1.3 }
  ]
};

/**
 * 안양루 로컬 방석 좌표로부터 월드 방석 좌표 목록 자동 생성 (중앙 방석 우선 정렬)
 */
export const ANYANGRU_CUSHIONS = (() => {
  const all = ANYANGRU_CONFIG.cushionLocalCoords.map(([lx, lz]) => ({
    x: Number((ANYANGRU_CONFIG.x + lx).toFixed(4)),
    z: Number((ANYANGRU_CONFIG.z + lz).toFixed(4))
  }));
  return all.sort((a, b) => {
    if (a.z !== b.z) return b.z - a.z;
    const absDiff = Math.abs(a.x) - Math.abs(b.x);
    if (Math.abs(absDiff) > 0.001) return absDiff;
    return a.x - b.x;
  });
})();

/**
 * 건축물·조경 설정으로부터 원형 및 사각 장애물 충돌 데이터 자동 파생
 */
export const SPACE_OBSTACLES = {
  buseoksa: {
    circles: [
      // 1. 무량수전 4면 둘레 배흘림기둥 16주 (전면 6 + 후면 6 + 좌우 중간 4)
      ...MURYANGSUJEON_CONFIG.columnXs.map((x) => ({
        x,
        z: MURYANGSUJEON_CONFIG.colZ,
        r: MURYANGSUJEON_CONFIG.columnCollisionRadius,
        label: 'pillar'
      })),
      ...MURYANGSUJEON_CONFIG.columnXs.map((x) => ({
        x,
        z: MURYANGSUJEON_CONFIG.rearColZ,
        r: MURYANGSUJEON_CONFIG.columnCollisionRadius,
        label: 'pillar_rear'
      })),
      ...MURYANGSUJEON_CONFIG.sideColZs
        .slice(1, -1)
        .flatMap((z) => [
          { x: -14.2, z, r: MURYANGSUJEON_CONFIG.columnCollisionRadius, label: 'pillar_side' },
          { x: 14.2, z, r: MURYANGSUJEON_CONFIG.columnCollisionRadius, label: 'pillar_side' }
        ]),

      // 2. 안양루 누각 기둥 16주
      ...[...ANYANGRU_CONFIG.columnLocalZs]
        .sort((a, b) => b - a)
        .flatMap((lz) =>
          ANYANGRU_CONFIG.columnXs.map((lx) => ({
            x: Number((ANYANGRU_CONFIG.x + lx).toFixed(4)),
            z: Number((ANYANGRU_CONFIG.z + lz).toFixed(4)),
            r: ANYANGRU_CONFIG.columnCollisionRadius,
            label: 'anyang_pillar'
          }))
        ),

      // 3. 통일신라 부석사 석등
      {
        x: COURTYARD_CONFIG.stoneLantern.x,
        z: COURTYARD_CONFIG.stoneLantern.z,
        r: COURTYARD_CONFIG.stoneLantern.collisionRadius,
        label: 'stone_lantern'
      },

      // 4. 마당 단풍나무 충돌원
      ...COURTYARD_CONFIG.innerSeasonalTrees
        .filter((t) => t.collisionRadius)
        .map((t) => ({ x: t.x, z: t.z, r: t.collisionRadius, label: 'tree' })),

      // 5. 외곽 스캔 수목 충돌원
      ...COURTYARD_CONFIG.scannedTreeAnchors
        .filter((t) => t.collisionRadius)
        .map((t) => ({ x: t.x, z: t.z, r: t.collisionRadius, label: 'pine' })),

      // 6. 이끼 바위 충돌원
      ...COURTYARD_CONFIG.boulders.map((b) => ({
        x: b.pos[0],
        z: b.pos[2],
        r: b.collisionRadius,
        label: 'boulder'
      }))
    ],
    boxes: [
      // 무량수전 본체(전·후·좌·우 벽체 내부 진입 차단)
      { ...MURYANGSUJEON_CONFIG.hallCollisionBox },

      // 무량수전 전면 기단 단차 벽 (전면 3개 돌계단 어칸 x∈[-2.1,2.1], 좌협칸 x∈[-7.3,-4.3], 우협칸 x∈[4.3,7.3] 개방)
      { minX: -17.15, maxX: -7.3, minZ: 5.2, maxZ: 5.68 },
      { minX: -4.3, maxX: -2.1, minZ: 3.45, maxZ: 5.68 },
      { minX: 2.1, maxX: 4.3, minZ: 3.45, maxZ: 5.68 },
      { minX: 7.3, maxX: 17.15, minZ: 5.2, maxZ: 5.68 },
      { minX: -7.95, maxX: -7.3, minZ: 3.65, maxZ: 5.68 },
      { minX: 7.3, maxX: 7.95, minZ: 3.65, maxZ: 5.68 },

      // 무량수전 좌·우 기단 단차 경계 (외곽 마당 |x|>17.3 과 기단 상면 회랑 |x|<16.75 분리)
      { minX: -17.25, maxX: -16.75, minZ: 5.2, maxZ: 15.85 },
      { minX: 16.75, maxX: 17.25, minZ: 5.2, maxZ: 15.85 },

      // 무량수전 후면 기단 단차 경계 (후면 중앙 돌계단 x∈[-1.95,1.95] 개방)
      { minX: -17.15, maxX: -1.95, minZ: 15.45, maxZ: 15.95 },
      { minX: 1.95, maxX: 17.15, minZ: 15.45, maxZ: 15.95 },
      { minX: -2.65, maxX: -1.95, minZ: 15.45, maxZ: 17.35 },
      { minX: 1.95, maxX: 2.65, minZ: 15.45, maxZ: 17.35 },

      // 안양루 중앙 돌계단 소매돌 및 전면 기단 단차 벽 (x in [-2.15, 2.15] 계단 개방)
      { minX: -2.85, maxX: -2.15, minZ: -15.65, maxZ: -13.65 },
      { minX: 2.15, maxX: 2.85, minZ: -15.65, maxZ: -13.65 },
      { minX: -20.8, maxX: -2.15, minZ: -15.75, maxZ: -15.15 },
      { minX: 2.15, maxX: 20.8, minZ: -15.75, maxZ: -15.15 },

      // 안양루 좌우 난간 외곽 추락 방지 경계
      { minX: -20.8, maxX: -15.8, minZ: -23.6, maxZ: -15.2 },
      { minX: 15.8, maxX: 20.8, minZ: -23.6, maxZ: -15.2 }
    ]
  }
};
