/**
 * 애플리케이션 공통 상수, 초기 소원 데이터, 연등 색상 및 산사 나그네 프리셋
 */

export const STORAGE_KEYS = {
  WISHES: 'chakyeong_3d_wishes_v2',
  HAPJANG: 'chakyeong_3d_hapjang_v2',
  WANDERER_PROFILE: 'chakyeong_3d_wanderer_nature_v2'
};

export const SPACE_META = {
  buseoksa: {
    eyebrow: '차경(借景) 3D · 청풍사',
    title: '청풍사와 차경루',
    caption: '광활한 박석 마당과 차경루 처마 너머로 시원하게 펼쳐지는 산맥의 능선과 운해',
    locationBadge: '청풍사 차경루 처마 밑',
    writeDesc: '운해 능선이 내려다보이는 차경루 처마 밑에 3D 연등을 매달아 바람에 소원을 실어 보냅니다.',
    defaultBellMix: 50,
    defaultWaterMix: 50,
    defaultWindMix: 50
  }
};

export const LANTERN_COLORS = {
  amber: { core: '#FFFBEB', mid: '#F59E0B', edge: '#B45309', hex: 0xf59e0b },
  lotus: { core: '#FFF1F2', mid: '#F472B6', edge: '#BE185D', hex: 0xf472b6 },
  jade:  { core: '#ECFDF5', mid: '#34D399', edge: '#047857', hex: 0x34d399 },
  moon:  { core: '#FFFFFF', mid: '#FDE047', edge: '#CA8A04', hex: 0xfde047 }
};

export const INITIAL_WISHES = [
  {
    id: 'bs-1',
    space: 'buseoksa',
    color: 'amber',
    author: '청풍산 나그네',
    tag: '마음 평안',
    text: '청풍사 배흘림기둥에 기대어 바라본 능선처럼, 흔들리는 마음도 묵묵히 제자리를 찾기를 바랍니다.',
    date: '2026.10.29',
    hapjang: 64,
    slot: 0
  },
  {
    id: 'bs-2',
    space: 'buseoksa',
    color: 'lotus',
    author: '가을 순례자',
    tag: '가족 건강',
    text: '부모님의 걸음이 오래도록 가벼우시길, 다가오는 겨울에도 따뜻한 온기가 집안에 머물기를 발원합니다.',
    date: '2026.10.30',
    hapjang: 91,
    slot: 1
  },
  {
    id: 'bs-3',
    space: 'buseoksa',
    color: 'moon',
    author: '새벽별',
    tag: '소망 성취',
    text: '오랜 시간 준비해 온 작은 씨앗이 조급함 없이 단단한 뿌리를 내리고 꽃피울 수 있기를.',
    date: '2026.10.31',
    hapjang: 53,
    slot: 2
  },
  {
    id: 'bs-4',
    space: 'buseoksa',
    color: 'jade',
    author: '청산에 살어리',
    tag: '오늘의 감사',
    text: '처마 끝 풍경 소리에 잠시 멈춰 숨을 고를 수 있는 오늘 하루의 여백에 깊이 감사합니다.',
    date: '2026.11.01',
    hapjang: 78,
    slot: 3
  },
  {
    id: 'bs-5',
    space: 'buseoksa',
    color: 'amber',
    author: '차경루 달빛',
    tag: '인연과 사랑',
    text: '멀리 떨어져 있어도 같은 하늘의 노을을 보며 서로의 안녕을 빌어주는 따뜻한 인연이기를.',
    date: '2026.11.01',
    hapjang: 112,
    slot: 4
  },
  {
    id: 'bs-6',
    space: 'buseoksa',
    color: 'lotus',
    author: '풍경소리',
    tag: '마음 평안',
    text: '이곳을 스쳐 가는 모든 이들의 어두운 밤길에 석등 같은 잔잔한 불빛 하나가 함께하길 합장합니다.',
    date: '2026.11.02',
    hapjang: 85,
    slot: 5
  },
  {
    id: 'bs-7',
    space: 'buseoksa',
    color: 'jade',
    author: '운해 위의 솔',
    tag: '가족 건강',
    text: '어머니의 무릎이 한결 편안해지시고, 아침마다 창가에 비치는 햇살처럼 웃음꽃이 피어나기를 기원합니다.',
    date: '2026.11.03',
    hapjang: 73,
    slot: 6
  },
  {
    id: 'bs-8',
    space: 'buseoksa',
    color: 'moon',
    author: '고운 발걸음',
    tag: '소망 성취',
    text: '새로운 길을 앞두고 두려움보다 설렘을 먼저 품을 수 있는 단단한 용기를 허락해 주소서.',
    date: '2026.11.04',
    hapjang: 59,
    slot: 7
  },
  {
    id: 'bs-9',
    space: 'buseoksa',
    color: 'amber',
    author: '박석길 순례자',
    tag: '오늘의 감사',
    text: '비 온 뒤 더욱 맑아진 산사의 공기처럼, 지나간 아픔도 내일을 비추는 지혜가 되었음에 감사합니다.',
    date: '2026.11.05',
    hapjang: 94,
    slot: 8
  },
  {
    id: 'bs-10',
    space: 'buseoksa',
    color: 'lotus',
    author: '봄을 기다리는 나무',
    tag: '인연과 사랑',
    text: '사랑하는 사람들과 마주 앉아 따뜻한 차 한 잔 나눌 수 있는 평범한 날들이 오래도록 이어지기를.',
    date: '2026.11.06',
    hapjang: 108,
    slot: 9
  },
  {
    id: 'bs-11',
    space: 'buseoksa',
    color: 'jade',
    author: '푸른 대숲',
    tag: '마음 평안',
    text: '바람이 불면 부는 대로 흔들리되 꺾이지 않는 대나무처럼 유연하고 고요한 마음을 배우고 갑니다.',
    date: '2026.11.07',
    hapjang: 67,
    slot: 10
  },
  {
    id: 'bs-12',
    space: 'buseoksa',
    color: 'moon',
    author: '별빛 산책자',
    tag: '소망 성취',
    text: '밤늦도록 불 밝히며 노력하는 모든 청춘들의 책상 위에 따뜻한 위로와 좋은 결실이 찾아오기를.',
    date: '2026.11.08',
    hapjang: 121,
    slot: 11
  },
  {
    id: 'bs-13',
    space: 'buseoksa',
    color: 'amber',
    author: '가을 햇살',
    tag: '가족 건강',
    text: '멀리 타지에 있는 아이가 언제 어디서나 몸 건강히, 좋은 사람들과 함께 밝게 지내기를 발원합니다.',
    date: '2026.11.09',
    hapjang: 82,
    slot: 12
  },
  {
    id: 'bs-14',
    space: 'buseoksa',
    color: 'lotus',
    author: '은은한 다향',
    tag: '오늘의 감사',
    text: '바쁜 일상 속에서도 잠시 하늘과 능선을 올려다볼 수 있는 마음의 창을 갖게 해 주셔서 고맙습니다.',
    date: '2026.11.10',
    hapjang: 61,
    slot: 13
  },
  {
    id: 'bs-15',
    space: 'buseoksa',
    color: 'jade',
    author: '산사의 아침',
    tag: '인연과 사랑',
    text: '서로의 다름을 부드럽게 감싸 안으며 세월이 흐를수록 깊어지는 향기로운 동행이 되기를 소망합니다.',
    date: '2026.11.12',
    hapjang: 76,
    slot: 14
  },
  {
    id: 'bs-16',
    space: 'buseoksa',
    color: 'moon',
    author: '무량한 미소',
    tag: '마음 평안',
    text: '오늘 이 등불을 바라보는 모든 분들의 가슴속에 청풍사의 너른 품 같은 평화가 가득 깃들기를.',
    date: '2026.11.14',
    hapjang: 99,
    slot: 15
  }
];

