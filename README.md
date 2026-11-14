# 🏮 산사 View-mung — 청풍사(淸風寺) · 차경루(借景樓) 3D 힐링 웹

한국 전통 산사 건축의 미학인 **차경(借景, 자연 풍경을 건축의 창과 기둥을 통해 빌려와 감상하는 기법)**을 테마로 구현한 실시간 3D WebGL 힐링 웹 애플리케이션입니다.
별도의 번들러나 빌드 단계 없이 브라우저 네이티브 ES Modules(`<script type="module" src="src/main.js">`)로 즉시 실행됩니다.

---

## 🏗️ 파일 및 모듈 아키텍처 (ES Modules)

단일 책임 원칙(SRP)과 공간 좌표 단일 원본(SSOT) 기반의 **17개 독립 ES 모듈**로 구성되어 있어, 특정 기능 수정 시 다른 영역에 부작용이 전파되지 않습니다.

| 경로 | 단일 책임 및 수정 대상 가이드 |
| :--- | :--- |
| `index.html` | `#webgl-container` 3D 뷰포트, 상단 음향 컨트롤, 소원 연등 열람/작성 모달, 하단 3버튼 독(`합장하기` · `명상하기` · `소원연등달기`), `src/main.js` 로드 |
| `styles.css` | 다크 옵시디언 글래스모피즘 HUD, 한지 소원 카드, 삿갓 상단 닉네임 라벨(`.visitor-labels`), 풍경멍 모드(`body.zen-mode`), 모바일 반응형 레이아웃 |
| `sansa-core.js` | Three.js `r180` 코어 + 실사 PBR 7종 표면 재질 매니저(`createSurfaceManager`) + 리깅 액터(`createMonk`) 런타임 번들 |
| `src/main.js` | 애플리케이션 부트스트랩, 모듈 의존성 주입 및 단일 통합 렌더 루프 연결 |
| `src/config/constants.js` | `localStorage` 키, 연등 한지 4색 팔레트, 초기 16개 소원 데이터, 산사 나그네 시적 닉네임·전통 도포 팔레트·스폰 지점 상수 |
| `src/config/worldConfig.js` | **[단일 원본 SSOT]** 청풍사 본전·차경루·석등·마당·바위·수목 좌표 및 크기 정의 → 좌선 방석(14석)과 원형·사각 충돌체 자동 파생 |
| `src/engine/SceneManager.js` | `WebGLRenderer`, `Scene`, 조명 리그, 360° 산림 파노라마, 리사이즈, 모바일 발열 제어(~38 FPS 제한) 및 단일 `requestAnimationFrame` 루프 |
| `src/engine/CameraController.js` | 3인칭 나그네 추적 카메라(`follow` 모드)와 소원 연등 클로즈업 카메라(`lanternFocus` 모드) 단일 상태 머신 |
| `src/engine/InputRouter.js` | 캔버스 포인터 드래그/핀치 줌/탭/호버, 휠 줌, 키보드 단축키(`WASD`, 방향키, `B`/`G`, `C`, `P`, `Space`, `Esc`), 사용자 실사 사진 드래그앤드롭 단일 라우터 |
| `src/world/TextureFactory.js` | 전통 목조 현판(`淸風寺`, `借景樓`), 암키와·수키와 컬러/범프맵, 단풍잎, 원경 산맥 합성 배경, 한지 연등, 운해 구름 등 절차적 Canvas 2D 텍스처 생성 |
| `src/world/SurfaceMaterials.js` | PBR 건축 재질, 버텍스 톤 페인팅, 수목 바람 흔들림 GLSL 셰이더, `createSurfaceManager` UV 자동 투영 및 지평선 블렌딩 |
| `src/world/PaljakRoofBuilder.js` | 청풍사 본전·차경루 전통 팔작지붕(용마루·내림마루·추녀마루·합각벽·곡선 기와골) 전용 파라메트릭 3D 지오메트리 빌더 |
| `src/world/BuseoksaBuilder.js` | 청풍사 본전(배흘림기둥·4면 회랑·현판·내진 불단), 차경루 누각·좌선 방석, 석등, 박석길 마당, 산맥 원경과 실시간 운해, 소나무·단풍 수목 배치 |
| `src/world/PropsManager.js` | 처마 끝 3D 청동 풍경종(물고기 풍경편·음파 파동), 차경루 처마 3D 소원 연등, 가을 단풍 낙엽 파티클(`InstancedMesh`), 합장 불티 파티클 및 Raycaster 피킹 |
| `src/character/WandererActor.js` | 대나무 삿갓(죽립), 괴나리봇짐·청자 표주박, 발밑 오라, 보폭 보정, 전통 도포 염색 및 카메라 빌보드 말풍선 메쉬 생성 |
| `src/character/Navigation.js` | 지형 높이 보간(`getGroundHeightAt`), 원형·사각 충돌 해소(`clampWalkableXZ`), 2D 그리드 A* 길찾기 및 본전·차경루 돌계단 자동 경유(`buildWalkPath`) |
| `src/character/WandererManager.js` | 플레이어 산사 나그네 및 동료 NPC 스폰/패트롤, 바닥 클릭 이동, 합장 인사(`B`), 차경루 앞줄 방석 좌선 명상(`C`), 도포 환복(`P`), 삿갓 위 닉네임 투영 |
| `src/audio/SanSaAudioEngine.js` | `templebell.wav` 풍경종(50% 재생 후 페이드아웃·60초 주기 자동 타종), 계곡 여울 물소리, 능선 산바람, 산새 지저귐 실시간 Web Audio 합성 |
| `src/ui/WishStore.js` | 소원 연등 목록 및 합장 기록 `localStorage` 영속화 |
| `src/ui/HudController.js` | 상단 스피커/설정 아이콘 바, 한지 소원 읽기/작성 모달, 하단 3버튼 독, 호흡 명상 가이드(2회 사이클), 풍경멍 모드, 토스트 배너 제어 |

---

## 💡 기능별 안전한 수정 위치 안내

- **건물·기둥·석등·나무·방석 위치 변경**: `src/config/worldConfig.js` 한 곳만 수정하면 3D 메쉬와 충돌·길찾기가 동시에 반영됩니다.
- **현판 문구·기와·원경 텍스처 수정**: `src/world/TextureFactory.js` 및 `src/config/worldConfig.js`를 수정합니다.
- **카메라 거리·각도·줌 감도 조정**: `src/engine/CameraController.js`만 수정합니다.
- **UI 버튼·모달·문구·풍경멍 모드 수정**: `index.html`, `styles.css`, `src/ui/HudController.js`만 수정합니다.
- **종소리·물소리·바람·산새 음향 조정**: `src/audio/SanSaAudioEngine.js`만 수정합니다.
- **나그네 이동 속도·삿갓 외형·명상 동작 수정**: `src/character/WandererManager.js` 또는 `src/character/WandererActor.js`만 수정합니다.

---

## 💻 로컬 실행 및 새 Git 리포지토리 연결 방법

### 1. 로컬 개발 서버 실행
```bash
npm run dev
```
- `http://localhost:8080`에서 캐시 비활성화(`-c-1`) 상태로 즉시 실행됩니다.

### 2. 새 GitHub 리포지토리 연결 및 최초 배포
GitHub에서 새 리포지토리(비공개 Private 권장)를 생성한 뒤 아래 명령어로 원격 저장소를 연결하고 푸시합니다:
```bash
git remote add origin https://github.com/<계정명>/<새-리포지토리명>.git
git push -u origin main
```
- 이후 Vercel 대시보드에서 새 리포지토리를 연결하면 `git push`만으로 자동 배포됩니다.
