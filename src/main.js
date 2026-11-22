/**
 * main.js — 산사 View-mung(차경 3D) 애플리케이션 진입점 및 모듈 오케스트레이션
 */

import './engine/CoreRuntime.js';
import { SceneManager } from './engine/SceneManager.js';
import { CameraController } from './engine/CameraController.js';
import { InputRouter } from './engine/InputRouter.js';
import { SurfaceMaterials } from './world/SurfaceMaterials.js';
import { BuseoksaBuilder } from './world/BuseoksaBuilder.js';
import { PropsManager } from './world/PropsManager.js';
import { WandererManager } from './character/WandererManager.js';
import { SanSaAudioEngine } from './audio/SanSaAudioEngine.js';
import { WishStore } from './ui/WishStore.js';
import { HudController } from './ui/HudController.js';
import { MultiplayerClient } from './network/MultiplayerClient.js';

function bootstrapApp() {
  const container = document.getElementById('webgl-container');
  if (!container) return;

  // 1. 코어 3D 씬 매니저 및 카메라 컨트롤러 초기화
  const sceneManager = new SceneManager(container);
  const cameraController = new CameraController(sceneManager);

  // 2. PBR 재질·텍스처 및 부석사 건축물/조경 월드 생성
  const materials = new SurfaceMaterials(sceneManager.windUniform);
  const buseoksaBuilder = new BuseoksaBuilder(sceneManager, materials);
  const buseoksaGroundMat = buseoksaBuilder.build();

  sceneManager.loadEnvironmentPanorama('assets/environment/woodland.jpg?v=20261121-pbr2');
  materials.upgradeWithSurfaceManager(sceneManager, buseoksaGroundMat);

  // 3. 인터랙티브 오브젝트(풍경종·연등·차경루 21석 방석·낙엽·파티클) 매니저 초기화
  const propsManager = new PropsManager(sceneManager, materials);

  // 4. 사운드스케이프 오디오 엔진, 소원 저장소 및 HUD 컨트롤러 초기화
  const audioEngine = new SanSaAudioEngine({
    onBellStrike: () => propsManager.exciteWindBell()
  });
  const wishStore = new WishStore();
  const hudController = new HudController({
    wishStore,
    propsManager,
    cameraController,
    audioEngine
  });

  // 5. 플레이어 산사 나그네 및 원격 동시접속자(방당 최대 21명) 매니저 초기화
  const wandererManager = new WandererManager(sceneManager, cameraController, {
    onToast: (msg) => hudController.showToast(msg),
    onPostureChange: (isMeditating) => hudController.updatePostureButton(isMeditating),
    onBreathingToggle: (active) => hudController.toggleBreathingGuide(active)
  });

  propsManager.registerCushionTargets(
    buseoksaBuilder.cushionInteractiveEntries,
    (seatIdx) => wandererManager.getSeatInfo(seatIdx)
  );
  propsManager.registerIndoorCushionTargets(
    buseoksaBuilder.getIndoorCushionEntries(),
    (hallSeatIdx) => wandererManager.getIndoorSeatInfo(hallSeatIdx)
  );
  propsManager.registerGardenLanternTargets(buseoksaBuilder.getGardenLanternTargets());
  hudController.bindWandererActions(wandererManager);

  // 5-1. 21인 정원제 산방(채널) 실시간 멀티플레이어 클라이언트 연결
  const multiplayerClient = new MultiplayerClient({
    onAssignedProfile: (profilePatch) => {
      wandererManager.applyAssignedProfile(profilePatch);
    },
    onRoomUpdate: (roomInfo) => {
      hudController.updateRoomStatusUI(roomInfo);
    },
    onPeerJoined: (peer) => {
      wandererManager.upsertRemotePlayer(peer);
    },
    onPeerUpdated: (peer) => {
      wandererManager.upsertRemotePlayer(peer);
    },
    onPeerLeft: (peerId) => {
      wandererManager.removeRemotePlayer(peerId);
    },
    onPeerAction: (peerId, actionType, payload) => {
      if (actionType === 'bell') {
        hudController.triggerBellRingInteraction({ fromRemote: true });
        return;
      }
      wandererManager.handleRemoteAction(peerId, actionType, payload);
    },
    onWishesSync: (remoteWishes) => {
      hudController.handleRemoteWishesSync(remoteWishes);
    },
    onRemoteWishAdded: (wish) => {
      hudController.handleRemoteWishAdded(wish);
    },
    onRemoteWishHapjang: (wishId, hapjang) => {
      hudController.handleRemoteWishHapjang(wishId, hapjang);
    }
  });

  wandererManager.setMultiplayerClient(multiplayerClient);
  hudController.setMultiplayerClient(multiplayerClient);
  multiplayerClient.connect(wandererManager.getInitialNetworkProfile());

  // 6. 뷰포트 포인터·키보드·드래그앤드롭 단일 입력 라우터 연결
  const tooltipEl = document.getElementById('lantern-3d-tooltip');
  const inputRouter = new InputRouter({
    canvas: sceneManager.renderer.domElement,
    cameraController,
    callbacks: {
      onHover: (clientX, clientY) => {
        propsManager.updateHoverTooltip(clientX, clientY, tooltipEl);
      },
      onCanvasTap: (clientX, clientY) => {
        wandererManager.spawnScreenTapRipple(clientX, clientY);

        const target = propsManager.pickInteractiveTarget(clientX, clientY);
        if (target) {
          if (target.type === 'windbell') {
            hudController.triggerBellRingInteraction();
            return;
          }
          if (target.type === 'lantern' && target.wishId) {
            hudController.openWishReader(target.wishId);
            return;
          }
          if (target.type === 'cushion' && Number.isInteger(target.seatIndex)) {
            tooltipEl?.classList.remove('visible');
            if (hudController.hasActiveWish()) {
              hudController.closeWishReader();
            }
            wandererManager.sitAtSpecificSeat(target.seatIndex);
            return;
          }
          if (target.type === 'hallCushion' && Number.isInteger(target.hallSeatIndex)) {
            tooltipEl?.classList.remove('visible');
            if (hudController.hasActiveWish()) {
              hudController.closeWishReader();
            }
            wandererManager.sitAtHallCushion(target.hallSeatIndex);
            return;
          }
        }

        if (hudController.hasActiveWish()) {
          hudController.closeWishReader();
          return;
        }

        wandererManager.handleGroundClick(clientX, clientY);
      },
      onMoveKey: (key, pressed) => wandererManager.setMoveKey(key, pressed),
      onGreet: () => wandererManager.triggerGreeting(),
      onTogglePosture: () => wandererManager.togglePosture(),
      onCyclePalette: () => wandererManager.cyclePalette(),
      onEscape: () => hudController.handleEscape(),
      canToggleZen: () => !hudController.isWriteModalOpen(),
      onToggleZen: () => hudController.toggleZenMode(),
      onDropCustomPhoto: (url) => {
        sceneManager.applyCustomPanorama(url);
        hudController.showToast('📷 직접 찍으신 실사 사진이 3D 원경 배경에 적용되었습니다!');
      }
    }
  });

  // 7. 단일 통합 렌더 루프 파이프라인 등록 및 시작
  sceneManager.onBeforeRender((elapsed, dt) => {
    wandererManager.updateFrame(elapsed, dt);
    cameraController.update(elapsed, dt);
    buseoksaBuilder.update(elapsed, dt);
    propsManager.update(elapsed, dt);
  });

  sceneManager.onAfterRender(() => {
    wandererManager.updateVisitorLabels();
  });

  sceneManager.startLoop();

  window.wandererManager = wandererManager;
  window.sansaApp = {
    sceneManager,
    cameraController,
    buseoksaBuilder,
    propsManager,
    wandererManager,
    hudController,
    audioEngine,
    multiplayerClient,
    inputRouter
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
