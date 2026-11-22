/**
 * 청풍사(본전 · 차경루 · 석등 · 마당 · 수목 · 보행/충돌 경계) 공간 좌표 단일 원본 (SSOT)
 * - 3D 메쉬 생성(BuseoksaBuilder)과 지형 높이·충돌·길찾기(Navigation)가 동일한 수치를 공유합니다.
 */

// 청풍사 내부 4개 면(남·북·서·동) × 2열 × 5행 = 총 40석 실내 명상 방석 자동 생성 (기존 84석 대비 약 50% 축소)
const HALL_CENTER_Z = 18.4;
const HALL_ROW_OFFSETS = [5.9, 8.4];
const HALL_COL_OFFSETS = [-4.0, -2.0, 0.0, 2.0, 4.0];
const HALL_INTERIOR_CUSHIONS = [];
const SIDE_SPECS = [
  { side: 'south', label: '남측', facingYaw: Math.PI },
  { side: 'north', label: '북측', facingYaw: 0 },
  { side: 'west', label: '서측', facingYaw: -Math.PI * 0.5 },
  { side: 'east', label: '동측', facingYaw: Math.PI * 0.5 }
];
for (const sp of SIDE_SPECS) {
  HALL_ROW_OFFSETS.forEach((rOff, rIdx) => {
    HALL_COL_OFFSETS.forEach((cOff, cIdx) => {
      let x = cOff;
      let z = HALL_CENTER_Z;
      if (sp.side === 'south') {
        x = cOff;
        z = Number((HALL_CENTER_Z - rOff).toFixed(2));
      } else if (sp.side === 'north') {
        x = cOff;
        z = Number((HALL_CENTER_Z + rOff).toFixed(2));
      } else if (sp.side === 'west') {
        x = -rOff;
        z = Number((HALL_CENTER_Z + cOff).toFixed(2));
      } else {
        x = rOff;
        z = Number((HALL_CENTER_Z + cOff).toFixed(2));
      }
      const index = HALL_INTERIOR_CUSHIONS.length;
      HALL_INTERIOR_CUSHIONS.push(
        Object.freeze({
          index,
          x,
          z,
          yaw: sp.facingYaw,
          side: sp.side,
          row: rIdx + 1,
          col: cIdx + 1,
          label: `청풍사 ${sp.label} ${rIdx + 1}열 ${cIdx + 1}번`
        })
      );
    });
  });
}

