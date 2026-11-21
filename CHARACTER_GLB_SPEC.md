# 산사 나그네(풍류 어린 선비) 3D 캐릭터 GLB 제작 스펙

확정 시안: `character-concept-1-wanderer.jpg`  
적용 경로: `assets/monk.glb` (파일 교체만으로 코드 수정 없이 즉시 연동)

---

## 1. 모델링 & 최적화 기준
- **포맷**: `.glb` (glTF 2.0 Binary, Meshopt 압축 권장)
- **권장 폴리곤 수**: **5,000 ~ 12,000 삼각형** (21명 동시접속 시 60fps 유지 기준)
- **목표 파일 크기**: **300 KB ~ 800 KB**
- **텍스처**: 1024×1024 JPG/WebP (Base Color + Roughness + Normal, 부드러운 무광 한복·점토 질감)
- **좌표계 & 스케일**:
  - 정면 방향: **`-Z`** (Y-Up, 오른손 좌표계)
  - 발바닥 기준점: `Y = 0` (전체 신장은 `MonkLoader.js`에서 `1.66m`로 자동 정규화됨)
- **악세서리 참고**:
  - **삿갓(`WandererSatgatHat`)**과 **괴나리봇짐·청자 표주박(`WandererBackBundle`)**은 `src/character/WandererActor.js`에서 `head`·`chest` 본에 자동으로 장착합니다.
  - 따라서 GLB 파일은 **맨머리 + 한복 도포 본체**로 제작하면 기존 4가지 의복 팔레트·삿갓·봇짐 시스템과 100% 호환됩니다.

---

## 2. 필수 뼈대(Skeleton / Bone) 이름 규칙 (`MonkLoader.js` 자동 연동)
아래 17개 본 이름을 그대로 사용하면 보행(`walk`)과 좌선 명상(`kneel`) 애니메이션이 자동으로 작동합니다. (`.` 유무 모두 자동 인식)

```text
hips
├── spine
│   └── chest
│       ├── neck
│       │   └── head          (삿갓 자동 부착 위치)
│       ├── upper_arm.L
│       │   └── forearm.L
│       │       └── hand.L
│       └── upper_arm.R
│           └── forearm.R
│               └── hand.R
├── thigh.L
│   └── shin.L
│       └── foot.L
└── thigh.R
    └── shin.R
        └── foot.R
```

---

## 3. 색상 팔레트 연동용 재질/메쉬 명명 팁 (`WandererActor.js`)
- 겉옷(도포): 이름에 `robe` 또는 `saffron` 포함 시 4종 나그네 색상 팔레트 자동 변경 지원
- 속옷/깃: 이름에 `collar` 또는 `cotton` 포함
- 바지/신발: 이름에 `trousers` / `shoe` 포함
