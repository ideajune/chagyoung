/**
 * SceneManager — Three.js WebGLRenderer, Scene, 조명 리그, 환경 파노라마 및 단일 통합 렌더 루프 관리
 */

const C_ENGINE = window.SANSA_CORE;
const THREE_PCF_SHADOW_MAP = 1;

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;
    this.isMobile = this.width < 768;

    this.windUniform = { value: 0 };
    this.horizonUpdaters = [];
    this.woodlandPanorama = null;

    this.beforeRenderCallbacks = [];
    this.afterRenderCallbacks = [];
    this.resizeCallbacks = [];

    this.lastFrameTime = performance.now();
    this.lastRenderTime = 0;
    this.isPageHidden = document.hidden || false;

    this.initRendererAndScene();
    this.bindLifecycleEvents();
  }

  getBaseFov(aspect = this.width / Math.max(1, this.height)) {
    return aspect < 0.65 ? 64 : aspect < 0.85 ? 58 : 48;
  }

  initRendererAndScene() {
    this.scene = new C_ENGINE.Scene();
    this.scene.fog = new C_ENGINE.Fog(0xd7e4df, 62, 255);

    const aspect = this.width / Math.max(1, this.height);
    const baseFov = this.getBaseFov(aspect);
    this.camera = new C_ENGINE.PerspectiveCamera(baseFov, aspect, 0.15, 520);

    // 모바일 발열 및 배터리 최적화:
    // - 고해상도 모바일 화면에서 MSAA 비활성화, 픽셀비 1.25 제한, 경량 그림자 맵(1024px) 적용
    this.renderer = new C_ENGINE.WebGLRenderer({
      antialias: !this.isMobile,
      powerPreference: this.isMobile ? 'default' : 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.25 : 2));
    this.renderer.outputColorSpace = C_ENGINE.SRGBColorSpace;
    this.renderer.toneMapping = C_ENGINE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.isMobile
      ? THREE_PCF_SHADOW_MAP
      : C_ENGINE.PCFSoftShadowMap;
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    // 은은한 PBR 환경 반사 (RoomEnvironment + PMREMGenerator)
    try {
      const pmrem = new C_ENGINE.PMREMGenerator(this.renderer);
      const roomEnv = new C_ENGINE.RoomEnvironment();
      this.envRT = pmrem.fromScene(roomEnv, 0.04);
      this.scene.environment = this.envRT.texture;
      this.scene.environmentIntensity = 0.25;
      roomEnv.dispose?.();
      pmrem.dispose();
    } catch {
      // PMREM 미지원 환경 폴백
    }

    // 청명한 아침·낮 산사 조명 리그
    this.hemiLight = new C_ENGINE.HemisphereLight(0xeaf4f0, 0x6b6859, 0.94);
    this.hemiLight.position.set(0, 40, 0);
    this.scene.add(this.hemiLight);

    this.ambientLight = new C_ENGINE.AmbientLight(0xfff5e6, 0.34);
    this.scene.add(this.ambientLight);

    this.sunLight = new C_ENGINE.DirectionalLight(0xfff0d8, 2.45);
    this.sunLight.position.set(-28, 34, -26);
    this.sunLight.castShadow = true;
    const shadowRes = this.isMobile ? 1024 : 2048;
    this.sunLight.shadow.mapSize.set(shadowRes, shadowRes);
    this.sunLight.shadow.camera.near = 4;
    this.sunLight.shadow.camera.far = 140;
    this.sunLight.shadow.camera.left = -42;
    this.sunLight.shadow.camera.right = 42;
    this.sunLight.shadow.camera.top = 42;
    this.sunLight.shadow.camera.bottom = -42;
    this.sunLight.shadow.bias = -0.00035;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // 처마 밑 따뜻한 보조광
    this.eaveFillLight = new C_ENGINE.PointLight(0xffb86b, 1.15, 32, 1.5);
    this.eaveFillLight.position.set(0, 4.2, -16.5);
    this.scene.add(this.eaveFillLight);

    this.buseoksaGroup = new C_ENGINE.Group();
    this.lanternsRoot = new C_ENGINE.Group();
    this.fxRoot = new C_ENGINE.Group();

    this.scene.add(this.buseoksaGroup);
    this.scene.add(this.lanternsRoot);
    this.scene.add(this.fxRoot);
  }

  loadEnvironmentPanorama(defaultUrl = 'assets/environment/woodland.jpg') {
    const texLoader = new C_ENGINE.TextureLoader();

    const applyPanoramaTexture = (url, blurriness) => {
      texLoader.load(url, (tex) => {
        tex.colorSpace = C_ENGINE.SRGBColorSpace;
        tex.mapping = C_ENGINE.EquirectangularReflectionMapping;
        this.woodlandPanorama = tex;
        this.scene.background = tex;
        this.scene.backgroundBlurriness = blurriness;
        this.scene.backgroundIntensity = 0.88;
        this.horizonUpdaters.forEach((fn) => fn());
      });
    };

    applyPanoramaTexture(defaultUrl, 0.014);

    // 사용자 실사 사진 드래그 앤 드롭 교체 훅 유지
    window.applyCustomBuseoksaPhoto = (imageUrl) => {
      applyPanoramaTexture(imageUrl, 0.004);
    };
  }

  registerHorizonUpdater(updaterFn) {
    if (typeof updaterFn === 'function') {
      this.horizonUpdaters.push(updaterFn);
    }
  }

  onBeforeRender(callback) {
    this.beforeRenderCallbacks.push(callback);
  }

  onAfterRender(callback) {
    this.afterRenderCallbacks.push(callback);
  }

  onResizeCallback(callback) {
    this.resizeCallbacks.push(callback);
  }

  bindLifecycleEvents() {
    const handleResize = () => this.handleResize();
    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(handleResize);
      this.resizeObserver.observe(this.container);
    }

    document.addEventListener('visibilitychange', () => {
      this.isPageHidden = document.hidden;
      if (!this.isPageHidden) {
        this.lastFrameTime = performance.now();
      }
    });
  }

  handleResize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    this.isMobile = this.width < 768;

    const aspect = this.width / Math.max(1, this.height);
    this.camera.aspect = aspect;
    this.camera.fov = this.getBaseFov(aspect);
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.25 : 2));
    this.renderer.setSize(this.width, this.height);

    for (const cb of this.resizeCallbacks) {
      cb(this.width, this.height, aspect);
    }
  }

  startLoop() {
    const tick = () => {
      requestAnimationFrame(tick);

      if (this.isPageHidden) {
        this.lastFrameTime = performance.now();
        return;
      }

      const now = performance.now();
      // 모바일 발열 방지를 위해 약 38 FPS(26ms 간격)로 제한
      if (this.isMobile && now - this.lastRenderTime < 26) {
        return;
      }
      this.lastRenderTime = now;

      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) * 0.001));
      this.lastFrameTime = now;
      const elapsed = now * 0.001;
      this.windUniform.value = elapsed;

      for (const cb of this.beforeRenderCallbacks) {
        cb(elapsed, dt);
      }

      this.renderer.render(this.scene, this.camera);

      for (const cb of this.afterRenderCallbacks) {
        cb(elapsed, dt);
      }
    };

    tick();
  }
}