export const MURYANGSUJEON_CONFIG = {
  hanja: '淸 風 明 月',
  hangul: '청풍명월',
  // 화강암 장대석 기단 경계 (대형 4면 명상 홀 규모로 북측 확장)
  stylobateMinX: -17.0,
  stylobateMaxX: 17.0,
  stylobateMinZ: 5.55,
  stylobateMaxZ: 31.85,
  verandaMinZ: 5.65,
  verandaMaxZ: 31.75,
  verandaY: 0.20,

  // 전면 3개 돌계단(어칸·좌우 협칸) 및 후면 중앙 돌계단
  frontStairXs: [-5.8, 0.0, 5.8],
  stepsStartZ: 3.55,
  stepsEndZ: 5.65,
  rearStepsEndZ: 31.75,
  rearStepsStartZ: 33.55,

  // 정면 5칸 × 측면 6칸 배흘림기둥 및 벽체 좌표
  columnXs: [-14.2, -8.4, -3.2, 3.2, 8.4, 14.2],
  colZ: 7.0,
  rearColZ: 29.8,
  sideColZs: [7.0, 10.8, 14.6, 18.4, 22.2, 26.0, 29.8],
  columnCollisionRadius: 0.78,

  // 법당 외곽 카메라 클리핑 참조 박스 (실제 보행 충돌은 아래 4면 벽체·열린 3칸 문·중앙 수반으로 세분화)
  hallCollisionBox: {
    minX: -14.65,
    maxX: 14.65,
    minZ: 6.62,
    maxZ: 30.2
  },

  // 청풍사 대형 내부 「청풍수경 · 먹빛 차경」 4면 보행 공간 및 4면×2열×5행(40석) 방석 좌표 (SSOT)
  interior: {
    floorY: 0.28,
    thresholdStartZ: 6.35,
    thresholdEndZ: 7.35,
    minX: -13.65,
    maxX: 13.65,
    minZ: 7.05,
    maxZ: 28.95,
    basin: {
      cx: 0.0,
      cz: HALL_CENTER_Z,
      width: 6.4,
      depth: 6.4,
      minX: -3.35,
      maxX: 3.35,
      minZ: HALL_CENTER_Z - 3.35,
      maxZ: HALL_CENTER_Z + 3.35
    },
    screenZ: 29.28,
    innerColumns: [
      [-10.8, 11.2],
      [10.8, 11.2],
      [-10.8, 25.6],
      [10.8, 25.6]
    ],
    cushions: HALL_INTERIOR_CUSHIONS
  },

  stepPortal: {
    thresholdZ: 5.05,
    upperZ: 5.95,
    lowerZ: 3.4,
    rearUpperZ: 31.45,
    rearLowerZ: 33.75
  },

  roof: {
    style: 'muryangsujeon',
    x: 0,
    z: HALL_CENTER_Z,
    baseY: 6.12,
    width: 38.2,
    depth: 29.2,
    ridgeHeight: 7.85,
    ridgeLength: 21.8,
    tileRepeatX: 11,
    tileRepeatZ: 14,
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
  // 3D 방석 메쉬 배치 순서 (총 21석 = 7열 × 3줄: 1줄 계곡 전망 명당 7석 -> 2줄 중간 7석 -> 3줄 뒷줄 7석)
  // 홀수 열(7열)이므로 idx % 2 교차 색상이 가로·세로 모든 방향에서 청·홍 비단 체크무늬를 이룸
  cushionRowLocalZs: [-2.15, 0.0, 2.05],
  cushionColLocalXs: [-12.9, -9.1, -5.3, 0.0, 5.3, 9.1, 12.9],
  cushionLocalCoords: [
    // 1줄: 계곡 전망 명당 7석 (seatIndex 0 ~ 6, world z = -21.65)
    [-12.9, -2.15],
    [-9.1, -2.15],
    [-5.3, -2.15],
    [0.0, -2.15],
    [5.3, -2.15],
    [9.1, -2.15],
    [12.9, -2.15],
    // 2줄: 누각 중간 7석 (seatIndex 7 ~ 13, world z = -19.50)
    [-12.9, 0.0],
    [-9.1, 0.0],
    [-5.3, 0.0],
    [0.0, 0.0],
    [5.3, 0.0],
    [9.1, 0.0],
    [12.9, 0.0],
    // 3줄: 마당 방향 뒷줄 7석 (seatIndex 14 ~ 20, world z = -17.45)
    [-12.9, 2.05],
    [-9.1, 2.05],
    [-5.3, 2.05],
    [0.0, 2.05],
    [5.3, 2.05],
    [9.1, 2.05],
    [12.9, 2.05]
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

/**
 * 동쪽 연화지(蓮花池) · 청풍교(淸風橋) 좌표 단일 원본 (SSOT)
 */
export const YEONHWAJI_CONFIG = {
  cx: 28.5,
  cz: -4.5,
  rx: 6.75,
  rz: 8.35,
  collisionRx: 7.95,
  collisionRz: 9.35,
  waterY: -0.92,
  bedY: -2.05,
  bridge: {
    minX: 20.6,
    maxX: 36.4,
    passMinX: 20.1,
    passMaxX: 36.9,
    minZ: -5.12,
    maxZ: -3.88,
    deckMinZ: -5.75,
    deckMaxZ: -3.25,
    centerZ: -4.5,
    deckWidth: 2.6,
    archPeakLift: 1.15,
    pierXs: [24.5, 32.5]
  }
};

export function getCheongpungBridgeY(x) {
  const { minX, maxX, archPeakLift } = YEONHWAJI_CONFIG.bridge;
  const midX = (minX + maxX) * 0.5;
  const halfSpan = (maxX - minX) * 0.5;
  const t = Math.max(-1, Math.min(1, (x - midX) / halfSpan));
  return -0.78 + Math.cos(t * Math.PI * 0.5) * archPeakLift;
}

/**
 * 서쪽 소원 연등 정원(所願 蓮燈 庭園) · 소원정(所願亭) 좌표 단일 원본 (SSOT)
 */
export const WISH_GARDEN_CONFIG = {
  cx: -28.5,
  cz: -4.5,
  plinthY: -0.52,
  plinthHalfW: 3.6,
  plinthHalfD: 3.6,
  stairExtend: 0.72,
  columnCollisionRadius: 0.42,
  pavilionColumns: [
    [-3.1, -3.1],
    [0.0, -3.1],
    [3.1, -3.1],
    [-3.1, 0.0],
    [3.1, 0.0],
    [-3.1, 3.1],
    [0.0, 3.1],
    [3.1, 3.1]
  ],
  arches: [
    { x: -21.8, z: -4.5, yaw: Math.PI * 0.5 },
    { x: -35.2, z: -4.5, yaw: Math.PI * 0.5 },
    { x: -28.5, z: 1.8, yaw: 0 },
    { x: -28.5, z: -10.8, yaw: 0 }
  ],
  stoneLanterns: [
    { x: -23.4, z: 0.6, r: 0.52 },
    { x: -33.6, z: 0.6, r: 0.52 },
    { x: -23.4, z: -9.6, r: 0.52 },
    { x: -33.6, z: -9.6, r: 0.52 }
  ]
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
    block: { minX: -39.5, maxX: 39.5, minZ: -23.1, maxZ: 36.2 },
    clamp: { minX: -39.0, maxX: 39.0, minZ: -22.9, maxZ: 35.8 },
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
    { x: -19.2, y: -0.82, z: -13.6, height: 9.6, widthScale: 1.28, yaw: 1.8, cluster: true, role: 'maple', collisionRadius: 0.95 },
    { x: 16.0, y: -0.82, z: -5.6, height: 8.6, widthScale: 1.25, yaw: -0.6, cluster: true, role: 'maple', collisionRadius: 1.05 },
    { x: 19.2, y: -0.82, z: -13.6, height: 9.8, widthScale: 1.28, yaw: 2.3, cluster: true, role: 'maple', collisionRadius: 0.95 },
    { x: 20.6, y: -0.82, z: -19.2, height: 9.4, widthScale: 1.26, yaw: 0.9, cluster: true, role: 'maple' },
    { x: -20.6, y: -0.82, z: -19.4, height: 9.6, widthScale: 1.26, yaw: -1.4, cluster: true, role: 'maple' },
    { x: -18.8, y: -0.80, z: 2.2, height: 9.0, widthScale: 1.24, yaw: -0.5, cluster: true, role: 'maple', collisionRadius: 0.95 },
    { x: 18.8, y: -0.78, z: 2.2, height: 9.2, widthScale: 1.25, yaw: 0.7, cluster: true, role: 'maple', collisionRadius: 0.95 },
    { x: -20.8, y: -0.75, z: 5.4, height: 9.4, widthScale: 1.22, yaw: 0.8, cluster: true, role: 'maple' },
    { x: 20.8, y: -0.75, z: 5.4, height: 9.6, widthScale: 1.22, yaw: -1.1, cluster: true, role: 'maple' },

    // 무량수전 좌우·후면 외곽 소나무 및 단풍나무 (확장된 후면 z=31.85 바깥 배치)
    { x: -23.2, y: -0.35, z: 14.8, height: 11.8, yaw: 2.1, role: 'pine' },
    { x: 23.5, y: -0.30, z: 15.2, height: 12.0, yaw: 1.4, role: 'pine' },
    { x: -15.5, y: -0.75, z: 38.6, height: 11.6, yaw: 0.7, cluster: true, role: 'pine' },
    { x: 15.8, y: -0.75, z: 38.8, height: 11.8, yaw: -0.9, cluster: true, role: 'pine' },
    { x: 0.0, y: -0.72, z: 40.4, height: 12.4, yaw: 1.6, cluster: true, role: 'maple' },
    { x: 40.8, y: -0.65, z: -11.2, height: 11.6, yaw: -1.2, role: 'pine' },
    { x: 40.5, y: -0.65, z: 3.4, height: 10.8, yaw: 0.6, cluster: true, role: 'maple' },
    { x: -40.8, y: -0.65, z: -11.2, height: 11.4, yaw: 1.2, role: 'pine' },
    { x: -40.5, y: -0.65, z: 3.4, height: 10.8, yaw: -0.8, cluster: true, role: 'maple' },
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
    { x: 40.4,  y: -0.65, z: -5.2,  scale: 1.32 },
    { x: 35.4,  y: -0.65, z: -16.8, scale: 1.38 },
    { x: 42.5,  y: 0.25,  z: 1.5,   scale: 1.45 },
    { x: -40.4, y: -0.65, z: -5.2,  scale: 1.32 },
    { x: -35.4, y: -0.65, z: -16.8, scale: 1.35 },
    { x: -22.2, y: -0.65, z: -16.2, scale: 1.25 },
    { x: -21.8, y: -1.25, z: -24.5, scale: 1.3 }
  ]
};

export const HALL_CUSHIONS = MURYANGSUJEON_CONFIG.interior.cushions;
export const TOTAL_CUSHION_COUNT =
  ANYANGRU_CONFIG.cushionLocalCoords.length + HALL_CUSHIONS.length;
export const MAX_VISITORS_PER_ROOM = TOTAL_CUSHION_COUNT;

const CUSHION_ROW_NAMES = {
  1: '1줄 · 계곡 전망 명당',
  2: '2줄 · 중간석',
  3: '3줄 · 뒷줄'
};

const CUSHION_COL_NAMES = ['서3', '서2', '서1', '중앙', '동1', '동2', '동3'];

/**
 * 차경루 로컬 방석 좌표(21석)로부터 인덱스 고정 월드 방석 목록 생성
 * - index 0~6  : 1줄(계곡 전망 명당 7석)
 * - index 7~13 : 2줄(중간 7석)
 * - index 14~20: 3줄(뒷줄 7석)
 */
export const ANYANGRU_CUSHIONS = ANYANGRU_CONFIG.cushionLocalCoords.map(([lx, lz], index) => {
  const row = Math.floor(index / 7) + 1;
  const col = (index % 7) + 1;
  const colTag = CUSHION_COL_NAMES[col - 1] || `${col}번`;
  const rowShort = row === 1 ? '1줄 전망석' : row === 2 ? '2줄 중간석' : '3줄 뒷줄석';
  return Object.freeze({
    index,
    row,
    col,
    lx,
    lz,
    x: Number((ANYANGRU_CONFIG.x + lx).toFixed(4)),
    z: Number((ANYANGRU_CONFIG.z + lz).toFixed(4)),
    rowName: CUSHION_ROW_NAMES[row] || `${row}줄`,
    colName: colTag,
    shortLabel: `${row}줄 ${col}번(${colTag})`,
    label: `차경루 ${rowShort} · ${col}번(${colTag})`
  });
});

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
      })),

      // 7. 서쪽 소원 연등 정원(소원정 기둥 8주 · 정원 석등롱 4기 · 등가 아치 기둥)
      ...WISH_GARDEN_CONFIG.pavilionColumns.map(([lx, lz]) => ({
        x: Number((WISH_GARDEN_CONFIG.cx + lx).toFixed(4)),
        z: Number((WISH_GARDEN_CONFIG.cz + lz).toFixed(4)),
        r: WISH_GARDEN_CONFIG.columnCollisionRadius,
        label: 'garden_pillar'
      })),
      ...WISH_GARDEN_CONFIG.stoneLanterns.map((sl) => ({
        x: sl.x,
        z: sl.z,
        r: sl.r,
        label: 'garden_stone_lantern'
      })),
      ...WISH_GARDEN_CONFIG.arches.flatMap((a) => {
        const dx = Math.cos(a.yaw) * 1.45;
        const dz = -Math.sin(a.yaw) * 1.45;
        return [
          { x: Number((a.x - dx).toFixed(3)), z: Number((a.z - dz).toFixed(3)), r: 0.34, label: 'garden_arch' },
          { x: Number((a.x + dx).toFixed(3)), z: Number((a.z + dz).toFixed(3)), r: 0.34, label: 'garden_arch' }
        ];
      }),

      // 8. 동쪽 연화지 호안 벤치·석등 및 서쪽 정원 바위·돌확 수반·벤치 충돌원
      { x: 37.6, z: -8.2, r: 0.62, label: 'east_stone_lantern' },
      { x: 38.2, z: -1.2, r: 1.05, label: 'east_bench' },
      { x: -23.5, z: -7.6, r: 0.98, label: 'west_stone_basin' },
      { x: -23.0, z: -1.8, r: 1.15, label: 'west_boulder' },
      { x: -34.2, z: -7.2, r: 1.25, label: 'west_boulder' },
      { x: -25.5, z: 3.2, r: 1.05, label: 'west_boulder' },
      { x: -34.2, z: 2.2, r: 1.05, label: 'west_bench' },
      { x: -22.8, z: -11.4, r: 1.05, label: 'west_bench' },

      // 9. 청풍사 내부 고주(4주) — 실내 명상 방석(40석)은 Navigation.js에서 동적 회피/착석 예외 처리
      ...MURYANGSUJEON_CONFIG.interior.innerColumns.map(([x, z]) => ({
        x,
        z,
        r: 0.56,
        label: 'hall_inner_pillar'
      }))
    ],
    ponds: [
      {
        cx: YEONHWAJI_CONFIG.cx,
        cz: YEONHWAJI_CONFIG.cz,
        rx: YEONHWAJI_CONFIG.collisionRx,
        rz: YEONHWAJI_CONFIG.collisionRz,
        bridge: {
          minX: YEONHWAJI_CONFIG.bridge.passMinX,
          maxX: YEONHWAJI_CONFIG.bridge.passMaxX,
          minZ: YEONHWAJI_CONFIG.bridge.minZ,
          maxZ: YEONHWAJI_CONFIG.bridge.maxZ
        }
      }
    ],
    boxes: [
      // 청풍사 4면 벽체 (전면 중앙 3칸 문 x∈[-8.35, 8.35] 개방 — 달항아리·거울 수반 둘레 4면 대형 실내 보행 허용)
      { minX: -14.65, maxX: -8.35, minZ: 6.65, maxZ: 7.25 },
      { minX: 8.35, maxX: 14.65, minZ: 6.65, maxZ: 7.25 },
      { minX: -14.65, maxX: -13.65, minZ: 6.65, maxZ: 30.2 },
      { minX: 13.65, maxX: 14.65, minZ: 6.65, maxZ: 30.2 },
      { minX: -14.65, maxX: 14.65, minZ: 28.98, maxZ: 30.2 },
      // 청풍사 내부 중앙 검은 현무암 거울 수반 (4면 둘레 넓은 통로 개방)
      {
        minX: MURYANGSUJEON_CONFIG.interior.basin.minX,
        maxX: MURYANGSUJEON_CONFIG.interior.basin.maxX,
        minZ: MURYANGSUJEON_CONFIG.interior.basin.minZ,
        maxZ: MURYANGSUJEON_CONFIG.interior.basin.maxZ
      },

      // 무량수전 전면 기단 단차 벽 (전면 3개 돌계단 어칸 x∈[-2.1,2.1], 좌협칸 x∈[-7.3,-4.3], 우협칸 x∈[4.3,7.3] 개방)
      { minX: -17.15, maxX: -7.3, minZ: 5.2, maxZ: 5.68 },
      { minX: -4.3, maxX: -2.1, minZ: 3.45, maxZ: 5.68 },
      { minX: 2.1, maxX: 4.3, minZ: 3.45, maxZ: 5.68 },
      { minX: 7.3, maxX: 17.15, minZ: 5.2, maxZ: 5.68 },
      { minX: -7.95, maxX: -7.3, minZ: 3.65, maxZ: 5.68 },
      { minX: 7.3, maxX: 7.95, minZ: 3.65, maxZ: 5.68 },

      // 무량수전 좌·우 기단 단차 경계 (외곽 마당 |x|>17.3 과 기단 상면 회랑 |x|<16.75 분리)
      { minX: -17.25, maxX: -16.75, minZ: 5.2, maxZ: 32.05 },
      { minX: 16.75, maxX: 17.25, minZ: 5.2, maxZ: 32.05 },

      // 무량수전 후면 기단 단차 경계 (후면 중앙 돌계단 x∈[-1.95,1.95] 개방)
      { minX: -17.15, maxX: -1.95, minZ: 31.65, maxZ: 32.15 },
      { minX: 1.95, maxX: 17.15, minZ: 31.65, maxZ: 32.15 },
      { minX: -2.65, maxX: -1.95, minZ: 31.65, maxZ: 33.55 },
      { minX: 1.95, maxX: 2.65, minZ: 31.65, maxZ: 33.55 },

      // 안양루 중앙 돌계단 소매돌 및 전면 기단 단차 벽 (x in [-2.15, 2.15] 계단 개방)
      { minX: -2.85, maxX: -2.15, minZ: -15.65, maxZ: -13.65 },
      { minX: 2.15, maxX: 2.85, minZ: -15.65, maxZ: -13.65 },
      { minX: -20.8, maxX: -2.15, minZ: -15.75, maxZ: -15.15 },
      { minX: 2.15, maxX: 20.8, minZ: -15.75, maxZ: -15.15 },

      // 안양루 좌우 난간 외곽 추락 방지 경계
      { minX: -20.8, maxX: -15.8, minZ: -23.6, maxZ: -15.2 },
      { minX: 15.8, maxX: 20.8, minZ: -23.6, maxZ: -15.2 },

      // 동쪽 청풍교 남·북 난간 충돌 벽 (캐릭터·삿갓 관통 방지 및 양 끝 진입로 유도)
      { minX: 20.3, maxX: 36.7, minZ: -6.25, maxZ: -5.18 },
      { minX: 20.3, maxX: 36.7, minZ: -3.82, maxZ: -2.75 },

      // 동·서쪽 정원/연못 테라스 남·북 경계 (외곽 산자락 진입 차단, 연못 호안 산책로 여유 확보)
      { minX: 20.6, maxX: 40.5, minZ: -23.6, maxZ: -15.4 },
      { minX: 20.6, maxX: 40.5, minZ: 6.8, maxZ: 36.8 },
      { minX: -40.5, maxX: -20.6, minZ: -23.6, maxZ: -15.4 },
      { minX: -40.5, maxX: -20.6, minZ: 6.8, maxZ: 36.8 }
    ]
  }
};