export const WANDERER_POETIC_NAMES = [
  '따뜻한 햇살',
  '작은 솔잎',
  '느긋한 구름',
  '편안한 나무',
  '고요한 바람',
  '맑은 이슬',
  '포근한 안개',
  '잔잔한 물결',
  '은은한 달빛',
  '푸른 산들바람',
  '보슬한 봄비',
  '고운 노을빛'
];

export const WANDERER_PALETTES = [
  {
    id: 'ink',
    label: '먹빛',
    fullName: '먹빛 산사 도포',
    outerRobe: 0x363d45,
    innerRobe: 0xd8d2c5,
    collar: 0xf2ede2,
    shoes: 0xc9c1b2,
    bambooTint: 0xd4b475,
    orbHex: '#6c7a89',
    markerHex: 0xffd27d
  },
  {
    id: 'crane',
    label: '학창의',
    fullName: '솔빛 학창의 도포',
    outerRobe: 0xdce3dc,
    innerRobe: 0x4f6457,
    collar: 0xf7f4eb,
    shoes: 0xb8c2b9,
    bambooTint: 0xd9bc82,
    orbHex: '#88b397',
    markerHex: 0x98f5c4
  },
  {
    id: 'maple',
    label: '단풍',
    fullName: '치자·단풍 행자복',
    outerRobe: 0xd88835,
    innerRobe: 0x768568,
    collar: 0xf3ead8,
    shoes: 0xd6c8b2,
    bambooTint: 0xcfa968,
    orbHex: '#e69a45',
    markerHex: 0xffc46b
  },
  {
    id: 'mist',
    label: '운해',
    fullName: '운해빛 옥색 도포',
    outerRobe: 0x6f8b96,
    innerRobe: 0xd7dfd9,
    collar: 0xf4f6f2,
    shoes: 0xbac5c8,
    bambooTint: 0xcab07a,
    orbHex: '#7fa8b8',
    markerHex: 0x9be2ff
  }
];

export const WANDERER_SPOTS = {
  buseoksa: [
    {
      id: 'courtyard_steps',
      label: '청풍사 박석길',
      icon: '🎋',
      pos: [0.0, -0.78, 1.5],
      facingYaw: 0.0,
      posture: 'walk'
    },
    {
      id: 'stone_lantern',
      label: '석등 앞 참배석',
      icon: '🕯️',
      pos: [1.6, -0.78, -1.5],
      facingYaw: -0.2,
      posture: 'walk'
    },
    {
      id: 'veranda_center',
      label: '청풍사 툇마루',
      icon: '🍵',
      pos: [0.0, 0.20, 6.0],
      facingYaw: 0.0,
      posture: 'walk'
    },
    {
      id: 'anyangnu_cushion',
      label: '차경루 명상 방석',
      icon: '🧘',
      pos: [0.0, 0.14, -21.65],
      facingYaw: 0.0,
      posture: 'kneel'
    },
    {
      id: 'maple_garden',
      label: '동쪽 단풍 마당',
      icon: '🍁',
      pos: [7.8, -0.78, -7.2],
      facingYaw: -0.3,
      posture: 'walk'
    }
  ]
};

export const FELLOW_WANDERERS_PRESETS = {
  buseoksa: [
    {
      name: '고요한 바람',
      paletteIdx: 1,
      spotIdx: 1,
      offset: [-3.4, 0, -2.2],
      patrolRadius: 2.8,
      seed: 1.4
    },
    {
      name: '작은 솔잎',
      paletteIdx: 2,
      spotIdx: 4,
      offset: [-2.2, 0, 1.8],
      patrolRadius: 2.6,
      seed: 3.8
    }
  ]
};