// 차경루 21석 우선순위 정책 SSOT (클라이언트 Navigation & 서버 multiplayerServer 공용)
// 가운데 앞자리(1줄 중앙 -> 좌우 -> 2줄 중앙 -> 좌우 -> 3줄 중앙 -> 좌우) 순차 배정
export const FRONT_CENTER_PRIORITY_CUSHIONS = [...ANYANGRU_CUSHIONS].sort((a, b) => {
  if (a.row !== b.row) return a.row - b.row;
  const distCenterA = Math.abs(a.col - 4);
  const distCenterB = Math.abs(b.col - 4);
  if (distCenterA !== distCenterB) return distCenterA - distCenterB;
  return a.col - b.col;
});

export function getAnyangruCushionByIndex(seatIndex) {
  if (!Number.isInteger(seatIndex) || seatIndex < 0 || seatIndex >= ANYANGRU_CUSHIONS.length) {
    return null;
  }
  return ANYANGRU_CUSHIONS[seatIndex] || null;
}

export function selectPriorityAnyangruCushion(x = 0, z = 0, occupiedSeatIndices = new Set()) {
  const occupied =
    occupiedSeatIndices instanceof Set
      ? occupiedSeatIndices
      : new Set(occupiedSeatIndices || []);

  for (const c of FRONT_CENTER_PRIORITY_CUSHIONS) {
    if (occupied.has(c.index)) continue;
    return {
      cushion: c,
      dist: Math.hypot(x - c.x, z - c.z)
    };
  }

  return {
    cushion: null,
    dist: Infinity
  };
}

export function getHallCushionByIndex(hallSeatIndex) {
  if (!Number.isInteger(hallSeatIndex) || hallSeatIndex < 0 || hallSeatIndex >= HALL_CUSHIONS.length) {
    return null;
  }
  return HALL_CUSHIONS[hallSeatIndex] || null;
}

export function selectNearestHallCushion(x = 0, z = 0, occupiedHallSeatIndices = new Set()) {
  const occupied =
    occupiedHallSeatIndices instanceof Set
      ? occupiedHallSeatIndices
      : new Set(occupiedHallSeatIndices || []);

  let best = null;
  let bestDist = Infinity;
  for (const c of HALL_CUSHIONS) {
    if (occupied.has(c.index)) continue;
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }

  return {
    cushion: best,
    dist: bestDist
  };
}
